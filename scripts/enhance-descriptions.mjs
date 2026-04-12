// Enhance short job descriptions using Claude API
// Takes the 500-char Adzuna snippet and restructures it into a proper formatted description
// Run: node scripts/enhance-descriptions.mjs [--offset 0] [--limit 50]

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fovjkyqimtafpzdwtatp.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvdmpreXFpbXRhZnB6ZHd0YXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzQ5OTUsImV4cCI6MjA5MTQxMDk5NX0.qG50PxCyWTL9gyb8jlqjJsKQ6gJGULbOizqxezQTais'
const ANTHROPIC_KEY = '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'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

var args = process.argv.slice(2)
var OFFSET = 0
var LIMIT = 50

for (var i = 0; i < args.length; i++) {
  if (args[i] === '--offset' && args[i+1]) OFFSET = parseInt(args[i+1])
  if (args[i] === '--limit' && args[i+1]) LIMIT = parseInt(args[i+1])
}

async function enhanceDescription(job) {
  var companyName = job.companies?.name || 'the company'
  var salary = job.salary_min > 0 ? '£' + Math.round(job.salary_min/1000) + 'k-£' + Math.round(job.salary_max/1000) + 'k' : 'Not disclosed'
  var tags = (job.tags || []).join(', ')

  var prompt = `You are reformatting a truncated job listing into a clean, well-structured description. 

RULES:
- Use ONLY information from the original snippet below. Do NOT invent responsibilities, requirements, or benefits that aren't mentioned or clearly implied.
- Restructure and format the text with clear sections and bullet points.
- If the snippet mentions responsibilities, list them as bullets.
- If skills/requirements are mentioned, list them.
- If benefits are mentioned, list them.
- If the text is clearly cut off mid-sentence, complete that one sentence naturally but add nothing more.
- Keep the tone professional and matching the original.
- Do NOT add generic filler like "competitive salary" or "great team" unless the original says it.
- Output clean plain text with section headers in ALL CAPS followed by a colon.

JOB TITLE: ${job.title}
COMPANY: ${companyName}
LOCATION: ${job.location || 'UK'}
SALARY: ${salary}
TYPE: ${job.job_type || 'Full-time'}
REMOTE: ${job.remote_policy || 'Not specified'}
${tags ? 'TAGS: ' + tags : ''}

ORIGINAL SNIPPET (may be truncated):
${job.description}

Now reformat this into a clean job description. Only use facts from the snippet above.`

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

  if (!res.ok) {
    var errText = await res.text()
    throw new Error('API error: ' + res.status + ' ' + errText.substring(0, 100))
  }

  var data = await res.json()
  return data.content?.[0]?.text || ''
}

async function main() {
  console.log('Fetching jobs with short descriptions...\n')

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

  // Filter to short descriptions
  var needsEnhancement = allJobs.filter(function(j) {
    var desc = (j.description || '')
    return desc.length > 50 && desc.length <= 550
  })

  console.log('Total jobs: ' + allJobs.length)
  console.log('Need enhancement: ' + needsEnhancement.length)
  console.log('Processing: offset=' + OFFSET + ' limit=' + LIMIT + '\n')

  var jobs = needsEnhancement.slice(OFFSET, OFFSET + LIMIT)
  if (jobs.length === 0) { console.log('Nothing to process.'); return }

  var enhanced = 0
  var failed = 0

  for (var i = 0; i < jobs.length; i++) {
    var job = jobs[i]

    try {
      var newDesc = await enhanceDescription(job)

      if (newDesc && newDesc.length > job.description.length) {
        await supabase.from('jobs').update({
          description: newDesc
        }).eq('id', job.id)

        console.log('✓ ' + job.title.substring(0, 50).padEnd(52) + job.description.length + ' → ' + newDesc.length + ' chars')
        enhanced++
      } else {
        console.log('~ ' + job.title.substring(0, 50).padEnd(52) + 'no improvement')
        failed++
      }
    } catch (err) {
      console.log('✗ ' + job.title.substring(0, 50).padEnd(52) + err.message.substring(0, 60))
      failed++

      // Rate limit handling
      if (err.message.includes('429') || err.message.includes('rate')) {
        console.log('  Rate limited. Waiting 60 seconds...')
        await new Promise(function(r) { setTimeout(r, 60000) })
      }
    }

    // Small delay between API calls
    await new Promise(function(r) { setTimeout(r, 1000) })

    if ((i + 1) % 10 === 0) {
      console.log('[' + (i + 1) + '/' + jobs.length + '] Enhanced: ' + enhanced + ' | Failed: ' + failed)
    }
  }

  console.log('\n=== DONE ===')
  console.log('Enhanced: ' + enhanced)
  console.log('Failed: ' + failed)
  
  if (OFFSET + LIMIT < needsEnhancement.length) {
    console.log('\nNext batch: node scripts/enhance-descriptions.mjs --offset ' + (OFFSET + LIMIT) + ' --limit ' + LIMIT)
  } else {
    console.log('\nAll done! Run the assessment script to check: node scripts/assess-descriptions.mjs')
  }
}

main().catch(console.error)
