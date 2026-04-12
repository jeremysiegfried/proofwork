// Sync fresh jobs from Adzuna API
// Run daily via cron or manually: node scripts/sync-adzuna.mjs
// This fetches new jobs and deactivates expired ones

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fovjkyqimtafpzdwtatp.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvdmpreXFpbXRhZnB6ZHd0YXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzQ5OTUsImV4cCI6MjA5MTQxMDk5NX0.qG50PxCyWTL9gyb8jlqjJsKQ6gJGULbOizqxezQTais'
const ADZUNA_ID = '83de6425'
const ADZUNA_KEY = 'e032d7f124131b52ee21f480e89a3c41'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Search categories to crawl
var SEARCHES = [
  'software engineer', 'data scientist', 'data engineer', 'product manager',
  'frontend developer', 'backend developer', 'devops engineer', 'ux designer',
  'marketing manager', 'sales manager', 'project manager', 'business analyst',
  'machine learning', 'cloud engineer', 'cybersecurity', 'full stack developer',
  'scrum master', 'qa engineer', 'account manager', 'finance manager',
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
  
  var { data: existing } = await supabase
    .from('companies')
    .select('id')
    .eq('slug', slug)
    .single()
  
  if (existing) return existing.id
  
  var { data: created } = await supabase
    .from('companies')
    .insert({ name: name, slug: slug, claimed: false })
    .select('id')
    .single()
  
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
  
  var res = await fetch(url)
  if (!res.ok) return []
  var data = await res.json()
  return data.results || []
}

async function main() {
  console.log('Starting Adzuna sync...\n')
  
  var totalNew = 0
  var totalSkipped = 0
  var totalErrors = 0

  for (var s = 0; s < SEARCHES.length; s++) {
    var query = SEARCHES[s]
    console.log('Searching: ' + query)
    
    var results = await fetchPage(query, 1)
    console.log('  Found ' + results.length + ' results')
    
    for (var i = 0; i < results.length; i++) {
      var job = results[i]
      var title = job.title || ''
      var companyName = job.company?.display_name || 'Unknown'
      var location = job.location?.display_name || 'UK'
      var salaryMin = Math.round(job.salary_min || 0)
      var salaryMax = Math.round(job.salary_max || salaryMin)
      var description = job.description || ''
      var redirectUrl = job.redirect_url || ''
      var adzunaId = job.id ? String(job.id) : ''

      // Skip if we already have this Adzuna job
      if (adzunaId) {
        var { data: existing } = await supabase
          .from('jobs')
          .select('id')
          .ilike('source_url', '%' + adzunaId + '%')
          .single()
        
        if (existing) {
          totalSkipped++
          continue
        }
      }

      try {
        var companyId = await getOrCreateCompany(companyName)
        if (!companyId) { totalErrors++; continue }

        // Determine remote policy
        var remote = 'On-site'
        var combined = (title + ' ' + description + ' ' + (job.category?.label || '')).toLowerCase()
        if (/\bremote\b/.test(combined)) remote = 'Remote'
        else if (/\bhybrid\b/.test(combined)) remote = 'Hybrid'

        // Simplify location
        var simpleLocation = location.split(',')[0].trim()

        var trust = 0
        if (salaryMin > 0) trust += 30

        var slug = generateSlug(title, companyName)

        await supabase.from('jobs').insert({
          title: title,
          slug: slug,
          description: description,
          location: simpleLocation,
          remote_policy: remote,
          job_type: job.contract_time === 'part_time' ? 'Part-time' : job.contract_type === 'contract' ? 'Contract' : 'Full-time',
          salary_min: salaryMin,
          salary_max: salaryMax,
          company_id: companyId,
          source: 'adzuna',
          source_url: redirectUrl,
          trust_score: trust,
          has_challenge: false,
          active: true,
          posted_at: job.created || new Date().toISOString(),
        })

        totalNew++
      } catch (err) {
        totalErrors++
      }
    }
    
    // Rate limit
    await new Promise(function(r) { setTimeout(r, 1000) })
  }

  // Deactivate jobs older than 60 days that aren't employer-posted
  var cutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
  var { count } = await supabase
    .from('jobs')
    .update({ active: false })
    .eq('active', true)
    .eq('source', 'adzuna')
    .lt('posted_at', cutoff)
    .select('id', { count: 'exact', head: true })
  
  console.log('\n=== SYNC COMPLETE ===')
  console.log('New jobs added: ' + totalNew)
  console.log('Already existed: ' + totalSkipped)
  console.log('Errors: ' + totalErrors)
  console.log('Deactivated (>60 days): ' + (count || 0))
  console.log('\nRun this daily to keep jobs fresh.')
}

main().catch(console.error)
