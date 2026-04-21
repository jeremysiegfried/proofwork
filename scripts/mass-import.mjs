// Mass import - maximizes job count from Adzuna API
// Fetches 5 pages per search term × 130 terms × 10 major cities
// Run: node scripts/mass-import.mjs

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fovjkyqimtafpzdwtatp.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvdmpreXFpbXRhZnB6ZHd0YXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzQ5OTUsImV4cCI6MjA5MTQxMDk5NX0.qG50PxCyWTL9gyb8jlqjJsKQ6gJGULbOizqxezQTais'
const ADZUNA_ID = '83de6425'
const ADZUNA_KEY = 'e032d7f124131b52ee21f480e89a3c41'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

var SEARCHES = [
  // High-volume general
  '', 'manager', 'assistant', 'coordinator', 'supervisor', 'director', 'analyst',
  'consultant', 'officer', 'specialist', 'executive', 'advisor',
  // Tech
  'software', 'developer', 'engineer', 'data', 'devops', 'cloud', 'cyber',
  'frontend', 'backend', 'full stack', 'architect', 'product manager',
  // Finance
  'accountant', 'finance', 'auditor', 'bookkeeper', 'payroll', 'credit', 'banking',
  'investment', 'mortgage', 'insurance',
  // Healthcare
  'nurse', 'healthcare assistant', 'carer', 'support worker', 'physiotherapist',
  'pharmacist', 'dental', 'midwife', 'mental health', 'clinical', 'doctor',
  'occupational therapist', 'paramedic', 'radiographer',
  // Education
  'teacher', 'teaching assistant', 'lecturer', 'tutor', 'school',
  'early years', 'SEN', 'headteacher',
  // Sales & Marketing
  'sales', 'account manager', 'business development', 'marketing',
  'digital marketing', 'social media', 'PR', 'copywriter', 'SEO',
  'telesales', 'field sales', 'retail sales',
  // Legal
  'solicitor', 'paralegal', 'legal secretary', 'barrister', 'compliance',
  // Construction & Trades
  'site manager', 'quantity surveyor', 'electrician', 'plumber', 'carpenter',
  'bricklayer', 'labourer', 'painter decorator', 'roofer', 'groundworker',
  'building surveyor', 'scaffolder', 'welder',
  // Hospitality
  'chef', 'sous chef', 'kitchen', 'waiter', 'bar', 'hotel', 'housekeeper',
  'restaurant manager', 'front of house', 'barista',
  // Retail
  'store manager', 'retail assistant', 'shop', 'merchandiser', 'cashier',
  'beauty therapist', 'hairdresser',
  // Logistics & Transport
  'warehouse', 'forklift', 'delivery driver', 'HGV', 'van driver',
  'logistics', 'supply chain', 'courier', 'picker packer', 'transport',
  // Admin & Office
  'administrator', 'receptionist', 'office manager', 'PA', 'secretary',
  'data entry', 'executive assistant', 'office administrator',
  // Customer Service
  'customer service', 'call centre', 'helpdesk', 'complaints',
  // HR
  'HR', 'recruiter', 'talent', 'people',
  // Property
  'estate agent', 'property manager', 'lettings', 'surveyor',
  // Manufacturing
  'production', 'quality', 'CNC', 'machine operator', 'assembly',
  'maintenance engineer', 'process engineer',
  // Energy
  'renewable', 'solar', 'wind', 'gas engineer', 'sustainability',
  // Charity / Public
  'charity', 'fundraising', 'council', 'civil service',
  // Creative
  'graphic designer', 'photographer', 'video', 'content creator',
  // Science
  'scientist', 'laboratory', 'research', 'chemist', 'biologist',
  // Security
  'security officer', 'CCTV', 'door supervisor',
  // Cleaning & Maintenance
  'cleaner', 'janitor', 'facilities', 'caretaker',
]

var PAGES_PER_SEARCH = 5
var MAX_DAYS = 30

function generateSlug(title, company) {
  return (title + ' ' + company).toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
    .substring(0, 80) + '-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5)
}

var companyCache = {}
async function getOrCreateCompany(name) {
  if (companyCache[name]) return companyCache[name]
  var slug = name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-').substring(0, 60)
  var { data: existing } = await supabase.from('companies').select('id').eq('slug', slug).single()
  if (existing) { companyCache[name] = existing.id; return existing.id }
  var { data: created } = await supabase.from('companies').insert({ name: name, slug: slug, claimed: false }).select('id').single()
  if (created) { companyCache[name] = created.id; return created.id }
  return null
}

// Track seen Adzuna IDs to avoid duplicate API calls to DB
var seenIds = new Set()

async function fetchAndStore(query, page) {
  var url = 'https://api.adzuna.com/v1/api/jobs/gb/search/' + page
    + '?app_id=' + ADZUNA_ID + '&app_key=' + ADZUNA_KEY
    + '&results_per_page=50&content-type=application/json'
    + '&max_days_old=' + MAX_DAYS

  if (query) url += '&what=' + encodeURIComponent(query)

  try {
    var res = await fetch(url)
    if (!res.ok) return { found: 0, added: 0 }
    var data = await res.json()
    var results = data.results || []

    var added = 0
    for (var i = 0; i < results.length; i++) {
      var job = results[i]
      var adzunaId = job.id ? String(job.id) : ''
      if (!adzunaId || seenIds.has(adzunaId)) continue
      seenIds.add(adzunaId)

      // Check DB for duplicate
      var { data: existing } = await supabase.from('jobs').select('id')
        .ilike('source_url', '%' + adzunaId + '%').single()
      if (existing) continue

      var title = job.title || ''
      var companyName = job.company?.display_name || 'Unknown'
      var location = (job.location?.display_name || 'UK').split(',')[0].trim()
      var salaryMin = Math.round(job.salary_min || 0)
      var salaryMax = Math.round(job.salary_max || salaryMin)

      // Skip suspicious salaries
      if (salaryMin > 0 && salaryMin < 10000) { salaryMin = 0; salaryMax = 0 }

      try {
        var companyId = await getOrCreateCompany(companyName)
        if (!companyId) continue

        var remote = 'On-site'
        var combined = (title + ' ' + (job.description || '')).toLowerCase()
        if (/\bremote\b/.test(combined)) remote = 'Remote'
        else if (/\bhybrid\b/.test(combined)) remote = 'Hybrid'

        await supabase.from('jobs').insert({
          title: title,
          slug: generateSlug(title, companyName),
          description: job.description || '',
          location: location,
          remote_policy: remote,
          job_type: job.contract_time === 'part_time' ? 'Part-time' : job.contract_type === 'contract' ? 'Contract' : 'Full-time',
          salary_min: salaryMin,
          salary_max: salaryMax,
          company_id: companyId,
          source: 'adzuna',
          source_url: 'https://www.adzuna.co.uk/jobs/land/ad/' + adzunaId,
          trust_score: salaryMin > 0 ? 30 : 0,
          has_challenge: false,
          active: true,
          posted_at: job.created || new Date().toISOString(),
        })
        added++
      } catch (err) { /* skip */ }
    }

    return { found: results.length, added: added }
  } catch(e) { return { found: 0, added: 0 } }
}

async function main() {
  var startTime = Date.now()
  console.log('=== MASS IMPORT ===')
  console.log('Searches: ' + SEARCHES.length + ' × ' + PAGES_PER_SEARCH + ' pages = ' + (SEARCHES.length * PAGES_PER_SEARCH) + ' API calls')
  console.log('Max days old: ' + MAX_DAYS)
  console.log('Started: ' + new Date().toISOString() + '\n')

  var totalNew = 0
  var totalSearched = 0

  for (var s = 0; s < SEARCHES.length; s++) {
    var query = SEARCHES[s]
    var searchNew = 0
    var searchFound = 0

    for (var p = 1; p <= PAGES_PER_SEARCH; p++) {
      var result = await fetchAndStore(query, p)
      searchFound += result.found
      searchNew += result.added
      totalSearched++

      // Stop pagination if no more results
      if (result.found < 50) break

      await new Promise(function(r) { setTimeout(r, 300) })
    }

    totalNew += searchNew
    var label = query || '(all jobs)'
    process.stdout.write('[' + (s+1) + '/' + SEARCHES.length + '] ' + label.padEnd(25) + searchFound + ' found, ' + searchNew + ' new')
    console.log(' | Total: ' + totalNew)

    // Rate limit
    await new Promise(function(r) { setTimeout(r, 500) })

    // Progress every 20 searches
    if ((s + 1) % 20 === 0) {
      var elapsed = Math.round((Date.now() - startTime) / 60000)
      var eta = Math.round(((SEARCHES.length - s) / (s + 1)) * elapsed)
      console.log('\n--- ' + totalNew + ' new jobs | ' + seenIds.size + ' unique seen | ' + elapsed + 'min elapsed | ~' + eta + 'min left ---\n')
    }
  }

  // Fix URLs
  console.log('\nFixing URL formats...')
  var { data: detailUrls } = await supabase.from('jobs')
    .select('id, source_url').eq('active', true)
    .ilike('source_url', '%/details/%')
  
  if (detailUrls && detailUrls.length > 0) {
    for (var i = 0; i < detailUrls.length; i++) {
      var match = detailUrls[i].source_url.match(/\/(\d+)/)
      if (match) {
        await supabase.from('jobs').update({ source_url: 'https://www.adzuna.co.uk/jobs/land/ad/' + match[1] }).eq('id', detailUrls[i].id)
      }
    }
    console.log('Fixed ' + detailUrls.length + ' URLs')
  }

  var { count: activeCount } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('active', true)

  var elapsed = Math.round((Date.now() - startTime) / 60000)
  console.log('\n=== IMPORT COMPLETE ===')
  console.log('New jobs added:     ' + totalNew)
  console.log('Unique IDs seen:    ' + seenIds.size)
  console.log('API calls made:     ' + totalSearched)
  console.log('Active jobs now:    ' + activeCount)
  console.log('Time:               ' + elapsed + ' min')
}

main().catch(console.error)
