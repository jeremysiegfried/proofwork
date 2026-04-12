// Re-enrich job descriptions using stealth browser
// Bypasses Adzuna bot detection with puppeteer-extra stealth plugin
//
// Install first: npm install puppeteer-extra puppeteer-extra-plugin-stealth
// Run: node scripts/enrich-descriptions.mjs [--offset 0] [--limit 200] [--delay 10]

import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { createClient } from '@supabase/supabase-js'

puppeteer.use(StealthPlugin())

const SUPABASE_URL = 'https://fovjkyqimtafpzdwtatp.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvdmpreXFpbXRhZnB6ZHd0YXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzQ5OTUsImV4cCI6MjA5MTQxMDk5NX0.qG50PxCyWTL9gyb8jlqjJsKQ6gJGULbOizqxezQTais'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

var args = process.argv.slice(2)
var OFFSET = 0
var LIMIT = 200
var DELAY = 10 // seconds between requests

for (var i = 0; i < args.length; i++) {
  if (args[i] === '--offset' && args[i+1]) OFFSET = parseInt(args[i+1])
  if (args[i] === '--limit' && args[i+1]) LIMIT = parseInt(args[i+1])
  if (args[i] === '--delay' && args[i+1]) DELAY = parseInt(args[i+1])
}

function randomDelay(base) {
  // Random delay between base and base*2 seconds
  return base * 1000 + Math.random() * base * 1000
}

function extractText(page) {
  return page.evaluate(function() {
    // Try common job description selectors
    var selectors = [
      // Common ATS selectors
      '[class*="job-description"]',
      '[class*="jobDescription"]',
      '[class*="job_description"]',
      '[class*="job-details"]',
      '[class*="jobDetails"]',
      '[class*="posting-description"]',
      '[class*="description-content"]',
      '[class*="vacancy-description"]',
      '[class*="role-description"]',
      '[id*="job-description"]',
      '[id*="jobDescription"]',
      // Greenhouse
      '#content .section-wrapper',
      '.content .page-centered',
      // Lever
      '.posting-page .content',
      '.section-wrapper',
      // Workday
      '[data-automation-id="jobPostingDescription"]',
      // General
      'article',
      '.job-post-content',
      '.job-content',
      '.posting-content',
      '.careers-detail',
      'main .content',
      '.entry-content',
      // Last resort - get the biggest text block
    ]

    for (var i = 0; i < selectors.length; i++) {
      var el = document.querySelector(selectors[i])
      if (el && el.innerHTML.length > 500) {
        return el.innerHTML
      }
    }

    // Fallback: find the largest text-heavy element
    var all = document.querySelectorAll('div, section, article')
    var best = null
    var bestLen = 0
    for (var j = 0; j < all.length; j++) {
      var text = all[j].innerText || ''
      var html = all[j].innerHTML || ''
      // Skip navigation, headers, footers
      var tag = (all[j].className || '').toLowerCase()
      if (/nav|header|footer|menu|sidebar|cookie|banner|popup|modal/i.test(tag)) continue
      if (text.length > bestLen && text.length > 500 && html.length < 50000) {
        bestLen = text.length
        best = html
      }
    }

    return best || document.body.innerText.substring(0, 10000)
  })
}

async function main() {
  console.log('Fetching jobs with short descriptions...\n')

  // Get jobs that need enrichment (description <= 500 chars, from Adzuna)
  var allJobs = []
  var offset = 0
  while (true) {
    var { data, error } = await supabase
      .from('jobs')
      .select('id, title, description, source_url, companies(name)')
      .eq('active', true)
      .ilike('source_url', '%adzuna%')
      .range(offset, offset + 999)
    if (error || !data || data.length === 0) break
    allJobs = allJobs.concat(data)
    offset += 1000
    if (data.length < 1000) break
  }

  // Filter to short descriptions only
  var needsEnrichment = allJobs.filter(function(j) {
    return (j.description || '').length <= 550
  })

  console.log('Total Adzuna jobs: ' + allJobs.length)
  console.log('Need enrichment: ' + needsEnrichment.length)
  console.log('Processing: offset=' + OFFSET + ' limit=' + LIMIT + ' delay=' + DELAY + 's\n')

  var jobs = needsEnrichment.slice(OFFSET, OFFSET + LIMIT)
  if (jobs.length === 0) { console.log('Nothing to process.'); return }

  // Launch stealth browser
  var browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1366,768',
    ]
  })

  var enriched = 0
  var failed = 0
  var blocked = 0

  for (var i = 0; i < jobs.length; i++) {
    var job = jobs[i]
    var page = await browser.newPage()

    try {
      // Set realistic viewport and user agent
      await page.setViewport({ width: 1366, height: 768 })

      // Random realistic user agent
      var agents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      ]
      await page.setUserAgent(agents[Math.floor(Math.random() * agents.length)])

      // Navigate through Adzuna redirect
      await page.goto(job.source_url, {
        waitUntil: 'networkidle2',
        timeout: 20000
      })

      // Wait for page to settle
      await new Promise(function(r) { setTimeout(r, 2000 + Math.random() * 2000) })

      var currentUrl = page.url()

      // Check if we got blocked
      if (currentUrl.includes('adzuna') || currentUrl.includes('suspicious') || currentUrl.includes('blocked')) {
        console.log('  ✗ BLOCKED — ' + job.title)
        blocked++
        await page.close()

        if (blocked >= 5) {
          console.log('\n⚠ Adzuna is blocking. Try again later or use a VPN.')
          console.log('  Processed ' + (i + 1) + ' of ' + jobs.length + ' before block.')
          break
        }
        continue
      }

      // Extract description from the employer's page
      var description = await extractText(page)

      if (description && description.length > 600) {
        // Clean up HTML
        description = description
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<img[^>]*>/gi, '')
          .replace(/\s(class|style|id)="[^"]*"/gi, '')
          .replace(/\sdata-[a-z-]+="[^"]*"/gi, '')

        // Update in database
        await supabase.from('jobs').update({
          description: description.substring(0, 50000),
          source_url: currentUrl, // Save the actual employer URL
        }).eq('id', job.id)

        console.log('  ✓ ' + job.title.substring(0, 50) + ' — ' + description.length + ' chars from ' + currentUrl.substring(0, 50))
        enriched++
      } else {
        console.log('  ~ ' + job.title.substring(0, 50) + ' — could not extract (page too short)')
        failed++
      }
    } catch (err) {
      console.log('  ✗ ' + job.title.substring(0, 50) + ' — ' + err.message.substring(0, 60))
      failed++
    } finally {
      await page.close()
    }

    // Progress
    if ((i + 1) % 10 === 0) {
      console.log('[' + (i + 1) + '/' + jobs.length + '] Enriched: ' + enriched + ' | Failed: ' + failed + ' | Blocked: ' + blocked)
    }

    // Random delay to avoid detection
    var delay = randomDelay(DELAY)
    await new Promise(function(r) { setTimeout(r, delay) })
  }

  await browser.close()

  console.log('\n=== DONE ===')
  console.log('Enriched: ' + enriched)
  console.log('Failed: ' + failed)
  console.log('Blocked: ' + blocked)
  if (OFFSET + LIMIT < needsEnrichment.length) {
    console.log('\nNext batch: node scripts/enrich-descriptions.mjs --offset ' + (OFFSET + LIMIT) + ' --limit ' + LIMIT)
  }
}

main().catch(console.error)
