// Verify jobs still exist on Adzuna and deactivate dead ones
// Run: node scripts/verify-jobs.mjs

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fovjkyqimtafpzdwtatp.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvdmpreXFpbXRhZnB6ZHd0YXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzQ5OTUsImV4cCI6MjA5MTQxMDk5NX0.qG50PxCyWTL9gyb8jlqjJsKQ6gJGULbOizqxezQTais'
const ADZUNA_ID = '83de6425'
const ADZUNA_KEY = 'e032d7f124131b52ee21f480e89a3c41'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function verifyJob(title, company) {
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
    if (!data.results || data.results.length === 0) return false

    // Check if any result matches the company
    var companyLower = (company || '').toLowerCase()
    for (var i = 0; i < data.results.length; i++) {
      var jobCompany = (data.results[i].company?.display_name || '').toLowerCase()
      if (jobCompany.includes(companyLower) || companyLower.includes(jobCompany)) return true
    }

    // Check if title is close enough
    var firstTitle = (data.results[0].title || '').toLowerCase()
    if (firstTitle.includes(title.toLowerCase().substring(0, 20))) return true

    return false
  } catch(e) { return null }
}

async function main() {
  console.log('=== VERIFY JOBS ===\n')

  // Sample 500 random active jobs to check
  var allJobs = []
  var offset = 0
  while (true) {
    var { data } = await supabase.from('jobs')
      .select('id, title, source_url, posted_at, companies(name)')
      .eq('active', true)
      .range(offset, offset + 999)
    if (!data || data.length === 0) break
    allJobs = allJobs.concat(data)
    offset += 1000
    if (data.length < 1000) break
  }

  // Check oldest jobs first (most likely to be dead)
  allJobs.sort(function(a, b) { return new Date(a.posted_at || 0) - new Date(b.posted_at || 0) })

  var sample = allJobs.slice(0, 500)
  console.log('Checking ' + sample.length + ' oldest jobs...\n')

  var alive = 0, dead = 0, unknown = 0
  var deadIds = []

  for (var i = 0; i < sample.length; i++) {
    var job = sample[i]
    process.stdout.write('[' + (i+1) + '/' + sample.length + '] ' + job.title.substring(0, 35).padEnd(37))

    var exists = await verifyJob(job.title, job.companies?.name || '')

    if (exists === true) {
      console.log('✓ alive')
      alive++
    } else if (exists === false) {
      console.log('✗ DEAD')
      dead++
      deadIds.push(job.id)
    } else {
      console.log('? unknown')
      unknown++
    }

    // Rate limit
    await new Promise(function(r) { setTimeout(r, 400) })

    if ((i+1) % 100 === 0) {
      console.log('\n--- Alive: ' + alive + ' | Dead: ' + dead + ' | Unknown: ' + unknown + ' ---\n')
    }
  }

  // Deactivate dead jobs
  if (deadIds.length > 0) {
    console.log('\nDeactivating ' + deadIds.length + ' dead jobs...')
    for (var i = 0; i < deadIds.length; i += 50) {
      var batch = deadIds.slice(i, i + 50)
      await supabase.from('jobs').update({ active: false }).in('id', batch)
    }
  }

  console.log('\n=== VERIFY COMPLETE ===')
  console.log('Alive: ' + alive)
  console.log('Dead (deactivated): ' + dead)
  console.log('Unknown: ' + unknown)
  console.log('Sample: ' + sample.length + ' of ' + allJobs.length + ' total')
}

main().catch(console.error)
