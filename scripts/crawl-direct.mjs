// Crawl job descriptions directly from employer career pages
// Uses DuckDuckGo HTML (no JS needed, no bot detection)
// Run: node scripts/crawl-direct.mjs [--offset 0] [--limit 500]

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

var SKIP_DOMAINS = ['adzuna', 'indeed', 'reed.co.uk', 'totaljobs', 'linkedin', 'glassdoor', 'google.com', 'youtube', 'facebook', 'twitter', 'wikipedia', 'duckduckgo']

function shouldSkip(url) {
  var lower = url.toLowerCase()
  return SKIP_DOMAINS.some(function(d) { return lower.includes(d) })
}

async function searchDDG(page, query) {
  try {
    // Use DuckDuckGo HTML-only version - no JS, no captchas
    var url = 'https://html.duckduckgo.com/html/?q=' + encodeURIComponent(query)
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 })
    await new Promise(function(r) { setTimeout(r, 1000) })

    var links = await page.evaluate(function() {
      var results = []
      // DDG HTML results are in .result__a links
      var anchors = document.querySelectorAll('.result__a')
      for (var i = 0; i < anchors.length; i++) {
        var href = anchors[i].href
        if (href && href.startsWith('http')) {
          results.push(href)
        }
      }
      // Also try generic links if the above selector doesn't work
      if (results.length === 0) {
        var allLinks = document.querySelectorAll('a[href]')
        for (var j = 0; j < allLinks.length; j++) {
          var h = allLinks[j].href
          if (h && h.startsWith('http') && !h.includes('duckduckgo')) {
            results.push(h)
          }
        }
      }
      return results.slice(0, 10)
    })

    return links
  } catch (err) {
    return []
  }
}

async function extractJobDescription(page, url) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 })
    await new Promise(function(r) { setTimeout(r, 2000 + Math.random() * 1500) })

    var result = await page.evaluate(function() {
      var selectors = [
        '[class*="job-description"]', '[class*="jobDescription"]',
        '[class*="job_description"]', '[class*="job-details"]',
        '[class*="posting-description"]', '[class*="vacancy-description"]',
        '[class*="role-description"]', '[class*="description-content"]',
        '[id*="job-description"]', '[id*="jobDescription"]',
        '#content .section-wrapper', '.posting-page .content',
        '[data-automation-id="jobPostingDescription"]',
        '.job-post-content', '.job-content', '.posting-content',
        '.careers-detail', '.entry-content',
        'article', 'main .content', 'main',
      ]

      for (var i = 0; i < selectors.length; i++) {
        var el = document.querySelector(selectors[i])
        if (el) {
          var text = el.innerText || ''
          if (text.length > 300) {
            return { html: el.innerHTML, text: text, len: text.length }
          }
        }
      }

      // Fallback: largest text block
      var best = null, bestLen = 0
      var blocks = document.querySelectorAll('div, section, article')
      for (var j = 0; j < blocks.length; j++) {
        var t = blocks[j].innerText || ''
        var cls = (blocks[j].className || '' ).toLowerCase()
        if (/nav|header|footer|menu|sidebar|cookie|banner|popup|modal/i.test(cls)) continue
        if (t.length > bestLen && t.length > 300 && t.length < 20000) {
          bestLen = t.length
          best = { html: blocks[j].innerHTML, text: t, len: t.length }
        }
      }
      return best
    })

    return result
  } catch (err) {
    return null
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
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
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
    return (j.description || '').length <= 550 && (j.description || '').length > 10
  })

  console.log('Total: ' + allJobs.length + ' | Short: ' + shortJobs.length)
  var jobs = shortJobs.slice(OFFSET, OFFSET + LIMIT)
  console.log('Processing: ' + jobs.length + ' (offset=' + OFFSET + ')\n')

  if (jobs.length === 0) { console.log('Done.'); return }

  var browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1366,768']
  })

  var enriched = 0, notFound = 0, failed = 0
  var start = Date.now()

  for (var i = 0; i < jobs.length; i++) {
    var job = jobs[i]
    var company = job.companies?.name || ''
    var query = '"' + job.title + '" "' + company + '"'

    process.stdout.write('[' + (i+1) + '/' + jobs.length + '] ' + job.title.substring(0, 30).padEnd(32) + company.substring(0, 18).padEnd(20))

    var page = await browser.newPage()
    await page.setViewport({ width: 1366, height: 768 })

    try {
      // Search DuckDuckGo
      var results = await searchDDG(page, query)
      var employerLinks = results.filter(function(url) { return !shouldSkip(url) })

      if (employerLinks.length === 0) {
        // Try without quotes
        results = await searchDDG(page, job.title + ' ' + company + ' job')
        employerLinks = results.filter(function(url) { return !shouldSkip(url) })
      }

      if (employerLinks.length === 0) {
        console.log('~ no result')
        notFound++
        await page.close()
        await new Promise(function(r) { setTimeout(r, 3000 + Math.random() * 3000) })
        continue
      }

      // Visit employer page
      var targetUrl = employerLinks[0]
      var desc = await extractJobDescription(page, targetUrl)

      if (desc && desc.text && desc.text.length > 500) {
        // Verify content matches job
        var words = job.title.toLowerCase().split(/\s+/).filter(function(w) { return w.length > 3 })
        var content = desc.text.toLowerCase()
        var matches = words.filter(function(w) { return content.includes(w) }).length
        var ratio = words.length > 0 ? matches / words.length : 0

        if (ratio >= 0.3) {
          var cleaned = desc.html ? cleanHTML(desc.html) : desc.text
          await supabase.from('jobs').update({
            description: cleaned.substring(0, 50000)
          }).eq('id', job.id)

          var domain = ''
          try { domain = new URL(targetUrl).hostname.replace('www.', '').substring(0, 25) } catch(e) {}
          console.log('✓ ' + desc.text.length + 'ch from ' + domain)
          enriched++
        } else {
          console.log('~ wrong job')
          notFound++
        }
      } else {
        console.log('~ page too short')
        notFound++
      }
    } catch (err) {
      console.log('✗ ' + (err.message || '').substring(0, 35))
      failed++
    } finally {
      try { await page.close() } catch(e) {}
    }

    // 5-10s delay
    await new Promise(function(r) { setTimeout(r, 5000 + Math.random() * 5000) })

    if ((i+1) % 50 === 0) {
      var mins = Math.round((Date.now() - start) / 60000)
      var eta = Math.round(((jobs.length - i) / (i+1)) * mins)
      console.log('\n=== ' + enriched + ' enriched | ' + notFound + ' not found | ' + failed + ' failed | ' + mins + 'min | ~' + eta + 'min left ===\n')
    }
  }

  await browser.close()
  console.log('\n=== COMPLETE ===')
  console.log('Enriched: ' + enriched + ' | Not found: ' + notFound + ' | Failed: ' + failed)
  console.log('Time: ' + Math.round((Date.now() - start) / 60000) + ' min')
  if (OFFSET + LIMIT < shortJobs.length) {
    console.log('\nNext: node scripts/crawl-direct.mjs --offset ' + (OFFSET + LIMIT))
  }
}

main().catch(console.error)
