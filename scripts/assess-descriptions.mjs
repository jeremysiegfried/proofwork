// Assess job description quality across all jobs
// Run: node scripts/assess-descriptions.mjs

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fovjkyqimtafpzdwtatp.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvdmpreXFpbXRhZnB6ZHd0YXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzQ5OTUsImV4cCI6MjA5MTQxMDk5NX0.qG50PxCyWTL9gyb8jlqjJsKQ6gJGULbOizqxezQTais'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function main() {
  console.log('Assessing all job descriptions...\n')

  var allJobs = []
  var offset = 0
  while (true) {
    var { data, error } = await supabase
      .from('jobs')
      .select('id, title, description, source_url, source, companies(name)')
      .eq('active', true)
      .range(offset, offset + 999)
    if (error || !data || data.length === 0) break
    allJobs = allJobs.concat(data)
    offset += 1000
    if (data.length < 1000) break
  }

  console.log('Total active jobs: ' + allJobs.length + '\n')

  var categories = {
    full_html: [],      // Has HTML tags, likely full description
    full_long: [],      // >1000 chars plain text, likely full
    medium: [],         // 500-1000 chars, partial
    short: [],          // 200-500 chars, truncated
    tiny: [],           // <200 chars, just a snippet
    empty: [],          // No description at all
  }

  for (var i = 0; i < allJobs.length; i++) {
    var job = allJobs[i]
    var desc = (job.description || '').trim()

    if (!desc || desc.length < 10) {
      categories.empty.push(job)
    } else if (/<[a-z][^>]*>/i.test(desc) && desc.length > 500) {
      categories.full_html.push(job)
    } else if (desc.length > 1000) {
      categories.full_long.push(job)
    } else if (desc.length > 500) {
      categories.medium.push(job)
    } else if (desc.length > 200) {
      categories.short.push(job)
    } else {
      categories.tiny.push(job)
    }
  }

  // Check for truncation markers
  var truncated = allJobs.filter(function(j) {
    var d = (j.description || '')
    return d.endsWith('…') || d.endsWith('...') || d.endsWith('busines…')
  })

  console.log('='.repeat(60))
  console.log('DESCRIPTION QUALITY BREAKDOWN')
  console.log('='.repeat(60))
  console.log('')
  console.log('Full (HTML, >500c):   ' + categories.full_html.length + ' (' + pct(categories.full_html.length, allJobs.length) + '%)')
  console.log('Full (plain, >1000c): ' + categories.full_long.length + ' (' + pct(categories.full_long.length, allJobs.length) + '%)')
  console.log('Medium (500-1000c):   ' + categories.medium.length + ' (' + pct(categories.medium.length, allJobs.length) + '%)')
  console.log('Short (200-500c):     ' + categories.short.length + ' (' + pct(categories.short.length, allJobs.length) + '%)')
  console.log('Tiny (<200c):         ' + categories.tiny.length + ' (' + pct(categories.tiny.length, allJobs.length) + '%)')
  console.log('Empty:                ' + categories.empty.length + ' (' + pct(categories.empty.length, allJobs.length) + '%)')
  console.log('')
  console.log('Ends with … or ...:  ' + truncated.length)
  console.log('')

  var needsEnrichment = categories.short.length + categories.tiny.length + categories.empty.length
  var goodEnough = categories.full_html.length + categories.full_long.length + categories.medium.length

  console.log('='.repeat(60))
  console.log('SUMMARY')
  console.log('='.repeat(60))
  console.log('')
  console.log('Good descriptions:    ' + goodEnough + ' (' + pct(goodEnough, allJobs.length) + '%) — no action needed')
  console.log('Needs enrichment:     ' + needsEnrichment + ' (' + pct(needsEnrichment, allJobs.length) + '%) — should re-crawl')
  console.log('')

  // Sample some that need enrichment
  console.log('='.repeat(60))
  console.log('SAMPLE SHORT DESCRIPTIONS (first 10)')
  console.log('='.repeat(60))
  console.log('')

  var shortSample = [...categories.short, ...categories.tiny].slice(0, 10)
  shortSample.forEach(function(job) {
    var desc = (job.description || '').substring(0, 120)
    var domain = ''
    try {
      if (job.source_url) domain = new URL(job.source_url).hostname.replace('www.', '')
    } catch(e) {}
    console.log(job.title + ' at ' + (job.companies?.name || '?'))
    console.log('  ' + desc + (desc.length >= 120 ? '...' : ''))
    console.log('  Length: ' + (job.description || '').length + ' chars | Source: ' + domain)
    console.log('')
  })

  // By source URL domain - which sources have good vs bad descriptions
  console.log('='.repeat(60))
  console.log('DESCRIPTION QUALITY BY SOURCE')
  console.log('='.repeat(60))
  console.log('')

  var bySource = {}
  allJobs.forEach(function(job) {
    var domain = 'unknown'
    try {
      if (job.source_url) domain = new URL(job.source_url).hostname.replace('www.', '')
    } catch(e) {}
    
    // Simplify domain
    if (domain.includes('adzuna')) domain = 'adzuna'
    else if (domain.includes('greenhouse')) domain = 'greenhouse'
    else if (domain.includes('lever')) domain = 'lever'

    if (!bySource[domain]) bySource[domain] = { total: 0, good: 0, bad: 0 }
    bySource[domain].total++
    
    var len = (job.description || '').length
    if (len > 500) bySource[domain].good++
    else bySource[domain].bad++
  })

  Object.entries(bySource)
    .sort(function(a, b) { return b[1].total - a[1].total })
    .slice(0, 10)
    .forEach(function(entry) {
      var d = entry[0]
      var s = entry[1]
      console.log(d.padEnd(30) + ' Total: ' + String(s.total).padStart(5) + ' | Good: ' + String(s.good).padStart(5) + ' (' + pct(s.good, s.total) + '%) | Bad: ' + String(s.bad).padStart(5))
    })
}

function pct(a, b) { return b > 0 ? Math.round(a / b * 100) : 0 }

main().catch(console.error)
