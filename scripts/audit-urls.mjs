// Audit all job source URLs - shows breakdown by platform/domain
// Run: node scripts/audit-urls.mjs

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fovjkyqimtafpzdwtatp.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvdmpreXFpbXRhZnB6ZHd0YXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzQ5OTUsImV4cCI6MjA5MTQxMDk5NX0.qG50PxCyWTL9gyb8jlqjJsKQ6gJGULbOizqxezQTais'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function main() {
  console.log('Fetching all active jobs...\n')

  var allJobs = []
  var offset = 0
  var batchSize = 1000

  while (true) {
    var { data, error } = await supabase
      .from('jobs')
      .select('id, title, source_url, source, companies(name)')
      .eq('active', true)
      .range(offset, offset + batchSize - 1)

    if (error) { console.error('Error:', error.message); break }
    if (!data || data.length === 0) break
    allJobs = allJobs.concat(data)
    offset += batchSize
    if (data.length < batchSize) break
  }

  console.log('Total active jobs: ' + allJobs.length + '\n')

  // Categorize by domain
  var categories = {}
  var empty = []
  var examples = {}

  for (var i = 0; i < allJobs.length; i++) {
    var job = allJobs[i]
    var url = (job.source_url || '').trim()

    if (!url || !url.startsWith('http')) {
      var cat = '(NO URL - Google fallback)'
      if (!categories[cat]) { categories[cat] = 0; examples[cat] = [] }
      categories[cat]++
      if (examples[cat].length < 3) examples[cat].push(job.title + ' at ' + (job.companies?.name || '?'))
      empty.push(job)
      continue
    }

    // Extract domain
    var domain
    try {
      var u = new URL(url)
      domain = u.hostname.replace('www.', '')
    } catch (e) {
      domain = '(INVALID URL)'
    }

    // Group by platform
    var platform
    if (domain.includes('adzuna')) platform = 'Adzuna (redirect)'
    else if (domain.includes('greenhouse')) platform = 'Greenhouse (ATS)'
    else if (domain.includes('lever.co')) platform = 'Lever (ATS)'
    else if (domain.includes('workday')) platform = 'Workday (ATS)'
    else if (domain.includes('smartrecruiters')) platform = 'SmartRecruiters (ATS)'
    else if (domain.includes('bamboohr')) platform = 'BambooHR (ATS)'
    else if (domain.includes('ashbyhq')) platform = 'Ashby (ATS)'
    else if (domain.includes('recruitee')) platform = 'Recruitee (ATS)'
    else if (domain.includes('breezy')) platform = 'Breezy (ATS)'
    else if (domain.includes('teamtailor')) platform = 'Teamtailor (ATS)'
    else if (domain.includes('workable')) platform = 'Workable (ATS)'
    else if (domain.includes('icims')) platform = 'iCIMS (ATS)'
    else if (domain.includes('taleo')) platform = 'Taleo (ATS)'
    else if (domain.includes('successfactors')) platform = 'SuccessFactors (ATS)'
    else if (domain.includes('applytojob')) platform = 'ApplyToJob (ATS)'
    else if (domain.includes('indeed')) platform = 'Indeed'
    else if (domain.includes('linkedin')) platform = 'LinkedIn'
    else if (domain.includes('reed.co.uk')) platform = 'Reed'
    else if (domain.includes('totaljobs')) platform = 'Totaljobs'
    else if (domain.includes('google.com/search')) platform = 'Google Search (fallback)'
    else platform = domain

    if (!categories[platform]) { categories[platform] = 0; examples[platform] = [] }
    categories[platform]++
    if (examples[platform].length < 3) examples[platform].push(job.title + ' at ' + (job.companies?.name || '?'))
  }

  // Sort by count descending
  var sorted = Object.entries(categories).sort(function(a, b) { return b[1] - a[1] })

  // Display results
  console.log('=' .repeat(70))
  console.log('SOURCE URL BREAKDOWN')
  console.log('='.repeat(70))
  console.log('')

  var maxLabelLen = 0
  sorted.forEach(function(s) { if (s[0].length > maxLabelLen) maxLabelLen = s[0].length })

  sorted.forEach(function(entry) {
    var platform = entry[0]
    var count = entry[1]
    var pct = ((count / allJobs.length) * 100).toFixed(1)
    var bar = '█'.repeat(Math.max(1, Math.round(count / allJobs.length * 50)))
    
    console.log(platform.padEnd(maxLabelLen + 2) + String(count).padStart(6) + '  (' + pct.padStart(5) + '%)  ' + bar)
    
    // Show examples
    if (examples[platform]) {
      examples[platform].forEach(function(ex) {
        console.log('  → ' + ex)
      })
    }
    console.log('')
  })

  // Summary
  console.log('='.repeat(70))
  console.log('SUMMARY')
  console.log('='.repeat(70))
  
  var adzunaCount = categories['Adzuna (redirect)'] || 0
  var noUrlCount = categories['(NO URL - Google fallback)'] || 0
  var directCount = allJobs.length - adzunaCount - noUrlCount
  
  console.log('Total jobs:          ' + allJobs.length)
  console.log('Adzuna redirects:    ' + adzunaCount + ' (users click through fine)')
  console.log('Direct employer URLs: ' + directCount + ' (from enrichment crawl)')
  console.log('No URL (fallback):   ' + noUrlCount + ' (shows Google search)')
  console.log('')

  if (noUrlCount > 0) {
    console.log('Jobs with no URL could be fixed by:')
    console.log('  1. Running restore-adzuna-urls.mjs (re-fetches from Adzuna API)')
    console.log('  2. Manually adding company careers URLs')
  }
}

main().catch(console.error)
