// ShowJob — Headless Browser Enrichment for Adzuna Jobs
// Installs puppeteer, opens a real browser, follows Adzuna redirects,
// scrapes full descriptions from employer sites.
//
// Usage: 
//   npm install puppeteer --save-dev
//   node scripts/enrich-puppeteer.mjs
//   node scripts/enrich-puppeteer.mjs --offset=500    (resume from job 500)
//   node scripts/enrich-puppeteer.mjs --limit=100     (only do 100 jobs)
//   node scripts/enrich-puppeteer.mjs --tabs=5        (5 parallel tabs)

import { createClient } from '@supabase/supabase-js'
import puppeteer from 'puppeteer'

const SUPABASE_URL = 'https://fovjkyqimtafpzdwtatp.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvdmpreXFpbXRhZnB6ZHd0YXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzQ5OTUsImV4cCI6MjA5MTQxMDk5NX0.qG50PxCyWTL9gyb8jlqjJsKQ6gJGULbOizqxezQTais'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const sleep = ms => new Promise(r => setTimeout(r, ms))

// Parse CLI args
const args = process.argv.slice(2)
const getArg = (name, def) => {
  const a = args.find(a => a.startsWith(`--${name}=`))
  return a ? parseInt(a.split('=')[1]) : def
}
const OFFSET = getArg('offset', 0)
const LIMIT = getArg('limit', 99999)
const TABS = getArg('tabs', 3)

// ===== Get all short-description Adzuna jobs =====
async function getJobsToEnrich() {
  console.log('\n📋 Fetching jobs with short descriptions...\n')
  let allJobs = []
  let offset = 0

  while (true) {
    const { data: batch } = await supabase
      .from('jobs')
      .select('id, title, description, source_url, companies(name)')
      .eq('active', true)
      .range(offset, offset + 499)

    if (!batch || batch.length === 0) break

    const short = batch.filter(j => {
      const len = (j.description || '').replace(/<[^>]*>/g, '').length
      return len < 1000 && j.source_url && j.source_url.startsWith('http')
    })

    allJobs = allJobs.concat(short)
    offset += 500
    if (batch.length < 500) break
  }

  // Apply offset and limit
  allJobs = allJobs.slice(OFFSET, OFFSET + LIMIT)
  console.log(`  Found ${allJobs.length} jobs to enrich (offset=${OFFSET}, limit=${LIMIT})\n`)
  return allJobs
}

// ===== Extract description from a loaded page =====
async function extractDescription(page) {
  return await page.evaluate(() => {
    // Strategy 1: JSON-LD JobPosting schema
    const scripts = document.querySelectorAll('script[type="application/ld+json"]')
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent)
        const items = Array.isArray(data) ? data : [data]
        for (const item of items) {
          if (item['@type'] === 'JobPosting' && item.description) return item.description
          if (item['@graph']) {
            for (const g of item['@graph']) {
              if (g['@type'] === 'JobPosting' && g.description) return g.description
            }
          }
        }
      } catch (e) {}
    }

    // Strategy 2: Common job description selectors
    const selectors = [
      '[itemprop="description"]',
      '.job-description', '.job-detail', '.vacancy-description',
      '#job-description', '#job-detail', '#jobDescription',
      '.job_description', '.role-description', '.posting-description',
      '.description-text', '.job-content', '.job__body', '.vacancy-text',
      '.adp-body', '.job-overview', '.job-details__description',
      '.job-detail-description', '.job-posting-description',
      '[data-testid="job-description"]', '[data-qa="job-description"]',
      '.section-content', '.job-desc', '.jobDescription',
      '.posting-page', '.content-body',
      // Reed
      '.description', '.job-description-container',
      // Indeed
      '#jobDescriptionText', '.jobsearch-jobDescriptionText',
      // Totaljobs
      '.job-description', '.vacancy-description',
      // CV Library
      '.job-description', '.job-detail-content',
      // LinkedIn
      '.description__text',
    ]

    for (const sel of selectors) {
      const el = document.querySelector(sel)
      if (el) {
        const html = el.innerHTML
        const text = el.innerText
        if (text.length > 300) return html
      }
    }

    // Strategy 3: Find largest content block with job keywords
    const allBlocks = document.querySelectorAll('div, section, article, main')
    let best = null
    let bestScore = 0

    for (const block of allBlocks) {
      const text = block.innerText || ''
      if (text.length < 400 || text.length > 20000) continue

      const keywords = (text.match(/\b(responsibilities|qualifications|requirements|experience|skills|salary|benefits|apply|duties|essential|desirable|candidate|working)\b/gi) || []).length
      // Penalise blocks that contain navigation, forms, etc
      const hasNav = block.querySelector('nav, form, header, footer')
      const score = keywords * (hasNav ? 0.3 : 1)

      if (score > bestScore) {
        bestScore = score
        best = block
      }
    }

    if (best && bestScore >= 3) {
      return best.innerHTML
    }

    return null
  })
}

// ===== Process a single job =====
async function processJob(browser, job, stats) {
  let page
  try {
    page = await browser.newPage()
    
    // Block images, CSS, fonts to speed things up
    await page.setRequestInterception(true)
    page.on('request', req => {
      const type = req.resourceType()
      if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
        req.abort()
      } else {
        req.continue()
      }
    })

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    await page.setViewport({ width: 1280, height: 800 })

    // Navigate — follow redirects, wait for content
    await page.goto(job.source_url, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    })

    // Wait a bit for any JS rendering
    await sleep(1500)

    // Extract description
    const desc = await extractDescription(page)

    if (desc) {
      const currentLen = (job.description || '').replace(/<[^>]*>/g, '').length
      const newLen = desc.replace(/<[^>]*>/g, '').length

      if (newLen > currentLen && newLen > 200) {
        // Clean up the HTML before saving
        const cleanDesc = desc
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<img[^>]*>/gi, '')
          .replace(/\s(class|style|id|data-[a-z-]+)="[^"]*"/gi, '')
          .substring(0, 15000)

        await supabase.from('jobs').update({
          description: cleanDesc,
        }).eq('id', job.id)

        stats.enriched++
        const finalUrl = page.url()
        const domain = new URL(finalUrl).hostname.replace('www.', '')
        console.log(`  ✓ ${job.companies?.name}: ${job.title} (${currentLen}→${newLen} chars) [${domain}]`)
      } else {
        stats.noImprovement++
      }
    } else {
      stats.noContent++
    }
  } catch (e) {
    stats.failed++
    if (e.message?.includes('timeout') || e.message?.includes('Timeout')) {
      stats.timeouts++
    }
  } finally {
    if (page) {
      try { await page.close() } catch (e) {}
    }
  }
}

// ===== Process jobs in parallel batches =====
async function processInBatches(browser, jobs) {
  const stats = { enriched: 0, failed: 0, noContent: 0, noImprovement: 0, timeouts: 0 }
  const total = jobs.length

  for (let i = 0; i < total; i += TABS) {
    const batch = jobs.slice(i, i + TABS)
    
    // Process batch in parallel
    await Promise.all(batch.map(job => processJob(browser, job, stats)))

    // Progress report every 10 batches
    const processed = Math.min(i + TABS, total)
    if (processed % (TABS * 10) === 0 || processed === total) {
      console.log(`\n  📊 Progress: ${processed}/${total} | ✓${stats.enriched} enriched | ✗${stats.failed} failed | ⏱${stats.timeouts} timeouts | ·${stats.noContent} no content\n`)
    }
  }

  return stats
}

// ===== MAIN =====
async function main() {
  console.log('═'.repeat(60))
  console.log('  ShowJob — Headless Browser Enrichment')
  console.log('═'.repeat(60))

  const jobs = await getJobsToEnrich()
  if (jobs.length === 0) {
    console.log('  No jobs to enrich!')
    return
  }

  console.log(`  Launching browser with ${TABS} parallel tabs...\n`)

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-default-apps',
      '--no-first-run',
    ],
  })

  const t0 = Date.now()
  const stats = await processInBatches(browser, jobs)
  const elapsed = Math.round((Date.now() - t0) / 1000)

  await browser.close()

  console.log('═'.repeat(60))
  console.log(`\n  ✅ Done in ${elapsed}s (${Math.round(elapsed/60)}min)`)
  console.log(`     ✓ ${stats.enriched} enriched`)
  console.log(`     ✗ ${stats.failed} failed`)
  console.log(`     ⏱ ${stats.timeouts} timeouts`)
  console.log(`     · ${stats.noContent} no extractable content`)
  console.log(`     · ${stats.noImprovement} already had better description`)
  console.log(`\n  ${jobs.length - stats.enriched - stats.failed - stats.noContent - stats.noImprovement} other\n`)
  console.log('═'.repeat(60))

  // Estimate
  const rate = stats.enriched / jobs.length
  console.log(`\n  Enrichment rate: ${Math.round(rate * 100)}%`)
  if (LIMIT < 99999) {
    const remaining = 9800 - LIMIT
    console.log(`  Estimated remaining: ~${remaining} jobs`)
    console.log(`  Run again with: node scripts/enrich-puppeteer.mjs --offset=${OFFSET + LIMIT}`)
  }
}

main().catch(e => {
  console.error('Fatal error:', e.message)
  process.exit(1)
})
