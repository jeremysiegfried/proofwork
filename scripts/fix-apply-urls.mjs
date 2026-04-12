// Follow Adzuna redirect URLs and save the actual employer job page URLs
// Run from your local machine: node scripts/fix-apply-urls.mjs [--offset 0] [--limit 500] [--tabs 3]
//
// Requires: npm install puppeteer (should already be installed from previous crawl)

import { createClient } from '@supabase/supabase-js'
import puppeteer from 'puppeteer'

const SUPABASE_URL = 'https://fovjkyqimtafpzdwtatp.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvdmpreXFpbXRhZnB6ZHd0YXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzQ5OTUsImV4cCI6MjA5MTQxMDk5NX0.qG50PxCyWTL9gyb8jlqjJsKQ6gJGULbOizqxezQTais'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Parse args
var args = process.argv.slice(2)
var OFFSET = 0
var LIMIT = 500
var TABS = 3

for (var i = 0; i < args.length; i++) {
  if (args[i] === '--offset' && args[i+1]) OFFSET = parseInt(args[i+1])
  if (args[i] === '--limit' && args[i+1]) LIMIT = parseInt(args[i+1])
  if (args[i] === '--tabs' && args[i+1]) TABS = parseInt(args[i+1])
}

async function main() {
  // Get all jobs with Adzuna source URLs
  console.log('Fetching jobs with Adzuna URLs...')
  
  var allJobs = []
  var batchSize = 1000
  var offset = 0
  
  while (true) {
    var { data, error } = await supabase
      .from('jobs')
      .select('id, title, source_url, companies(name)')
      .eq('active', true)
      .ilike('source_url', '%adzuna%')
      .range(offset, offset + batchSize - 1)
    
    if (error) { console.error('Query error:', error.message); break }
    if (!data || data.length === 0) break
    allJobs = allJobs.concat(data)
    offset += batchSize
    if (data.length < batchSize) break
  }

  console.log('Found ' + allJobs.length + ' jobs with Adzuna URLs')
  
  // Apply offset/limit
  var jobs = allJobs.slice(OFFSET, OFFSET + LIMIT)
  console.log('Processing ' + jobs.length + ' jobs (offset=' + OFFSET + ', limit=' + LIMIT + ')')

  if (jobs.length === 0) {
    console.log('Nothing to process.')
    return
  }

  // Launch browser
  var browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  var updated = 0
  var failed = 0
  var skipped = 0

  // Process in batches using multiple tabs
  for (var batch = 0; batch < jobs.length; batch += TABS) {
    var chunk = jobs.slice(batch, batch + TABS)
    
    var results = await Promise.allSettled(chunk.map(async function(job) {
      var page = await browser.newPage()
      
      try {
        // Set a realistic user agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
        
        // Navigate and wait for redirects to finish
        await page.goto(job.source_url, {
          waitUntil: 'domcontentloaded',
          timeout: 15000
        })

        // Wait a moment for any JS redirects
        await new Promise(function(r) { setTimeout(r, 2000) })
        
        // Get the final URL after all redirects
        var finalUrl = page.url()
        
        // Check if we actually got redirected to a real employer page
        if (finalUrl && 
            !finalUrl.includes('adzuna.co.uk') && 
            !finalUrl.includes('suspicious') &&
            !finalUrl.includes('blocked') &&
            !finalUrl.includes('error') &&
            !finalUrl.includes('about:blank') &&
            finalUrl.startsWith('http')) {
          
          // Update the job with the real URL
          var { error: updateError } = await supabase
            .from('jobs')
            .update({ source_url: finalUrl })
            .eq('id', job.id)
          
          if (updateError) {
            console.error('  ✗ DB error for ' + job.title + ': ' + updateError.message)
            return 'failed'
          }
          
          console.log('  ✓ ' + job.title + ' → ' + finalUrl.substring(0, 80))
          return 'updated'
        } else {
          // Still on Adzuna or blocked - clear the URL so it falls through to Google
          await supabase
            .from('jobs')
            .update({ source_url: '' })
            .eq('id', job.id)
          
          console.log('  ~ ' + job.title + ' → cleared (redirect blocked)')
          return 'cleared'
        }
      } catch (err) {
        // Timeout or navigation error - clear the broken URL
        await supabase
          .from('jobs')
          .update({ source_url: '' })
          .eq('id', job.id)
        
        console.log('  ✗ ' + job.title + ' → cleared (error: ' + err.message.substring(0, 50) + ')')
        return 'failed'
      } finally {
        await page.close()
      }
    }))

    results.forEach(function(r) {
      if (r.status === 'fulfilled') {
        if (r.value === 'updated') updated++
        else if (r.value === 'cleared') skipped++
        else failed++
      } else {
        failed++
      }
    })

    var progress = Math.min(batch + TABS, jobs.length)
    console.log('[' + progress + '/' + jobs.length + '] Updated: ' + updated + ' | Cleared: ' + skipped + ' | Failed: ' + failed)
    
    // Small delay between batches to be polite
    await new Promise(function(r) { setTimeout(r, 1000) })
  }

  await browser.close()

  console.log('\n=== DONE ===')
  console.log('Updated with real URLs: ' + updated)
  console.log('Cleared (blocked/failed): ' + skipped)
  console.log('Errors: ' + failed)
  console.log('\nNext: run with --offset ' + (OFFSET + LIMIT) + ' to process the next batch')
}

main().catch(console.error)
