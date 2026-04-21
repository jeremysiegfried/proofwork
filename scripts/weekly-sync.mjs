// Weekly job sync - fetches new jobs from Adzuna, deactivates expired ones
// Reads credentials from env vars (works in GitHub Actions and locally)
// Run manually: node scripts/weekly-sync.mjs
// Or automatically via GitHub Actions every Monday

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Try env vars first (GitHub Actions), then .env.local (local)
var SUPABASE_URL = process.env.SUPABASE_URL || ''
var SUPABASE_KEY = process.env.SUPABASE_KEY || ''
var ADZUNA_ID = process.env.ADZUNA_APP_ID || ''
var ADZUNA_KEY = process.env.ADZUNA_APP_KEY || ''

if (!SUPABASE_URL) {
  try {
    var env = readFileSync('.env.local', 'utf8')
    var urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)
    var keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/)
    if (urlMatch) SUPABASE_URL = urlMatch[1].trim()
    if (keyMatch) SUPABASE_KEY = keyMatch[1].trim()
  } catch(e) {}
}

if (!ADZUNA_ID) { ADZUNA_ID = '83de6425'; ADZUNA_KEY = 'e032d7f124131b52ee21f480e89a3c41' }
if (!SUPABASE_URL) { SUPABASE_URL = 'https://fovjkyqimtafpzdwtatp.supabase.co' }
if (!SUPABASE_KEY) { SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvdmpreXFpbXRhZnB6ZHd0YXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzQ5OTUsImV4cCI6MjA5MTQxMDk5NX0.qG50PxCyWTL9gyb8jlqjJsKQ6gJGULbOizqxezQTais' }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

var SEARCHES = [
  'software engineer', 'data scientist', 'data engineer', 'product manager',
  'frontend developer', 'backend developer', 'devops engineer', 'ux designer',
  'marketing manager', 'sales manager', 'project manager', 'business analyst',
  'machine learning', 'cloud engineer', 'cybersecurity', 'full stack developer',
  'scrum master', 'qa engineer', 'account manager', 'finance manager',
  'hr manager', 'content manager', 'solutions architect', 'data analyst',
]

function generateSlug(title, company) {
  var text = (title + ' ' + company).toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 80)
  return text + '-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5)
}

async function getOrCreateCompany(name) {
  var slug = name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-').substring(0, 60)
  var { data: existing } = await supabase.from('companies').select('id').eq('slug', slug).single()
  if (existing) return existing.id
  var { data: created } = await supabase.from('companies').insert({ name: name, slug: slug, claimed: false }).select('id').single()
  return created ? created.id : null
}

async function fetchPage(query, page) {
  var url = 'https://api.adzuna.com/v1/api/jobs/gb/search/' + page
    + '?app_id=' + ADZUNA_ID
    + '&app_key=' + ADZUNA_KEY
    + '&results_per_page=50'
    + '&what=' + encodeURIComponent(query)
    + '&max_days_old=7'
    + '&content-type=application/json'
  try {
    var res = await fetch(url)
    if (!res.ok) return []
    var data = await res.json()
    return data.results || []
  } catch(e) { return [] }
}

async function main() {
  var startTime = Date.now()
  console.log('=== WEEKLY JOB SYNC ===')
  console.log('Started: ' + new Date().toISOString() + '\n')

  var totalNew = 0
  var totalSkipped = 0
  var totalErrors = 0

  // Fetch new jobs from Adzuna
  for (var s = 0; s < SEARCHES.length; s++) {
    var query = SEARCHES[s]
    process.stdout.write('[' + (s+1) + '/' + SEARCHES.length + '] ' + query.padEnd(25))

    var results = await fetchPage(query, 1)

    var newInBatch = 0
    for (var i = 0; i < results.length; i++) {
      var job = results[i]
      var title = job.title || ''
      var companyName = job.company?.display_name || 'Unknown'
      var location = job.location?.display_name || 'UK'
      var salaryMin = Math.round(job.salary_min || 0)
      var salaryMax = Math.round(job.salary_max || salaryMin)
      var description = job.description || ''
      var adzunaId = job.id ? String(job.id) : ''
      var redirectUrl = 'https://www.adzuna.co.uk/jobs/land/ad/' + adzunaId

      // Skip duplicates
      if (adzunaId) {
        var { data: existing } = await supabase
          .from('jobs').select('id')
          .ilike('source_url', '%' + adzunaId + '%')
          .single()
        if (existing) { totalSkipped++; continue }
      }

      try {
        var companyId = await getOrCreateCompany(companyName)
        if (!companyId) { totalErrors++; continue }

        var remote = 'On-site'
        var combined = (title + ' ' + description).toLowerCase()
        if (/\bremote\b/.test(combined)) remote = 'Remote'
        else if (/\bhybrid\b/.test(combined)) remote = 'Hybrid'

        var simpleLocation = location.split(',')[0].trim()
        var trust = salaryMin > 0 ? 30 : 0
        var slug = generateSlug(title, companyName)

        await supabase.from('jobs').insert({
          title: title, slug: slug, description: description,
          location: simpleLocation, remote_policy: remote,
          job_type: job.contract_time === 'part_time' ? 'Part-time' : job.contract_type === 'contract' ? 'Contract' : 'Full-time',
          salary_min: salaryMin, salary_max: salaryMax,
          company_id: companyId, source: 'adzuna', source_url: redirectUrl,
          trust_score: trust, has_challenge: false, active: true,
          posted_at: job.created || new Date().toISOString(),
        })
        totalNew++
        newInBatch++
      } catch (err) { totalErrors++ }
    }

    console.log(results.length + ' found, ' + newInBatch + ' new')
    await new Promise(function(r) { setTimeout(r, 1000) })
  }

  // Deactivate jobs older than 45 days (Adzuna sourced only)
  var cutoff = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString()
  var { data: expired } = await supabase
    .from('jobs')
    .update({ active: false })
    .eq('active', true)
    .eq('source', 'adzuna')
    .lt('posted_at', cutoff)
    .select('id')

  var deactivated = expired ? expired.length : 0

  // Get final counts
  var { count: activeCount } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('active', true)
  var { count: companyCount } = await supabase.from('companies').select('*', { count: 'exact', head: true })

  var elapsed = Math.round((Date.now() - startTime) / 60000)

  console.log('\n=== SYNC COMPLETE ===')
  console.log('New jobs added:    ' + totalNew)
  console.log('Already existed:   ' + totalSkipped)
  console.log('Errors:            ' + totalErrors)
  console.log('Deactivated (>45d): ' + deactivated)
  console.log('Active jobs now:   ' + activeCount)
  console.log('Total companies:   ' + companyCount)
  console.log('Time:              ' + elapsed + ' min')
  console.log('Finished: ' + new Date().toISOString())
}

main().catch(console.error)
