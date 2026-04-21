// Re-fetch job descriptions directly from Adzuna API
// No browser needed, no redirects, no blocking
// Run: node scripts/refetch-adzuna.mjs [--limit 500]

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fovjkyqimtafpzdwtatp.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvdmpreXFpbXRhZnB6ZHd0YXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzQ5OTUsImV4cCI6MjA5MTQxMDk5NX0.qG50PxCyWTL9gyb8jlqjJsKQ6gJGULbOizqxezQTais'
const ADZUNA_ID = '83de6425'
const ADZUNA_KEY = 'e032d7f124131b52ee21f480e89a3c41'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

var args = process.argv.slice(2)
var LIMIT = 500
var OFFSET = 0
for (var i = 0; i < args.length; i++) {
  if (args[i] === '--limit' && args[i+1]) LIMIT = parseInt(args[i+1])
  if (args[i] === '--offset' && args[i+1]) OFFSET = parseInt(args[i+1])
}

async function searchAdzuna(title, company) {
  // Search with exact title, filter by company
  var query = encodeURIComponent(title)
  var url = 'https://api.adzuna.com/v1/api/jobs/gb/search/1?app_id=' + ADZUNA_ID 
    + '&app_key=' + ADZUNA_KEY 
    + '&results_per_page=3'
    + '&what_phrase=' + query
    + '&content-type=application/json'

  try {
    var res = await fetch(url)
    if (!res.ok) return null
    var data = await res.json()

    if (!data.results || data.results.length === 0) return null

    // Find best match by company name
    var companyLower = (company || '').toLowerCase()
    for (var i = 0; i < data.results.length; i++) {
      var job = data.results[i]
      var jobCompany = (job.company?.display_name || '').toLowerCase()
      if (jobCompany.includes(companyLower) || companyLower.includes(jobCompany)) {
        return {
          description: job.description || '',
          redirect_url: job.redirect_url || '',
        }
      }
    }

    // Try first result if title matches closely
    var firstTitle = (data.results[0].title || '').toLowerCase()
    var searchTitle = title.toLowerCase()
    if (firstTitle.includes(searchTitle) || searchTitle.includes(firstTitle)) {
      return {
        description: data.results[0].description || '',
        redirect_url: data.results[0].redirect_url || '',
      }
    }

    return null
  } catch (err) {
    return null
  }
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
    return (j.description || '').length > 10 && (j.description || '').length <= 550
  })

  console.log('Total: ' + allJobs.length + ' | Short: ' + shortJobs.length)
  var jobs = shortJobs.slice(OFFSET, OFFSET + LIMIT)
  console.log('Processing: ' + jobs.length + '\n')

  if (jobs.length === 0) { console.log('Done.'); return }

  var improved = 0
  var same = 0
  var notFound = 0
  var start = Date.now()

  for (var i = 0; i < jobs.length; i++) {
    var job = jobs[i]
    var company = job.companies?.name || ''
    
    process.stdout.write('[' + (i+1) + '/' + jobs.length + '] ' + job.title.substring(0, 35).padEnd(37) + company.substring(0, 15).padEnd(17))

    var result = await searchAdzuna(job.title, company)

    if (result && result.description && result.description.length > (job.description || '').length) {
      await supabase.from('jobs').update({
        description: result.description,
      }).eq('id', job.id)

      console.log('✓ ' + (job.description || '').length + '→' + result.description.length)
      improved++
    } else if (result) {
      console.log('~ same length')
      same++
    } else {
      console.log('✗ not found')
      notFound++
    }

    // Rate limit: Adzuna API allows ~250 req/min
    await new Promise(function(r) { setTimeout(r, 300) })

    if ((i+1) % 100 === 0) {
      var mins = Math.round((Date.now() - start) / 60000)
      console.log('\n=== ' + improved + ' improved | ' + same + ' same | ' + notFound + ' missing | ' + mins + 'min ===\n')
    }
  }

  console.log('\n=== COMPLETE ===')
  console.log('Improved: ' + improved)
  console.log('Same length: ' + same)
  console.log('Not found: ' + notFound)
  console.log('Time: ' + Math.round((Date.now() - start) / 60000) + ' min')

  if (OFFSET + LIMIT < shortJobs.length) {
    console.log('\nNext: node scripts/refetch-adzuna.mjs --offset ' + (OFFSET + LIMIT))
  }
}

main().catch(console.error)
