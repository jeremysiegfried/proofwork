// ProofWork Scraper v4 — All UK Jobs
// node scripts/scrape.mjs

import { createClient } from '@supabase/supabase-js'
const supabase = createClient(
  'https://fovjkyqimtafpzdwtatp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvdmpreXFpbXRhZnB6ZHd0YXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzQ5OTUsImV4cCI6MjA5MTQxMDk5NX0.qG50PxCyWTL9gyb8jlqjJsKQ6gJGULbOizqxezQTais'
)

const AZ_ID = '83de6425', AZ_KEY = 'e032d7f124131b52ee21f480e89a3c41'

const SEARCHES = [
  'software engineer','frontend developer','backend developer','full stack developer',
  'devops engineer','data scientist','data analyst','data engineer',
  'machine learning','cloud engineer','security engineer',
  'mobile developer','ios developer','android developer',
  'qa engineer','solutions architect','technical lead','engineering manager',
  'product manager','product designer','UX designer','UI designer',
  'sales manager','account manager','business development','account executive',
  'sales director','commercial manager','partnerships manager',
  'marketing manager','digital marketing','content manager','SEO specialist',
  'social media manager','brand manager','growth manager',
  'communications manager','copywriter','PR manager',
  'financial analyst','accountant','finance manager',
  'finance director','management accountant',
  'operations manager','project manager','programme manager',
  'supply chain manager','logistics manager','procurement manager',
  'HR manager','recruiter','talent acquisition','people manager',
  'learning development','HR business partner',
  'customer success manager','customer service manager',
  'office manager','executive assistant','analyst','consultant',
  'strategy manager','chief of staff',
  'nurse','teacher','lawyer','solicitor','paralegal',
  'graphic designer','video editor','photographer',
  'warehouse manager','retail manager','store manager',
]

const SKILLS = ['python','javascript','typescript','react','node.js','go','java','kotlin','swift','rust','c++','c#','.net','ruby','php','sql','mongodb','postgresql','redis','graphql','aws','azure','gcp','docker','kubernetes','terraform','ci/cd','git','vue','angular','django','flask','spring','pytorch','tensorflow','spark','kafka','figma','agile','scrum','jira','salesforce','hubspot','seo','excel','power bi','tableau','looker','snowflake','sap','workday','photoshop','google ads','mailchimp']

function extractTags(text) {
  if (!text) return []
  const l = text.toLowerCase()
  return [...new Set(SKILLS.filter(s => new RegExp('\\b'+s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','i').test(l)).map(s => {
    if (s==='node.js') return 'Node.js'; if (s==='postgresql') return 'PostgreSQL'; if (s==='ci/cd') return 'CI/CD';
    return s.charAt(0).toUpperCase()+s.slice(1)
  }))].slice(0,8)
}

function extractLoc(l) {
  if (!l) return 'UK'
  var x = l.toLowerCase()
  var cities = [['london','London'],['manchester','Manchester'],['edinburgh','Edinburgh'],['bristol','Bristol'],['brighton','Brighton'],['birmingham','Birmingham'],['cambridge','Cambridge'],['oxford','Oxford'],['glasgow','Glasgow'],['leeds','Leeds'],['cardiff','Cardiff'],['newcastle','Newcastle'],['liverpool','Liverpool'],['nottingham','Nottingham'],['sheffield','Sheffield'],['belfast','Belfast'],['bath','Bath'],['reading','Reading'],['southampton','Southampton'],['coventry','Coventry']]
  for (var i = 0; i < cities.length; i++) { if (x.includes(cities[i][0])) return cities[i][1] }
  return l.split(',')[0].trim().substring(0,30) || 'UK'
}

function extractRemote(t) {
  if (!t) return 'On-site'
  var l = t.toLowerCase()
  if (l.includes('fully remote') || l.includes('100% remote')) return 'Remote'
  if (l.includes('remote') && l.includes('hybrid')) return 'Hybrid'
  if (l.includes('remote')) return 'Remote OK'
  if (l.includes('hybrid')) return 'Hybrid'
  return 'On-site'
}

function slugify(t) { return t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 100) }
function sleep(ms) { return new Promise(function(r) { setTimeout(r, ms) }) }

async function saveJob(j) {
  var cs = slugify(j.company)
  var coId

  var existing = await supabase.from('companies').select('id').eq('slug', cs).single()
  if (existing.data) {
    coId = existing.data.id
  } else {
    var ins = await supabase.from('companies').insert({ name: j.company, slug: cs, claimed: false }).select().single()
    if (ins.error) return false
    coId = ins.data.id
  }

  var js = slugify(j.title + '-' + cs)
  var coData = await supabase.from('companies').select('benefits,progression,satisfaction').eq('id', coId).single()
  var trust = 0
  if (j.salary_min > 0) trust += 30
  if (coData.data && coData.data.benefits && coData.data.benefits.length > 0) trust += 20
  if (coData.data && coData.data.progression) trust += 20
  if (coData.data && coData.data.satisfaction > 0) trust += 15

  var row = {
    company_id: coId, title: j.title, slug: js,
    description: (j.description || '').substring(0, 5000),
    location: j.location || 'UK',
    remote_policy: j.remote || 'On-site',
    job_type: 'Full-time',
    salary_min: j.salary_min || 0, salary_max: j.salary_max || 0,
    tags: j.tags || [], requirements: [],
    trust_score: trust, has_challenge: false,
    source: j.source || 'adzuna',
    source_url: j.url || '',
    active: true
  }

  var result = await supabase.from('jobs').upsert(row, { onConflict: 'company_id,slug' })
  if (result.error && !result.error.message.includes('duplicate')) {
    row.slug = js + '-' + Date.now().toString(36).slice(-4)
    await supabase.from('jobs').insert(row)
  }
  return true
}

async function main() {
  console.log('=== ProofWork Scraper v4 ===')
  console.log('Searching ' + SEARCHES.length + ' job categories, 5 pages each')
  console.log('Target: 1,000+ UK jobs\n')

  var total = 0
  var failed = 0

  // ADZUNA
  for (var i = 0; i < SEARCHES.length; i++) {
    var query = SEARCHES[i]
    var queryTotal = 0

    for (var page = 1; page <= 5; page++) {
      try {
        var url = 'https://api.adzuna.com/v1/api/jobs/gb/search/' + page + '?app_id=' + AZ_ID + '&app_key=' + AZ_KEY + '&results_per_page=50&what=' + encodeURIComponent(query) + '&sort_by=date'
        var res = await fetch(url)
        if (!res.ok) { if (page === 1) failed++; break }
        var data = await res.json()
        var results = data.results || []
        if (results.length === 0) break

        for (var k = 0; k < results.length; k++) {
          var j = results[k]
          var co = j.company ? j.company.display_name : null
          if (!co || co.length < 2 || co === 'Confidential') continue

          var title = (j.title || '').replace(/<[^>]*>/g, '').trim()
          if (!title) continue

          var ok = await saveJob({
            title: title,
            company: co,
            location: extractLoc(j.location ? j.location.display_name : ''),
            description: (j.description || '').replace(/<[^>]*>/g, ' ').trim(),
            salary_min: Math.round(j.salary_min || 0),
            salary_max: Math.round(j.salary_max || 0),
            source: 'adzuna',
            url: j.redirect_url || '',
            tags: extractTags(title + ' ' + (j.description || '')),
            remote: extractRemote(title + ' ' + (j.description || '') + ' ' + (j.location ? j.location.display_name : ''))
          })
          if (ok) queryTotal++
        }
        await sleep(350)
      } catch (e) { break }
    }

    if (queryTotal > 0) {
      console.log('  + ' + query + ': ' + queryTotal + ' jobs')
      total += queryTotal
    } else if (failed > 0) {
      // silently skip failed queries
    }

    // Progress update every 10 queries
    if ((i + 1) % 10 === 0) {
      console.log('  ... ' + (i + 1) + '/' + SEARCHES.length + ' categories done, ' + total + ' jobs so far')
    }
  }

  console.log('\n  Adzuna: ' + total + ' jobs from ' + SEARCHES.length + ' searches')

  // GREENHOUSE
  console.log('\n  Checking Greenhouse boards...')
  var ghTotal = 0
  var ghSlugs = ['monzo','snyk','tractable','motorway','thoughtmachine','iwoca','lendable','multiverse','paddlehq','edited','speechmatics','faculty','what3words','fundingcircle','improbable','blockchain','eigentechnologies','zappi','zopa','starlingbank','deliveroo','checkout','checkoutcom','revolut','darktrace','skyscanner','graphcore','form3','octopusenergy','octopus','oaknorth','habito','nutmeg','currencycloud','cleo','gopuff','beamery','onfido','cazoo','farfetch','depop','sky','bbc']
  var ghSeen = {}

  for (var g = 0; g < ghSlugs.length; g++) {
    var s = ghSlugs[g]
    if (ghSeen[s]) continue
    ghSeen[s] = true
    try {
      var res2 = await fetch('https://boards-api.greenhouse.io/v1/boards/' + s + '/jobs?content=true')
      if (!res2.ok) continue
      var gData = await res2.json()
      var gJobs = (gData.jobs || []).filter(function(j) {
        var l = (j.location ? j.location.name : '').toLowerCase()
        return l.includes('uk') || l.includes('united kingdom') || l.includes('london') || l.includes('manchester') || l.includes('edinburgh') || l.includes('bristol') || l.includes('cambridge') || l.includes('oxford') || l.includes('remote') || l.includes('glasgow') || l.includes('birmingham') || l.includes('leeds') || l.includes('brighton') || l.includes('liverpool') || l.includes('belfast')
      })
      var gAdded = 0
      for (var gj = 0; gj < gJobs.length; gj++) {
        var ghJob = gJobs[gj]
        var ghDesc = (ghJob.content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
        var ghOk = await saveJob({
          title: ghJob.title,
          company: s.replace(/-/g, ' '),
          location: extractLoc(ghJob.location ? ghJob.location.name : ''),
          description: ghDesc.substring(0, 5000),
          salary_min: 0, salary_max: 0,
          source: 'career page',
          url: ghJob.absolute_url || ('https://boards.greenhouse.io/' + s + '/jobs/' + ghJob.id),
          tags: extractTags(ghJob.title + ' ' + ghDesc),
          remote: extractRemote(ghJob.title + ' ' + (ghJob.location ? ghJob.location.name : ''))
        })
        if (ghOk) gAdded++
      }
      if (gAdded > 0) { console.log('  + ' + s + ': ' + gAdded + ' jobs'); ghTotal += gAdded }
      await sleep(250)
    } catch (e) {}
  }
  total += ghTotal

  // LEVER
  console.log('\n  Checking Lever boards...')
  var lvTotal = 0
  var lvSlugs = ['deliveroo','checkout','starlingbank','form3','darktrace','revolut','skyscanner','wise','transferwise','snyk','paddle','motorway','iwoca','zopa','multiverse','cleo-ai','tractable','improbable','gopuff','thoughtmachine','beamery','onfido','monzo','cazoo','depop','sky','bbc','farfetch']
  var lvSeen = {}

  for (var lv = 0; lv < lvSlugs.length; lv++) {
    var ls = lvSlugs[lv]
    if (lvSeen[ls]) continue
    lvSeen[ls] = true
    try {
      var lRes = await fetch('https://api.lever.co/v0/postings/' + ls + '?mode=json')
      if (!lRes.ok) continue
      var lJobs = await lRes.json()
      if (!Array.isArray(lJobs)) continue
      var lUk = lJobs.filter(function(j) {
        var l = (j.categories ? j.categories.location : '').toLowerCase()
        return l.includes('uk') || l.includes('united kingdom') || l.includes('london') || l.includes('manchester') || l.includes('edinburgh') || l.includes('bristol') || l.includes('remote') || l.includes('glasgow') || l.includes('birmingham') || l.includes('leeds')
      })
      var lAdded = 0
      for (var lj = 0; lj < lUk.length; lj++) {
        var lvJob = lUk[lj]
        var lvOk = await saveJob({
          title: lvJob.text,
          company: ls.replace(/-/g, ' '),
          location: extractLoc(lvJob.categories ? lvJob.categories.location : ''),
          description: (lvJob.descriptionPlain || '').substring(0, 5000),
          salary_min: 0, salary_max: 0,
          source: 'career page',
          url: lvJob.hostedUrl || '',
          tags: extractTags(lvJob.text + ' ' + (lvJob.descriptionPlain || '')),
          remote: extractRemote(lvJob.text + ' ' + (lvJob.categories ? lvJob.categories.location : ''))
        })
        if (lvOk) lAdded++
      }
      if (lAdded > 0) { console.log('  + ' + ls + ': ' + lAdded + ' jobs'); lvTotal += lAdded }
      await sleep(250)
    } catch (e) {}
  }
  total += lvTotal

  // FINAL STATS
  var jc = await supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('active', true)
  var cc = await supabase.from('companies').select('*', { count: 'exact', head: true })

  console.log('\n======================================')
  console.log('DONE!')
  console.log('  New this run: ' + total)
  console.log('  Total jobs: ' + (jc.count || 0))
  console.log('  Total companies: ' + (cc.count || 0))
  console.log('\nhttps://proofwork-nine.vercel.app/jobs')
}

main().catch(function(e) { console.error(e) })
