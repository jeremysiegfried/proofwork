// Audit and fix Adzuna URL formats
// "details" URLs show Adzuna's page, "land/ad" URLs redirect to employer
// Run: node scripts/fix-url-format.mjs [--fix]

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fovjkyqimtafpzdwtatp.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvdmpreXFpbXRhZnB6ZHd0YXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzQ5OTUsImV4cCI6MjA5MTQxMDk5NX0.qG50PxCyWTL9gyb8jlqjJsKQ6gJGULbOizqxezQTais'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

var doFix = process.argv.includes('--fix')

async function main() {
  console.log('Auditing Adzuna URL formats...\n')

  var allJobs = []
  var offset = 0
  while (true) {
    var { data, error } = await supabase
      .from('jobs')
      .select('id, title, source_url')
      .eq('active', true)
      .range(offset, offset + 999)
    if (error || !data || data.length === 0) break
    allJobs = allJobs.concat(data)
    offset += 1000
    if (data.length < 1000) break
  }

  var landAd = []
  var details = []
  var other = []
  var noUrl = []

  for (var i = 0; i < allJobs.length; i++) {
    var url = (allJobs[i].source_url || '').trim()
    if (!url || !url.startsWith('http')) {
      noUrl.push(allJobs[i])
    } else if (url.includes('/land/ad/')) {
      landAd.push(allJobs[i])
    } else if (url.includes('/details/') || url.includes('adzuna.co.uk/jobs/details')) {
      details.push(allJobs[i])
    } else if (url.includes('adzuna')) {
      other.push(allJobs[i])
    } else {
      // Direct employer URL - fine
      landAd.push(allJobs[i])
    }
  }

  console.log('='.repeat(60))
  console.log('URL FORMAT BREAKDOWN')
  console.log('='.repeat(60))
  console.log('')
  console.log('land/ad (redirects to employer):  ' + landAd.length + ' ✓')
  console.log('details (shows Adzuna page):      ' + details.length + ' ✗ NEEDS FIX')
  console.log('other Adzuna format:              ' + other.length)
  console.log('no URL:                           ' + noUrl.length)
  console.log('')

  if (details.length > 0) {
    console.log('Sample "details" URLs that need fixing:')
    details.slice(0, 5).forEach(function(j) {
      console.log('  ' + j.title.substring(0, 40))
      console.log('  ' + j.source_url)
      
      // Extract the job ID and construct the correct URL
      var match = j.source_url.match(/\/(\d+)/)
      if (match) {
        var correctUrl = 'https://www.adzuna.co.uk/jobs/land/ad/' + match[1]
        console.log('  → ' + correctUrl)
      }
      console.log('')
    })
  }

  if (doFix && details.length > 0) {
    console.log('\nFixing ' + details.length + ' URLs...\n')
    
    var fixed = 0
    var failed = 0

    for (var i = 0; i < details.length; i++) {
      var job = details[i]
      var match = job.source_url.match(/\/(\d+)/)
      
      if (match) {
        var correctUrl = 'https://www.adzuna.co.uk/jobs/land/ad/' + match[1]
        
        await supabase.from('jobs').update({ source_url: correctUrl }).eq('id', job.id)
        fixed++
      } else {
        failed++
      }

      if ((i + 1) % 500 === 0) {
        console.log('[' + (i + 1) + '/' + details.length + '] Fixed: ' + fixed)
      }
    }

    console.log('\n=== DONE ===')
    console.log('Fixed: ' + fixed)
    console.log('Failed: ' + failed)
  } else if (details.length > 0 && !doFix) {
    console.log('To fix all "details" URLs, run:')
    console.log('  node scripts/fix-url-format.mjs --fix')
  }
}

main().catch(console.error)
