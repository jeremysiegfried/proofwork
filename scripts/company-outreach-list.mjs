// List all companies sorted by job count, with website info for outreach
// Run: node scripts/company-outreach-list.mjs

import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'

const SUPABASE_URL = 'https://fovjkyqimtafpzdwtatp.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvdmpreXFpbXRhZnB6ZHd0YXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzQ5OTUsImV4cCI6MjA5MTQxMDk5NX0.qG50PxCyWTL9gyb8jlqjJsKQ6gJGULbOizqxezQTais'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function main() {
  console.log('Fetching all companies with job counts...\n')

  // Get all companies
  var allCompanies = []
  var offset = 0
  while (true) {
    var { data, error } = await supabase
      .from('companies')
      .select('id, name, slug, website, careers_url, claimed, employee_count')
      .range(offset, offset + 999)
    if (error || !data || data.length === 0) break
    allCompanies = allCompanies.concat(data)
    offset += 1000
    if (data.length < 1000) break
  }

  // Get job counts per company
  var { data: jobs } = await supabase
    .from('jobs')
    .select('company_id')
    .eq('active', true)

  var jobCounts = {}
  if (jobs) {
    jobs.forEach(function(j) {
      jobCounts[j.company_id] = (jobCounts[j.company_id] || 0) + 1
    })
  }

  // Merge and sort
  var companies = allCompanies.map(function(c) {
    return {
      name: c.name,
      slug: c.slug,
      jobs: jobCounts[c.id] || 0,
      website: c.website || '',
      careers_url: c.careers_url || '',
      claimed: c.claimed,
      employees: c.employee_count || '',
    }
  })

  companies.sort(function(a, b) { return b.jobs - a.jobs })

  // Stats
  var totalCompanies = companies.length
  var withWebsite = companies.filter(function(c) { return c.website }).length
  var withCareers = companies.filter(function(c) { return c.careers_url }).length
  var claimed = companies.filter(function(c) { return c.claimed }).length
  var multiJob = companies.filter(function(c) { return c.jobs >= 3 }).length

  console.log('='.repeat(70))
  console.log('COMPANY OUTREACH REPORT')
  console.log('='.repeat(70))
  console.log('')
  console.log('Total companies:        ' + totalCompanies)
  console.log('Already claimed:        ' + claimed)
  console.log('Have website URL:       ' + withWebsite)
  console.log('Have careers URL:       ' + withCareers)
  console.log('With 3+ jobs (targets): ' + multiJob)
  console.log('')

  // Top 50 by job count
  console.log('='.repeat(70))
  console.log('TOP 50 COMPANIES BY JOB COUNT (best outreach targets)')
  console.log('='.repeat(70))
  console.log('')

  var top = companies.slice(0, 50)
  top.forEach(function(c, i) {
    var status = c.claimed ? '✓ CLAIMED' : '  UNCLAIMED'
    var web = c.website ? c.website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] : '(no website)'
    console.log(
      String(i + 1).padStart(3) + '. ' +
      c.name.padEnd(40).substring(0, 40) + ' ' +
      String(c.jobs).padStart(4) + ' jobs  ' +
      status.padEnd(12) + ' ' +
      web
    )
  })

  // Tier breakdown
  console.log('')
  console.log('='.repeat(70))
  console.log('OUTREACH TIERS')
  console.log('='.repeat(70))

  var tiers = [
    { label: 'Tier 1 (10+ jobs)', min: 10, companies: [] },
    { label: 'Tier 2 (5-9 jobs)', min: 5, max: 9, companies: [] },
    { label: 'Tier 3 (3-4 jobs)', min: 3, max: 4, companies: [] },
    { label: 'Tier 4 (2 jobs)', min: 2, max: 2, companies: [] },
    { label: 'Tier 5 (1 job)', min: 1, max: 1, companies: [] },
  ]

  companies.forEach(function(c) {
    if (c.claimed) return
    if (c.jobs >= 10) tiers[0].companies.push(c)
    else if (c.jobs >= 5) tiers[1].companies.push(c)
    else if (c.jobs >= 3) tiers[2].companies.push(c)
    else if (c.jobs >= 2) tiers[3].companies.push(c)
    else if (c.jobs >= 1) tiers[4].companies.push(c)
  })

  console.log('')
  tiers.forEach(function(tier) {
    var withWeb = tier.companies.filter(function(c) { return c.website }).length
    console.log(tier.label + ': ' + tier.companies.length + ' companies (' + withWeb + ' have websites)')
  })

  // Export CSV for email outreach
  var csvLines = ['Company,Jobs,Website,Careers URL,Claimed,Slug,ShowJob URL']
  companies.filter(function(c) { return c.jobs >= 2 && !c.claimed }).forEach(function(c) {
    csvLines.push([
      '"' + c.name.replace(/"/g, '""') + '"',
      c.jobs,
      c.website,
      c.careers_url,
      c.claimed ? 'Yes' : 'No',
      c.slug,
      'https://proofwork-nine.vercel.app/companies/' + c.slug
    ].join(','))
  })

  writeFileSync('outreach-targets.csv', csvLines.join('\n'))
  console.log('\n✓ Exported outreach-targets.csv (' + (csvLines.length - 1) + ' companies with 2+ jobs)')
  console.log('  Open in Excel to sort and filter')
}

main().catch(console.error)
