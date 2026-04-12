// Enrich descriptions using Vercel API to resolve Adzuna redirects
// Step 1: Send Adzuna URLs to your Vercel deployment (different IP!)
// Step 2: Scrape employer pages locally with Puppeteer
// Run: node scripts/enrich-via-vercel.mjs [--limit 500]

import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { createClient } from '@supabase/supabase-js'

puppeteer.use(StealthPlugin())

const SUPABASE_URL = 'https://fovjkyqimtafpzdwtatp.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvdmpreXFpbXRhZnB6ZHd0YXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzQ5OTUsImV4cCI6MjA5MTQxMDk5NX0.qG50PxCyWTL9gyb8jlqjJsKQ6gJGULbOizqxezQTais'
const VERCEL_URL = 'https://proofwork-nine.vercel.app/api/resolve-urls'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

var args = process.argv.slice(2)
var LIMIT = 500
var OFFSET = 0
for (var i = 0; i < args.length; i++) {
  if (args[i] === '--limit' && args[i+1]) LIMIT = parseInt(args[i+1])
  if (args[i] === '--offset' && args[i+1]) OFFSET = parseInt(args[i+1])
}

async function resolveViaVercel(urls) {
  // Send batch of URLs to Vercel to resolve
  var res = await fetch(VERCEL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls: urls })
  })
  if (!res.ok) throw new Error('Vercel API error: ' + res.status)
  var data = await res.json()
  return data.results || []
}

async function scrapeEmployerPage(browser, url) {
  var page = await browser.newPage()
  try {
    await page.setViewport({ width: 1366, height: 768 })
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 })
    await new Promise(function(r) { setTimeout(r, 2000) })

    var result = await page.evaluate(function() {
      var selectors = [
        '[class*="job-description"]', '[class*="jobDescription"]',
        '[class*="job_description"]', '[class*="job-details"]',
        '[class*="posting-description"]', '[class*="vacancy-description"]',
        '[class*="description-content"]',
        '[id*="job-description"]', '[id*="jobDescription"]',
        '#content .section-wrapper', '.posting-page .content',
        '[data-automation-id="jobPostingDescription"]',
        '.job-post-content', '.job-content', '.posting-content',
        '.entry-content', 'article', 'main',
      ]
      for (var i = 0; i < selectors.length; i++) {
        var el = document.querySelector(selectors[i])
        if (el && el.innerText.length > 300) {
          return { html: el.innerHTML, len: el.innerText.length }
        }
      }
      var best = null, bestLen = 0
      var blocks = document.querySelectorAll('div, section')
      for (var j = 0; j < blocks.length; j++) {
        var t = blocks[j].innerText || ''
        var cls = (blocks[j].className || '').toLowerCase()
        if (/nav|header|footer|menu|sidebar|cookie|banner|popup|modal/i.test(cls)) continue
        if (t.length > bestLen && t.length > 300 && t.length < 20000) {
          bestLen = t.length
          best = { html: blocks[j].innerHTML, len: t.length }
        }
      }
      return best
    })
    return result
  } catch (err) {
    return null
  } finally {
    await page.close()
  }
}

function cleanHTML(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<img[^>]*>/gi, '')
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/\s(class|style|id|data-[a-z-]+)="[^"]*"/gi, '')
    .substring(0, 30000)
}

async function main() {
  console.log('Fetching jobs with short descriptions...\n')

  var allJobs = []
  var offset = 0
  while (true) {
    var { data, error } = await supabase
      .from('jobs')
      .select('id, title, description, source_url, companies(name)')
      .eq('active', true)
      .range(offset, offset + 999)
    if (error || !data || data.length === 0) break
    allJobs = allJobs.concat(data)
    offset += 1000
    if (data.length < 1000) break
  }

  var shortJobs = allJobs.filter(function(j) {
    return (j.description || '').length > 10 && (j.description || '').length <= 550 && j.source_url && j.source_url.startsWith('http')
  })

  console.log('Total: ' + allJobs.length + ' | Short w/ URL: ' + shortJobs.length)
  var jobs = shortJobs.slice(OFFSET, OFFSET + LIMIT)
  console.log('Processing: ' + jobs.length + ' (offset=' + OFFSET + ')\n')

  if (jobs.length === 0) { console.log('Done.'); return }

  // Step 1: Resolve URLs in batches via Vercel
  console.log('Step 1: Resolving URLs via Vercel (batches of 10)...\n')

  var resolved = []
  var blocked = 0

  for (var b = 0; b < jobs.length; b += 10) {
    var batch = jobs.slice(b, b + 10)
    var batchUrls = batch.map(function(j) { return j.source_url })

    try {
      var results = await resolveViaVercel(batchUrls)

      for (var r = 0; r < results.length; r++) {
        var result = results[r]
        var matchingJob = batch[r]

        if (result.ok && result.resolved) {
          var domain = ''
          try { domain = new URL(result.resolved).hostname.replace('www.', '').substring(0, 30) } catch(e) {}
          console.log('  ✓ ' + matchingJob.title.substring(0, 35).padEnd(37) + '→ ' + domain)
          resolved.push({ job: matchingJob, url: result.resolved })
        } else {
          console.log('  ✗ ' + matchingJob.title.substring(0, 35))
          blocked++
        }
      }
    } catch (err) {
      console.log('  ✗ Batch error: ' + err.message.substring(0, 50))
      blocked += batch.length
    }

    console.log('[' + Math.min(b + 10, jobs.length) + '/' + jobs.length + '] Resolved: ' + resolved.length + ' | Blocked: ' + blocked)

    // Small delay between batches
    await new Promise(function(r) { setTimeout(r, 2000) })
  }

  console.log('\nTotal resolved: ' + resolved.length + ' / ' + jobs.length)

  if (resolved.length === 0) {
    console.log('\nVercel also blocked. Adzuna may be blocking all server IPs.')
    return
  }

  // Step 2: Scrape employer pages locally
  console.log('\nStep 2: Scraping ' + resolved.length + ' employer pages...\n')

  var browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  var enriched = 0, failed = 0
  var start = Date.now()

  for (var i = 0; i < resolved.length; i++) {
    var item = resolved[i]
    process.stdout.write('[' + (i+1) + '/' + resolved.length + '] ' + item.job.title.substring(0, 40).padEnd(42))

    var desc = await scrapeEmployerPage(browser, item.url)

    if (desc && desc.len > 500) {
      var cleaned = cleanHTML(desc.html)
      await supabase.from('jobs').update({ description: cleaned.substring(0, 50000) }).eq('id', item.job.id)
      console.log('✓ ' + desc.len + ' chars')
      enriched++
    } else {
      console.log('~ too short')
      failed++
    }

    await new Promise(function(r) { setTimeout(r, 2000 + Math.random() * 2000) })

    if ((i+1) % 50 === 0) {
      var mins = Math.round((Date.now() - start) / 60000)
      console.log('\n=== ' + enriched + ' enriched | ' + mins + 'min ===\n')
    }
  }

  await browser.close()

  console.log('\n=== COMPLETE ===')
  console.log('Resolved: ' + resolved.length + '/' + jobs.length)
  console.log('Enriched: ' + enriched + ' | Failed: ' + failed)
  console.log('Time: ' + Math.round((Date.now() - start) / 60000) + ' min')

  if (OFFSET + LIMIT < shortJobs.length) {
    console.log('\nNext: node scripts/enrich-via-vercel.mjs --offset ' + (OFFSET + LIMIT))
  }
}

main().catch(console.error)
