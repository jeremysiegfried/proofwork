// Follow Adzuna redirects via HTTP fetch, then scrape employer pages
// Run: node scripts/enrich-v3.mjs [--limit 500] [--offset 0]

import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { createClient } from '@supabase/supabase-js'

puppeteer.use(StealthPlugin())

const SUPABASE_URL = 'https://fovjkyqimtafpzdwtatp.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvdmpreXFpbXRhZnB6ZHd0YXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzQ5OTUsImV4cCI6MjA5MTQxMDk5NX0.qG50PxCyWTL9gyb8jlqjJsKQ6gJGULbOizqxezQTais'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

var args = process.argv.slice(2)
var LIMIT = 500
var OFFSET = 0
for (var i = 0; i < args.length; i++) {
  if (args[i] === '--limit' && args[i+1]) LIMIT = parseInt(args[i+1])
  if (args[i] === '--offset' && args[i+1]) OFFSET = parseInt(args[i+1])
}

async function followRedirect(url) {
  if (!url || !url.startsWith('http')) return null
  try {
    var res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html',
        'Accept-Language': 'en-GB,en;q=0.9',
      }
    })
    var finalUrl = res.url
    // Check it actually redirected to an employer site
    if (finalUrl && !finalUrl.includes('adzuna') && !finalUrl.includes('suspicious') && finalUrl.startsWith('http')) {
      return finalUrl
    }
    // Check body for meta redirect
    var body = await res.text()
    var match = body.match(/url=["']?(https?:\/\/[^"'\s>]+)/i)
    if (match && !match[1].includes('adzuna')) return match[1]
    return null
  } catch (err) {
    return null
  }
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
    var d = (j.description || '').length
    var hasUrl = j.source_url && j.source_url.startsWith('http')
    return d > 10 && d <= 550 && hasUrl
  })

  console.log('Total: ' + allJobs.length + ' | Short w/ URL: ' + shortJobs.length)
  var jobs = shortJobs.slice(OFFSET, OFFSET + LIMIT)
  console.log('Processing: ' + jobs.length + ' (offset=' + OFFSET + ')\n')

  if (jobs.length === 0) { console.log('Done.'); return }

  // Step 1: Resolve redirects via HTTP
  console.log('Step 1: Resolving redirect URLs via HTTP...\n')
  var resolved = []
  var blocked = 0

  for (var i = 0; i < jobs.length; i++) {
    var job = jobs[i]
    process.stdout.write('[' + (i+1) + '/' + jobs.length + '] ' + job.title.substring(0, 35).padEnd(37))

    var employerUrl = await followRedirect(job.source_url)
    if (employerUrl) {
      var domain = ''
      try { domain = new URL(employerUrl).hostname.replace('www.', '').substring(0, 30) } catch(e) {}
      console.log('→ ' + domain)
      resolved.push({ job: job, url: employerUrl })
    } else {
      console.log('✗')
      blocked++
    }

    await new Promise(function(r) { setTimeout(r, 300) })
  }

  console.log('\nResolved: ' + resolved.length + ' | Blocked: ' + blocked)

  if (resolved.length === 0) {
    console.log('\nAll blocked. Try from a different network.')
    return
  }

  // Step 2: Scrape employer pages
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

    var result = await scrapeEmployerPage(browser, item.url)

    if (result && result.len > 500) {
      var cleaned = cleanHTML(result.html)
      await supabase.from('jobs').update({
        description: cleaned.substring(0, 50000)
      }).eq('id', item.job.id)
      console.log('✓ ' + result.len + ' chars')
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
  console.log('Enriched: ' + enriched)
  console.log('Failed: ' + failed)
  console.log('Time: ' + Math.round((Date.now() - start) / 60000) + ' min')

  if (OFFSET + LIMIT < shortJobs.length) {
    console.log('\nNext: node scripts/enrich-v3.mjs --offset ' + (OFFSET + LIMIT))
  }
}

main().catch(console.error)
