// Validate job quality - samples jobs across categories
// Checks descriptions, URLs, data completeness
// Run: node scripts/validate-jobs.mjs

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fovjkyqimtafpzdwtatp.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvdmpreXFpbXRhZnB6ZHd0YXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzQ5OTUsImV4cCI6MjA5MTQxMDk5NX0.qG50PxCyWTL9gyb8jlqjJsKQ6gJGULbOizqxezQTais'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function testUrl(url) {
  try {
    var res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0' }
    })
    return { status: res.status, finalUrl: res.url, ok: res.status < 400 }
  } catch(e) {
    return { status: 0, error: e.message.substring(0, 40), ok: false }
  }
}

async function main() {
  console.log('=== JOB VALIDATION ===\n')

  // Get a diverse sample
  var samples = []

  // Sample by location
  var locations = ['London', 'Manchester', 'Birmingham', 'Edinburgh', 'Bristol', 'Leeds', 'Glasgow', 'Belfast', 'UK']
  for (var l = 0; l < locations.length; l++) {
    var { data } = await supabase.from('jobs')
      .select('id, title, description, location, salary_min, salary_max, source_url, remote_policy, companies(name)')
      .eq('active', true).ilike('location', '%' + locations[l] + '%')
      .limit(10)
    if (data) samples = samples.concat(data)
  }

  // Sample by job type
  var types = ['engineer', 'manager', 'analyst', 'designer', 'nurse', 'teacher', 'sales', 'accountant', 'chef', 'driver']
  for (var t = 0; t < types.length; t++) {
    var { data } = await supabase.from('jobs')
      .select('id, title, description, location, salary_min, salary_max, source_url, remote_policy, companies(name)')
      .eq('active', true).ilike('title', '%' + types[t] + '%')
      .limit(10)
    if (data) samples = samples.concat(data)
  }

  // Deduplicate
  var seen = new Set()
  samples = samples.filter(function(j) { if (seen.has(j.id)) return false; seen.add(j.id); return true })

  console.log('Validating ' + samples.length + ' sampled jobs...\n')

  // DESCRIPTION CHECKS
  console.log('--- DESCRIPTION QUALITY ---\n')
  var descIssues = { empty: [], garbled: [], tooShort: [], good: 0 }

  samples.forEach(function(j) {
    var d = (j.description || '')
    if (d.length < 50) {
      descIssues.empty.push(j.title + ' at ' + (j.companies?.name || '?'))
    } else if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(d) || /\\x[0-9a-f]{2}/i.test(d)) {
      descIssues.garbled.push(j.title + ': ' + d.substring(0, 60))
    } else if (d.length < 200) {
      descIssues.tooShort.push(j.title + ' (' + d.length + ' chars)')
    } else {
      descIssues.good++
    }
  })

  console.log('Good descriptions: ' + descIssues.good + '/' + samples.length)
  if (descIssues.empty.length > 0) { console.log('\nEmpty/missing:'); descIssues.empty.forEach(function(e) { console.log('  ✗ ' + e) }) }
  if (descIssues.garbled.length > 0) { console.log('\nGarbled text:'); descIssues.garbled.forEach(function(e) { console.log('  ✗ ' + e) }) }
  if (descIssues.tooShort.length > 0 && descIssues.tooShort.length < 20) { console.log('\nVery short:'); descIssues.tooShort.forEach(function(e) { console.log('  ⚠ ' + e) }) }

  // URL SPOT CHECK (test 30 random URLs)
  console.log('\n--- URL SPOT CHECK (30 random) ---\n')
  var urlSample = samples.sort(function() { return Math.random() - 0.5 }).slice(0, 30)
  var urlOk = 0, urlFail = 0, urlSlow = 0

  for (var i = 0; i < urlSample.length; i++) {
    var j = urlSample[i]
    process.stdout.write('[' + (i+1) + '/30] ' + j.title.substring(0, 35).padEnd(37))
    var result = await testUrl(j.source_url)
    if (result.ok) {
      var domain = ''
      try { domain = new URL(result.finalUrl).hostname.replace('www.', '').substring(0, 25) } catch(e) {}
      var landedOnAdzuna = result.finalUrl && result.finalUrl.includes('adzuna')
      if (landedOnAdzuna) {
        console.log('⚠ landed on Adzuna')
        urlSlow++
      } else {
        console.log('✓ → ' + domain)
        urlOk++
      }
    } else {
      console.log('✗ ' + (result.error || result.status))
      urlFail++
    }
    await new Promise(function(r) { setTimeout(r, 1000) })
  }

  console.log('\nURLs OK: ' + urlOk + ' | Landed on Adzuna: ' + urlSlow + ' | Failed: ' + urlFail)

  // SALARY SANITY CHECK
  console.log('\n--- SALARY SANITY CHECK ---\n')
  var salaryIssues = []
  samples.forEach(function(j) {
    if (j.salary_min > 0) {
      if (j.salary_min > j.salary_max && j.salary_max > 0) {
        salaryIssues.push('Min > Max: ' + j.title + ' £' + j.salary_min + ' > £' + j.salary_max)
      }
      if (j.salary_max > 0 && j.salary_max > j.salary_min * 3) {
        salaryIssues.push('Huge range: ' + j.title + ' £' + j.salary_min + '-£' + j.salary_max)
      }
    }
  })
  if (salaryIssues.length === 0) console.log('✓ No salary issues found')
  else salaryIssues.forEach(function(s) { console.log('  ⚠ ' + s) })

  // JOB CATEGORY DISTRIBUTION
  console.log('\n--- JOB CATEGORY DISTRIBUTION (all active) ---\n')
  var categories = {
    'Tech/Engineering': 'software,developer,engineer,devops,cloud,architect,data,frontend,backend',
    'Sales/Commercial': 'sales,account executive,business development,bdm,commercial',
    'Marketing': 'marketing,seo,content,social media,copywriter,pr,brand',
    'Finance': 'finance,accountant,auditor,treasury,financial,banking',
    'HR/Recruitment': 'hr,recruiter,talent,people,human resources',
    'Healthcare': 'nurse,doctor,clinical,medical,healthcare,therapist,nhs',
    'Education': 'teacher,lecturer,tutor,education,training,school',
    'Legal': 'lawyer,solicitor,paralegal,legal,barrister',
    'Construction': 'construction,builder,plumber,electrician,site manager,surveyor',
    'Hospitality': 'chef,catering,hotel,restaurant,bar,hospitality',
    'Retail': 'retail,store,shop,merchandising,cashier',
    'Admin/Office': 'administrator,receptionist,office,secretary,pa ,assistant',
    'Logistics': 'warehouse,driver,logistics,delivery,courier,forklift',
    'Customer Service': 'customer service,support,call centre,helpdesk',
  }

  for (var cat in categories) {
    var keywords = categories[cat].split(',')
    var catClauses = keywords.map(function(k) { return 'title.ilike.%' + k.trim() + '%' }).join(',')
    var { count } = await supabase.from('jobs').select('*', { count: 'exact', head: true })
      .eq('active', true).or(catClauses)
    console.log('  ' + cat.padEnd(25) + (count || 0))
  }

  console.log('\n=== VALIDATION COMPLETE ===')
}

main().catch(console.error)
