// Verify ALL jobs still exist on Adzuna and deactivate dead ones
// Works locally and in GitHub Actions
// Run: node scripts/verify-jobs.mjs

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

var SUPABASE_URL = process.env.SUPABASE_URL || ''
var SUPABASE_KEY = process.env.SUPABASE_KEY || ''
var ADZUNA_ID = process.env.ADZUNA_APP_ID || '83de6425'
var ADZUNA_KEY = process.env.ADZUNA_APP_KEY || 'e032d7f124131b52ee21f480e89a3c41'

if (!SUPABASE_URL) {
  try {
    var env = readFileSync('.env.local', 'utf8')
    var m1 = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/); if (m1) SUPABASE_URL = m1[1].trim()
    var m2 = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/); if (m2) SUPABASE_KEY = m2[1].trim()
  } catch(e) {}
}
if (!SUPABASE_URL) SUPABASE_URL = 'https://fovjkyqimtafpzdwtatp.supabase.co'
if (!SUPABASE_KEY) SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvdmpreXFpbXRhZnB6ZHd0YXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzQ5OTUsImV4cCI6MjA5MTQxMDk5NX0.qG50PxCyWTL9gyb8jlqjJsKQ6gJGULbOizqxezQTais'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function verifyBatch(jobs) {
  // Verify multiple jobs by searching for their titles
  var deadIds = []

  for (var i = 0; i < jobs.length; i++) {
    var job = jobs[i]
    var adzunaId = ''
    try {
      var match = job.source_url.match(/\/(\d+)/)
      if (match) adzunaId = match[1]
    } catch(e) {}

    if (!adzunaId) continue

    // Search Adzuna for this specific job by title + company
    var query = encodeURIComponent(job.title.substring(0, 50))
    var url = 'https://api.adzuna.com/v1/api/jobs/gb/search/1?app_id=' + ADZUNA_ID
      + '&app_key=' + ADZUNA_KEY
      + '&results_per_page=5'
      + '&what_phrase=' + query
      + '&content-type=application/json'

    try {
      var res = await fetch(url)
      if (res.status === 429) {
        // Rate limited - wait and retry
        process.stdout.write(' [rate limit, waiting 30s]')
        await new Promise(function(r) { setTimeout(r, 30000) })
        i-- // Retry this job
        continue
      }
      if (!res.ok) continue

      var data = await res.json()
      
      if (!data.results || data.results.length === 0) {
        // No results at all - job likely dead
        deadIds.push(job.id)
        process.stdout.write('✗')
      } else {
        // Check if our specific job ID is in results or company matches
        var found = false
        var companyLower = (job.companies?.name || '').toLowerCase()
        
        for (var j = 0; j < data.results.length; j++) {
          var r = data.results[j]
          var rId = r.id ? String(r.id) : ''
          var rCompany = (r.company?.display_name || '').toLowerCase()
          
          if (rId === adzunaId) { found = true; break }
          if (rCompany && companyLower && (rCompany.includes(companyLower) || companyLower.includes(rCompany))) { 
            found = true; break 
          }
        }

        if (found) {
          process.stdout.write('✓')
        } else {
          // Title search returned results but none match our company
          // Could be expired or could be search mismatch - mark as suspicious
          // Only deactivate if job is older than 14 days
          var age = Math.floor((Date.now() - new Date(job.posted_at || job.created_at)) / (1000*60*60*24))
          if (age > 14) {
            deadIds.push(job.id)
            process.stdout.write('✗')
          } else {
            process.stdout.write('?')
          }
        }
      }
    } catch(e) {
      process.stdout.write('?')
    }

    await new Promise(function(r) { setTimeout(r, 350) })
  }

  return deadIds
}

async function main() {
  var startTime = Date.now()
  console.log('=== VERIFY ALL JOBS ===')
  console.log('Started: ' + new Date().toISOString() + '\n')

  // Get all active jobs
  var allJobs = []
  var offset = 0
  while (true) {
    var { data } = await supabase.from('jobs')
      .select('id, title, source_url, posted_at, created_at, companies(name)')
      .eq('active', true)
      .eq('source', 'adzuna')
      .order('posted_at', { ascending: true })
      .range(offset, offset + 999)
    if (!data || data.length === 0) break
    allJobs = allJobs.concat(data)
    offset += 1000
    if (data.length < 1000) break
  }

  console.log('Total active Adzuna jobs: ' + allJobs.length)
  console.log('Estimated time: ~' + Math.round(allJobs.length * 0.4 / 60) + ' minutes\n')

  var totalDead = 0
  var batchSize = 100

  for (var b = 0; b < allJobs.length; b += batchSize) {
    var batch = allJobs.slice(b, b + batchSize)
    process.stdout.write('[' + (b + 1) + '-' + Math.min(b + batchSize, allJobs.length) + '/' + allJobs.length + '] ')

    var deadIds = await verifyBatch(batch)

    if (deadIds.length > 0) {
      await supabase.from('jobs').update({ active: false }).in('id', deadIds)
      totalDead += deadIds.length
    }

    console.log(' | Dead: ' + deadIds.length + ' | Total removed: ' + totalDead)
  }

  var { count: remaining } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('active', true)
  var elapsed = Math.round((Date.now() - startTime) / 60000)

  console.log('\n=== VERIFY COMPLETE ===')
  console.log('Total deactivated: ' + totalDead)
  console.log('Active jobs remaining: ' + remaining)
  console.log('Time: ' + elapsed + ' min')
}

main().catch(console.error)
