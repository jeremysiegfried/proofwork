// Re-fetch Adzuna redirect URLs for jobs that got cleared
// Run: node scripts/restore-adzuna-urls.mjs

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fovjkyqimtafpzdwtatp.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvdmpreXFpbXRhZnB6ZHd0YXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzQ5OTUsImV4cCI6MjA5MTQxMDk5NX0.qG50PxCyWTL9gyb8jlqjJsKQ6gJGULbOizqxezQTais'
const ADZUNA_ID = '83de6425'
const ADZUNA_KEY = 'e032d7f124131b52ee21f480e89a3c41'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function searchAdzuna(title, company) {
  var query = encodeURIComponent(title)
  var url = 'https://api.adzuna.com/v1/api/jobs/gb/search/1?app_id=' + ADZUNA_ID + '&app_key=' + ADZUNA_KEY + '&results_per_page=5&what=' + query + '&content-type=application/json'
  
  try {
    var res = await fetch(url)
    if (!res.ok) return null
    var data = await res.json()
    
    if (!data.results || data.results.length === 0) return null
    
    // Try to find exact match by title and company
    var companyLower = (company || '').toLowerCase()
    for (var i = 0; i < data.results.length; i++) {
      var job = data.results[i]
      var jobCompany = (job.company?.display_name || '').toLowerCase()
      if (jobCompany.includes(companyLower) || companyLower.includes(jobCompany)) {
        return job.redirect_url || null
      }
    }
    
    // If no exact company match, return first result if title is close
    var titleLower = title.toLowerCase()
    for (var i = 0; i < data.results.length; i++) {
      if (data.results[i].title.toLowerCase() === titleLower) {
        return data.results[i].redirect_url || null
      }
    }
    
    return null
  } catch (err) {
    console.error('  API error:', err.message)
    return null
  }
}

async function main() {
  // Find jobs with empty source_url (cleared by the crawl script)
  var { data: clearedJobs, error } = await supabase
    .from('jobs')
    .select('id, title, companies(name)')
    .eq('active', true)
    .eq('source_url', '')
  
  if (error) {
    console.error('Query error:', error.message)
    return
  }

  console.log('Found ' + clearedJobs.length + ' jobs with empty source_url')
  
  var restored = 0
  var notFound = 0

  for (var i = 0; i < clearedJobs.length; i++) {
    var job = clearedJobs[i]
    var companyName = job.companies?.name || ''
    
    console.log('[' + (i+1) + '/' + clearedJobs.length + '] Searching: ' + job.title + ' at ' + companyName)
    
    var redirectUrl = await searchAdzuna(job.title, companyName)
    
    if (redirectUrl) {
      await supabase.from('jobs').update({ source_url: redirectUrl }).eq('id', job.id)
      console.log('  ✓ Restored: ' + redirectUrl.substring(0, 70))
      restored++
    } else {
      console.log('  ✗ Not found on Adzuna')
      notFound++
    }
    
    // Rate limit - don't hammer the API
    await new Promise(function(r) { setTimeout(r, 500) })
  }

  console.log('\n=== DONE ===')
  console.log('Restored: ' + restored)
  console.log('Not found: ' + notFound)
}

main().catch(console.error)
