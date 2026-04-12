// Check if all required database tables exist and have data
// Run: node scripts/db-health-check.mjs

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fovjkyqimtafpzdwtatp.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvdmpreXFpbXRhZnB6ZHd0YXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzQ5OTUsImV4cCI6MjA5MTQxMDk5NX0.qG50PxCyWTL9gyb8jlqjJsKQ6gJGULbOizqxezQTais'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

var tables = [
  { name: 'jobs', required: true, minRows: 1000 },
  { name: 'companies', required: true, minRows: 100 },
  { name: 'profiles', required: true, minRows: 0 },
  { name: 'candidate_profiles', required: true, minRows: 0 },
  { name: 'applications', required: true, minRows: 0 },
  { name: 'saved_jobs', required: true, minRows: 0 },
  { name: 'assessments', required: true, minRows: 0 },
  { name: 'assessment_attempts', required: true, minRows: 0 },
]

async function main() {
  console.log('='.repeat(60))
  console.log('DATABASE HEALTH CHECK')
  console.log('='.repeat(60))
  console.log('')

  var allGood = true

  for (var i = 0; i < tables.length; i++) {
    var t = tables[i]
    try {
      var { count, error } = await supabase.from(t.name).select('*', { count: 'exact', head: true })
      
      if (error) {
        console.log('✗ ' + t.name.padEnd(25) + 'ERROR: ' + error.message)
        if (error.message.includes('does not exist') || error.code === '42P01') {
          console.log('  → TABLE MISSING! Run the corresponding schema SQL in Supabase.')
        }
        allGood = false
      } else {
        var status = count >= t.minRows ? '✓' : '⚠'
        if (count < t.minRows && t.minRows > 0) allGood = false
        console.log(status + ' ' + t.name.padEnd(25) + String(count).padStart(6) + ' rows' + (count < t.minRows ? '  (expected ' + t.minRows + '+)' : ''))
      }
    } catch (err) {
      console.log('✗ ' + t.name.padEnd(25) + 'FAILED: ' + err.message)
      allGood = false
    }
  }

  // Check specific data quality
  console.log('\n' + '='.repeat(60))
  console.log('DATA QUALITY')
  console.log('='.repeat(60))
  console.log('')

  // Active jobs
  var { count: activeJobs } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('active', true)
  console.log('Active jobs:        ' + activeJobs)

  // Jobs with salary
  var { count: withSalary } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('active', true).gt('salary_min', 0)
  console.log('With salary:        ' + withSalary + ' (' + Math.round(withSalary / activeJobs * 100) + '%)')

  // Jobs with descriptions
  var { data: descCheck } = await supabase.from('jobs').select('id, description').eq('active', true).not('description', 'is', null).limit(1)
  var hasDescs = descCheck && descCheck.length > 0 && descCheck[0].description?.length > 100
  console.log('Has descriptions:   ' + (hasDescs ? '✓ Yes' : '⚠ Descriptions may be missing'))

  // Jobs with source URLs
  var { count: withUrl } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('active', true).neq('source_url', '')
  console.log('With apply URL:     ' + withUrl + ' (' + Math.round(withUrl / activeJobs * 100) + '%)')

  // Claimed companies
  var { count: claimed } = await supabase.from('companies').select('*', { count: 'exact', head: true }).eq('claimed', true)
  console.log('Claimed companies:  ' + claimed)

  // Jobs with challenges
  var { count: withChallenge } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('has_challenge', true)
  console.log('Jobs w/ challenge:  ' + withChallenge)

  console.log('\n' + '='.repeat(60))
  console.log(allGood ? '✓ ALL TABLES PRESENT' : '⚠ SOME TABLES MISSING — see errors above')
  console.log('='.repeat(60))

  if (!allGood) {
    console.log('\nTo fix missing tables, run these SQL files in Supabase SQL Editor:')
    console.log('  1. applications-schema.sql')
    console.log('  2. saved-jobs-schema.sql')
    console.log('  3. assessment-schema.sql')
    console.log('  4. subscription-schema.sql')
  }
}

main().catch(console.error)
