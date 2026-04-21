// Enhance all short job descriptions using Claude
// Reads ANTHROPIC_API_KEY from .env.local
// Run: node scripts/enhance-jobs.mjs

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Read .env.local for API key
var envFile = ''
try { envFile = readFileSync('.env.local', 'utf8') } catch(e) {}
var keyMatch = envFile.match(/ANTHROPIC_API_KEY=(.+)/)
var ANTHROPIC_KEY = keyMatch ? keyMatch[1].trim() : ''

if (!ANTHROPIC_KEY) {
  console.error('ERROR: No ANTHROPIC_API_KEY found in .env.local')
  console.error('Add it: echo ANTHROPIC_API_KEY=sk-ant-... >> .env.local')
  process.exit(1)
}

const SUPABASE_URL = 'https://fovjkyqimtafpzdwtatp.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvdmpreXFpbXRhZnB6ZHd0YXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzQ5OTUsImV4cCI6MjA5MTQxMDk5NX0.qG50PxCyWTL9gyb8jlqjJsKQ6gJGULbOizqxezQTais'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function callClaude(prompt) {
  for (var attempt = 0; attempt < 5; attempt++) {
    try {
      var res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1500,
          messages: [{ role: 'user', content: prompt }]
        })
      })
      if (res.status === 429 || res.status === 529) {
        var wait = 30 + (attempt * 30)
        process.stdout.write(' [wait ' + wait + 's]')
        await new Promise(function(r) { setTimeout(r, wait * 1000) })
        continue
      }
      if (!res.ok) throw new Error('API ' + res.status)
      var data = await res.json()
      return data.content?.[0]?.text || ''
    } catch (err) {
      if (attempt === 4) throw err
      await new Promise(function(r) { setTimeout(r, 15000) })
    }
  }
}

async function main() {
  console.log('API key found ✓')
  console.log('Fetching all jobs...\n')

  var allJobs = []
  var offset = 0
  while (true) {
    var { data, error } = await supabase
      .from('jobs')
      .select('id, title, description, location, remote_policy, job_type, salary_min, salary_max, tags, companies(name)')
      .eq('active', true)
      .range(offset, offset + 999)
    if (error || !data || data.length === 0) break
    allJobs = allJobs.concat(data)
    offset += 1000
    if (data.length < 1000) break
  }

  var jobs = allJobs.filter(function(j) {
    var d = (j.description || '')
    return d.length >= 100 && d.length <= 550
  })

  console.log('Total: ' + allJobs.length + ' | Need enhancement: ' + jobs.length)
  console.log('Est cost: ~$' + Math.round(jobs.length * 0.005) + ' | Est time: ~' + Math.round(jobs.length * 4 / 60) + ' min\n')

  var enhanced = 0, failed = 0
  var start = Date.now()

  for (var i = 0; i < jobs.length; i++) {
    var job = jobs[i]
    var company = job.companies?.name || 'company'
    var salary = job.salary_min > 0 ? '£' + Math.round(job.salary_min/1000) + 'k-£' + Math.round(job.salary_max/1000) + 'k' : 'Not disclosed'
    var tags = (job.tags || []).join(', ')

    process.stdout.write('[' + (i+1) + '/' + jobs.length + '] ' + job.title.substring(0, 40).padEnd(42))

    try {
      var prompt = 'Reformat this truncated job listing into a clean structured description. Use ONLY info from the snippet - do NOT invent details. Use ALL CAPS section headers with colons. Use dashes for bullet points. Complete any cut-off sentence naturally.\n\nJOB: ' + job.title + '\nCOMPANY: ' + company + '\nLOCATION: ' + (job.location || 'UK') + '\nSALARY: ' + salary + '\nTYPE: ' + (job.job_type || 'Full-time') + ' | ' + (job.remote_policy || '') + (tags ? '\nSKILLS: ' + tags : '') + '\n\nORIGINAL:\n' + job.description + '\n\nReformat:'

      var result = await callClaude(prompt)

      if (result && result.length > 100) {
        await supabase.from('jobs').update({ description: result }).eq('id', job.id)
        console.log(' ✓ ' + job.description.length + '→' + result.length)
        enhanced++
      } else {
        console.log(' ~ skip')
        failed++
      }
    } catch (err) {
      console.log(' ✗ ' + err.message.substring(0, 40))
      failed++
    }

    await new Promise(function(r) { setTimeout(r, 3500) })

    if ((i+1) % 100 === 0) {
      var mins = Math.round((Date.now() - start) / 60000)
      var eta = Math.round(((jobs.length - i) / (i+1)) * mins)
      console.log('\n=== ' + enhanced + ' done | ' + mins + 'min elapsed | ~' + eta + 'min left ===\n')
    }
  }

  console.log('\n=== COMPLETE ===')
  console.log('Enhanced: ' + enhanced + ' | Failed: ' + failed)
  console.log('Time: ' + Math.round((Date.now() - start) / 60000) + ' min')
}

main().catch(console.error)
