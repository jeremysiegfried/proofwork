// Full audit of all job listings
// Run: node scripts/audit-jobs.mjs

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fovjkyqimtafpzdwtatp.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvdmpreXFpbXRhZnB6ZHd0YXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzQ5OTUsImV4cCI6MjA5MTQxMDk5NX0.qG50PxCyWTL9gyb8jlqjJsKQ6gJGULbOizqxezQTais'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

function section(title) { console.log('\n' + '='.repeat(60)); console.log(title); console.log('='.repeat(60) + '\n') }

async function main() {
  console.log('SHOWJOB FULL AUDIT')
  console.log('Run at: ' + new Date().toISOString() + '\n')

  var allJobs = []
  var offset = 0
  while (true) {
    var { data } = await supabase.from('jobs').select('id, title, slug, description, location, salary_min, salary_max, remote_policy, job_type, source_url, source, active, posted_at, created_at, trust_score, has_challenge, company_id, companies(name, slug, claimed)').range(offset, offset + 999)
    if (!data || data.length === 0) break
    allJobs = allJobs.concat(data)
    offset += 1000
    if (data.length < 1000) break
  }

  var active = allJobs.filter(function(j) { return j.active })
  var inactive = allJobs.filter(function(j) { return !j.active })

  section('OVERVIEW')
  console.log('Total jobs in DB:   ' + allJobs.length)
  console.log('Active:             ' + active.length)
  console.log('Inactive:           ' + inactive.length)

  // 1. URL FORMAT
  section('URL FORMAT')
  var landAd = 0, details = 0, noUrl = 0, directEmployer = 0, otherAdzuna = 0
  active.forEach(function(j) {
    var url = (j.source_url || '')
    if (!url || !url.startsWith('http')) noUrl++
    else if (url.includes('/land/ad/')) landAd++
    else if (url.includes('/details/')) details++
    else if (url.includes('adzuna')) otherAdzuna++
    else directEmployer++
  })
  console.log('land/ad (correct):      ' + landAd + ' ✓')
  console.log('details (shows Adzuna): ' + details + (details > 0 ? ' ✗ NEEDS FIX' : ' ✓'))
  console.log('Direct employer URL:    ' + directEmployer)
  console.log('Other Adzuna format:    ' + otherAdzuna)
  console.log('No URL:                 ' + noUrl)

  // 2. DESCRIPTION QUALITY
  section('DESCRIPTION QUALITY')
  var descEmpty = 0, descTiny = 0, descShort = 0, descMedium = 0, descGood = 0, descHTML = 0
  var truncated = 0
  active.forEach(function(j) {
    var d = (j.description || '')
    if (d.length < 10) descEmpty++
    else if (d.length < 200) descTiny++
    else if (d.length <= 550) { descShort++; if (d.endsWith('…') || d.endsWith('...')) truncated++ }
    else if (d.length <= 1000) descMedium++
    else { descGood++; if (/<[a-z]/i.test(d)) descHTML++ }
  })
  console.log('Full (>1000 chars):     ' + descGood + ' (' + Math.round(descGood/active.length*100) + '%)' + (descHTML > 0 ? ' (' + descHTML + ' HTML)' : ''))
  console.log('Medium (550-1000):      ' + descMedium)
  console.log('Short (200-550):        ' + descShort + ' (' + truncated + ' truncated with …)')
  console.log('Tiny (<200):            ' + descTiny)
  console.log('Empty:                  ' + descEmpty)

  // 3. SALARY DATA
  section('SALARY DATA')
  var withSalary = active.filter(function(j) { return j.salary_min > 0 })
  var noSalary = active.filter(function(j) { return !j.salary_min || j.salary_min === 0 })
  var salaries = withSalary.map(function(j) { return j.salary_min })
  salaries.sort(function(a, b) { return a - b })
  var median = salaries.length > 0 ? salaries[Math.floor(salaries.length / 2)] : 0
  var suspiciouslyLow = withSalary.filter(function(j) { return j.salary_min < 15000 })
  var suspiciouslyHigh = withSalary.filter(function(j) { return j.salary_min > 200000 })

  console.log('With salary:            ' + withSalary.length + ' (' + Math.round(withSalary.length/active.length*100) + '%)')
  console.log('No salary:              ' + noSalary.length)
  console.log('Median salary:          £' + Math.round(median/1000) + 'k')
  console.log('Suspiciously low (<15k): ' + suspiciouslyLow.length)
  if (suspiciouslyLow.length > 0) {
    suspiciouslyLow.slice(0, 3).forEach(function(j) { console.log('  £' + j.salary_min + ' - ' + j.title) })
  }
  console.log('Suspiciously high (>200k): ' + suspiciouslyHigh.length)
  if (suspiciouslyHigh.length > 0) {
    suspiciouslyHigh.slice(0, 3).forEach(function(j) { console.log('  £' + j.salary_min + ' - ' + j.title) })
  }

  // 4. LOCATION DATA
  section('LOCATION DATA')
  var locationCounts = {}
  active.forEach(function(j) {
    var loc = (j.location || 'Unknown').trim()
    locationCounts[loc] = (locationCounts[loc] || 0) + 1
  })
  var topLocations = Object.entries(locationCounts).sort(function(a, b) { return b[1] - a[1] }).slice(0, 15)
  topLocations.forEach(function(l) { console.log('  ' + l[0].padEnd(30) + l[1]) })
  var noLocation = active.filter(function(j) { return !j.location || j.location.trim() === '' })
  console.log('\nNo location: ' + noLocation.length)

  // 5. FRESHNESS
  section('FRESHNESS')
  var now = Date.now()
  var today = 0, thisWeek = 0, thisMonth = 0, older = 0, veryOld = 0
  active.forEach(function(j) {
    var posted = new Date(j.posted_at || j.created_at)
    var days = Math.floor((now - posted) / (1000 * 60 * 60 * 24))
    if (days <= 1) today++
    else if (days <= 7) thisWeek++
    else if (days <= 30) thisMonth++
    else if (days <= 60) older++
    else veryOld++
  })
  console.log('Today:          ' + today)
  console.log('This week:      ' + thisWeek)
  console.log('This month:     ' + thisMonth)
  console.log('30-60 days:     ' + older + (older > 0 ? ' ⚠ should deactivate' : ''))
  console.log('60+ days:       ' + veryOld + (veryOld > 0 ? ' ✗ STALE - deactivate!' : ''))

  // 6. DUPLICATE DETECTION
  section('POTENTIAL DUPLICATES')
  var titleCompany = {}
  var dupes = 0
  active.forEach(function(j) {
    var key = (j.title + '|' + (j.companies?.name || '')).toLowerCase()
    if (titleCompany[key]) dupes++
    else titleCompany[key] = j.id
  })
  console.log('Duplicate title+company combos: ' + dupes)

  // Duplicate companies
  var companyNames = {}
  active.forEach(function(j) {
    var name = (j.companies?.name || '').toLowerCase().replace(/\s*(ltd|limited|plc|inc|uk|group)\s*/gi, '').trim()
    if (!companyNames[name]) companyNames[name] = new Set()
    companyNames[name].add(j.companies?.name || '')
  })
  var dupeCompanies = Object.entries(companyNames).filter(function(e) { return e[1].size > 1 })
  console.log('Companies with similar names: ' + dupeCompanies.length)
  dupeCompanies.slice(0, 10).forEach(function(e) {
    console.log('  ' + Array.from(e[1]).join(' / '))
  })

  // 7. REMOTE POLICY
  section('REMOTE POLICY')
  var remoteCounts = {}
  active.forEach(function(j) {
    var rp = j.remote_policy || 'Unknown'
    remoteCounts[rp] = (remoteCounts[rp] || 0) + 1
  })
  Object.entries(remoteCounts).sort(function(a, b) { return b[1] - a[1] }).forEach(function(e) {
    console.log('  ' + e[0].padEnd(20) + e[1])
  })

  // 8. MISSING DATA
  section('MISSING / BROKEN DATA')
  var noTitle = active.filter(function(j) { return !j.title || j.title.trim().length < 3 })
  var noSlug = active.filter(function(j) { return !j.slug })
  var noCompany = active.filter(function(j) { return !j.companies || !j.companies.name })
  var noTrustScore = active.filter(function(j) { return j.trust_score === null || j.trust_score === undefined })

  console.log('No title:       ' + noTitle.length)
  console.log('No slug:        ' + noSlug.length)
  console.log('No company:     ' + noCompany.length)
  console.log('No trust score: ' + noTrustScore.length)

  // 9. CLAIMED COMPANIES
  section('CLAIMED COMPANIES')
  var claimed = new Set()
  active.forEach(function(j) { if (j.companies?.claimed) claimed.add(j.companies.name) })
  console.log('Claimed companies: ' + claimed.size)
  claimed.forEach(function(c) { console.log('  ✓ ' + c) })

  // 10. SUMMARY
  section('ACTION ITEMS')
  var issues = []
  if (details > 0) issues.push('Fix ' + details + ' "details" URLs → run: node scripts/fix-url-format.mjs --fix')
  if (veryOld > 0) issues.push('Deactivate ' + veryOld + ' jobs older than 60 days')
  if (older > 0) issues.push('Consider deactivating ' + older + ' jobs 30-60 days old')
  if (descShort > 500) issues.push(descShort + ' jobs have short descriptions (≤550 chars)')
  if (suspiciouslyLow.length > 10) issues.push(suspiciouslyLow.length + ' jobs with suspiciously low salary (<£15k)')
  if (dupeCompanies.length > 5) issues.push(dupeCompanies.length + ' companies with duplicate names')
  if (noUrl > 5) issues.push(noUrl + ' jobs with no apply URL')
  if (claimed.size < 3) issues.push('Only ' + claimed.size + ' claimed companies — need employer outreach')

  if (issues.length === 0) {
    console.log('✓ No critical issues found!')
  } else {
    issues.forEach(function(issue, i) { console.log((i + 1) + '. ' + issue) })
  }
}

main().catch(console.error)
