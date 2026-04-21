// Cleanup job data - fixes salaries, duplicates, company names, remote policy
// Run: node scripts/cleanup-jobs.mjs

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fovjkyqimtafpzdwtatp.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvdmpreXFpbXRhZnB6ZHd0YXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzQ5OTUsImV4cCI6MjA5MTQxMDk5NX0.qG50PxCyWTL9gyb8jlqjJsKQ6gJGULbOizqxezQTais'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function main() {
  console.log('=== SHOWJOB DATA CLEANUP ===\n')

  // 1. Fix suspicious salaries
  console.log('1. Fixing suspicious salaries...')
  var { data: lowSalary } = await supabase.from('jobs')
    .select('id, title, salary_min, salary_max')
    .eq('active', true)
    .lt('salary_min', 10000)
    .gt('salary_min', 0)

  var salaryFixed = 0
  if (lowSalary) {
    for (var i = 0; i < lowSalary.length; i++) {
      var job = lowSalary[i]
      // If salary looks like daily/hourly rate, try to convert
      if (job.salary_min < 1000) {
        // Likely a daily rate - multiply by 220 working days
        var annual = job.salary_min * 220
        if (annual > 15000 && annual < 200000) {
          await supabase.from('jobs').update({ salary_min: annual, salary_max: job.salary_max * 220 }).eq('id', job.id)
          salaryFixed++
        } else {
          // Just zero it out - clearly wrong
          await supabase.from('jobs').update({ salary_min: 0, salary_max: 0 }).eq('id', job.id)
          salaryFixed++
        }
      } else {
        // Between 1000-10000 - zero it out, not a real annual salary
        await supabase.from('jobs').update({ salary_min: 0, salary_max: 0 }).eq('id', job.id)
        salaryFixed++
      }
    }
  }
  console.log('   Fixed: ' + salaryFixed + ' suspicious salaries\n')

  // 2. Remove duplicate jobs (same title + same company, keep newest)
  console.log('2. Removing duplicate jobs...')
  var allJobs = []
  var offset = 0
  while (true) {
    var { data } = await supabase.from('jobs')
      .select('id, title, company_id, created_at')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + 999)
    if (!data || data.length === 0) break
    allJobs = allJobs.concat(data)
    offset += 1000
    if (data.length < 1000) break
  }

  var seen = {}
  var dupeIds = []
  allJobs.forEach(function(j) {
    var key = (j.title || '').toLowerCase().trim() + '|' + j.company_id
    if (seen[key]) {
      dupeIds.push(j.id) // This is the older one (sorted newest first)
    } else {
      seen[key] = true
    }
  })

  var deactivated = 0
  for (var i = 0; i < dupeIds.length; i += 50) {
    var batch = dupeIds.slice(i, i + 50)
    await supabase.from('jobs').update({ active: false }).in('id', batch)
    deactivated += batch.length
  }
  console.log('   Deactivated: ' + deactivated + ' duplicate jobs\n')

  // 3. Normalize remote policy
  console.log('3. Normalizing remote policy...')
  var { data: remoteOK } = await supabase.from('jobs')
    .update({ remote_policy: 'Remote' })
    .eq('active', true)
    .eq('remote_policy', 'Remote OK')
    .select('id')
  var { data: remoteOKUK } = await supabase.from('jobs')
    .update({ remote_policy: 'Remote' })
    .eq('active', true)
    .eq('remote_policy', 'Remote OK (UK)')
    .select('id')
  var remoteNormalized = (remoteOK ? remoteOK.length : 0) + (remoteOKUK ? remoteOKUK.length : 0)
  console.log('   Normalized: ' + remoteNormalized + ' remote policies\n')

  // 4. Remove jobs with no title
  console.log('4. Removing jobs with no title...')
  var { data: noTitle } = await supabase.from('jobs')
    .update({ active: false })
    .eq('active', true)
    .or('title.is.null,title.eq.')
    .select('id')
  console.log('   Removed: ' + (noTitle ? noTitle.length : 0) + '\n')

  // 5. Remove jobs with no URL
  console.log('5. Handling jobs with no apply URL...')
  var { data: noUrl } = await supabase.from('jobs')
    .update({ active: false })
    .eq('active', true)
    .or('source_url.is.null,source_url.eq.')
    .select('id')
  console.log('   Deactivated: ' + (noUrl ? noUrl.length : 0) + ' jobs with no URL\n')

  // 6. Merge duplicate companies (keep the one with more jobs)
  console.log('6. Identifying duplicate companies...')
  var { data: companies } = await supabase.from('companies').select('id, name, slug, claimed')
  
  var normalized = {}
  if (companies) {
    companies.forEach(function(c) {
      var key = c.name.toLowerCase()
        .replace(/\s*(limited|ltd|plc|inc|uk|group|holdings)\s*/gi, '')
        .replace(/\s+/g, ' ')
        .trim()
      if (!normalized[key]) normalized[key] = []
      normalized[key].push(c)
    })
  }

  var dupeGroups = Object.values(normalized).filter(function(group) { return group.length > 1 })
  console.log('   Found ' + dupeGroups.length + ' groups of duplicate companies')
  console.log('   (Not auto-merging — needs manual review)')
  console.log('   Top duplicates:')
  dupeGroups.slice(0, 10).forEach(function(group) {
    console.log('     ' + group.map(function(c) { return c.name }).join(' / '))
  })

  // Final count
  var { count: finalActive } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('active', true)
  
  console.log('\n=== CLEANUP COMPLETE ===')
  console.log('Salaries fixed:      ' + salaryFixed)
  console.log('Duplicates removed:  ' + deactivated)
  console.log('Remote normalized:   ' + remoteNormalized)
  console.log('Active jobs now:     ' + finalActive)
}

main().catch(console.error)
