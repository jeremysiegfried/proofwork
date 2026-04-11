// ProofWork Job Scraper v3 — Maximum Coverage
// Usage: node scripts/scrape.mjs [--adzuna] [--careers] [--all]

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fovjkyqimtafpzdwtatp.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvdmpreXFpbXRhZnB6ZHd0YXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzQ5OTUsImV4cCI6MjA5MTQxMDk5NX0.qG50PxCyWTL9gyb8jlqjJsKQ6gJGULbOizqxezQTais'
const ADZUNA_ID = '83de6425'
const ADZUNA_KEY = 'e032d7f124131b52ee21f480e89a3c41'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const ENRICHMENT = {
  'monzo':{e:'💳',emp:'3,200',yr:'2015',f:'IPO-track',g:4.5,s:['Go','Kubernetes','Cassandra']},
  'octopus energy':{e:'🐙',emp:'2,800',yr:'2015',f:'Series F',g:4.3,s:['Python','Django','React']},
  'wise':{e:'💸',emp:'4,500',yr:'2011',f:'Public',g:4.2,s:['Java','React','Kubernetes']},
  'revolut':{e:'💜',emp:'8,000',yr:'2015',f:'Series E',g:3.4,s:['Kotlin','Swift','React']},
  'starling bank':{e:'🏦',emp:'1,800',yr:'2014',f:'Series D',g:4.1,s:['Java','AWS','Kotlin']},
  'deliveroo':{e:'🚲',emp:'2,500',yr:'2013',f:'Public',g:3.6,s:['Python','Go','React']},
  'checkout.com':{e:'💳',emp:'1,800',yr:'2012',f:'Series D',g:3.9,s:['Go','Kotlin','AWS']},
  'skyscanner':{e:'✈️',emp:'1,200',yr:'2003',f:'Acquired',g:4.0,s:['Python','React','AWS']},
  'graphcore':{e:'🧠',emp:'600',yr:'2016',f:'Series E',g:3.8,s:['Python','C++','CUDA']},
  'form3':{e:'🏗️',emp:'400',yr:'2016',f:'Series C',g:4.2,s:['Go','Kubernetes','AWS']},
  'snyk':{e:'🛡️',emp:'1,000',yr:'2015',f:'Series G',g:3.9,s:['TypeScript','Go','Kubernetes']},
  'darktrace':{e:'🔒',emp:'2,200',yr:'2013',f:'Public',g:3.6,s:['Python','C++','Java']},
  'paddle':{e:'🏓',emp:'400',yr:'2012',f:'Series D',g:4.3,s:['Go','React','AWS']},
  'thought machine':{e:'🏦',emp:'500',yr:'2014',f:'Series C',g:4.0,s:['Go','Java','Kubernetes']},
  'zopa':{e:'💰',emp:'600',yr:'2005',f:'Bank license',g:3.8,s:['Java','React','AWS']},
  'iwoca':{e:'💼',emp:'400',yr:'2012',f:'Series E',g:4.1,s:['Python','React','AWS']},
  'lendable':{e:'💸',emp:'200',yr:'2014',f:'Series C',g:4.3,s:['Python','React','AWS']},
  'otta':{e:'🔍',emp:'150',yr:'2019',f:'Series B',g:4.5,s:['TypeScript','React','PostgreSQL']},
  'multiverse':{e:'🎓',emp:'600',yr:'2016',f:'Series D',g:3.8,s:['Python','React','AWS']},
  'cleo':{e:'🤖',emp:'300',yr:'2016',f:'Series C',g:4.1,s:['Python','React','Kotlin']},
  'gopuff':{e:'📦',emp:'1,000',yr:'2013',f:'Series H',g:3.2,s:['Python','React','AWS']},
  'tractable':{e:'🚗',emp:'300',yr:'2014',f:'Series E',g:4.2,s:['Python','PyTorch','AWS']},
  'improbable':{e:'🎮',emp:'700',yr:'2012',f:'Series B',g:3.5,s:['Go','C++','Unity']},
  'blockchain.com':{e:'⛓️',emp:'500',yr:'2011',f:'Series D',g:3.5,s:['Go','React','Kotlin']},
  'motorway':{e:'🚗',emp:'400',yr:'2017',f:'Series C',g:4.2,s:['TypeScript','React','AWS']},
  'edited':{e:'👗',emp:'200',yr:'2012',f:'Series B',g:4.0,s:['Python','React','AWS']},
  'eigen technologies':{e:'📄',emp:'200',yr:'2014',f:'Series C',g:3.9,s:['Python','NLP','AWS']},
  'speechmatics':{e:'🎙️',emp:'150',yr:'2006',f:'Series B',g:4.4,s:['Python','C++','ML']},
  'faculty':{e:'🧪',emp:'250',yr:'2014',f:'Series B',g:4.1,s:['Python','ML','AWS']},
  'what3words':{e:'🗺️',emp:'200',yr:'2013',f:'Series C',g:3.8,s:['Java','Kotlin','AWS']},
  'zappi':{e:'📊',emp:'250',yr:'2012',f:'Series B',g:4.0,s:['Python','React','AWS']},
  'atom bank':{e:'🏦',emp:'450',yr:'2014',f:'Licensed bank',g:3.7,s:['Java','AWS','React']},
  'oak north':{e:'🏦',emp:'600',yr:'2015',f:'Licensed bank',g:3.6,s:['Java','Python','AWS']},
  'nutmeg':{e:'🥜',emp:'300',yr:'2011',f:'Acquired by JPM',g:3.9,s:['Java','React','AWS']},
  'funding circle':{e:'💷',emp:'700',yr:'2010',f:'Public',g:3.6,s:['Java','Go','React']},
  'currency cloud':{e:'💱',emp:'350',yr:'2012',f:'Acquired by Visa',g:4.0,s:['Ruby','React','AWS']},
  'habito':{e:'🏠',emp:'100',yr:'2015',f:'Series C',g:4.0,s:['Elixir','React','AWS']},
  'sky':{e:'📺',emp:'30,000',yr:'1990',f:'Acquired by Comcast',g:3.8,s:['Java','React','AWS']},
  'bt group':{e:'📱',emp:'100,000',yr:'1846',f:'Public',g:3.5,s:['Java','Python','AWS']},
  'bbc':{e:'📻',emp:'22,000',yr:'1922',f:'Public',g:4.0,s:['Python','React','AWS']},
}

// ===== GREENHOUSE COMPANIES (verified UK boards) =====
const GREENHOUSE = [
  {s:'monzo',n:'Monzo'},
  {s:'snyk',n:'Snyk'},
  {s:'tractable',n:'Tractable'},
  {s:'motorway',n:'Motorway'},
  {s:'caborerleo',n:'Cleo'},
  {s:'thoughtmachine',n:'Thought Machine'},
  {s:'gopaborernuff',n:'GoPuff'},
  {s:'edited',n:'EDITED'},
  {s:'speechmatics',n:'Speechmatics'},
  {s:'faculty',n:'Faculty'},
  {s:'what3words',n:'what3words'},
  {s:'zappi',n:'Zappi'},
  {s:'iwoca',n:'iwoca'},
  {s:'lendable',n:'Lendable'},
  {s:'multiverse',n:'Multiverse'},
  {s:'paddlehq',n:'Paddle'},
  {s:'eigentechnologies',n:'Eigen Technologies'},
  {s:'fundingcircle',n:'Funding Circle'},
  {s:'improbable',n:'Improbable'},
  {s:'blockchain',n:'Blockchain.com'},
  {s:'aborerntta',n:'Otta'},
  {s:'zopa',n:'Zopa'},
  {s:'starlingbank',n:'Starling Bank'},
  {s:'deliveroo',n:'Deliveroo'},
  {s:'checkout',n:'Checkout.com'},
  {s:'checkoutcom',n:'Checkout.com'},
  {s:'revolut',n:'Revolut'},
  {s:'darktrace',n:'Darktrace'},
  {s:'skyuk',n:'Sky'},
  {s:'skyscanner',n:'Skyscanner'},
  {s:'graphcore',n:'Graphcore'},
  {s:'form3',n:'Form3'},
  {s:'atombaborernank',n:'Atom Bank'},
  {s:'oaknorth',n:'Oak North'},
  {s:'habito',n:'Habito'},
  {s:'nutmeg',n:'Nutmeg'},
  {s:'currencycloud',n:'Currency Cloud'},
  {s:'octopusenergy',n:'Octopus Energy'},
  {s:'octopus',n:'Octopus Energy'},
]

// ===== LEVER COMPANIES =====
const LEVER = [
  {s:'deliveroo',n:'Deliveroo'},
  {s:'checkout',n:'Checkout.com'},
  {s:'starlingbank',n:'Starling Bank'},
  {s:'form3',n:'Form3'},
  {s:'darktrace',n:'Darktrace'},
  {s:'revolut',n:'Revolut'},
  {s:'skyscanner',n:'Skyscanner'},
  {s:'wise',n:'Wise'},
  {s:'transferwise',n:'Wise'},
  {s:'snyk',n:'Snyk'},
  {s:'paddle',n:'Paddle'},
  {s:'motorway',n:'Motorway'},
  {s:'iwoca',n:'iwoca'},
  {s:'zopa',n:'Zopa'},
  {s:'multiverse',n:'Multiverse'},
  {s:'cleo-ai',n:'Cleo'},
  {s:'tractable',n:'Tractable'},
  {s:'improbable',n:'Improbable'},
  {s:'gopuff',n:'GoPuff'},
  {s:'thoughtmachine',n:'Thought Machine'},
  {s:'sky',n:'Sky'},
  {s:'bbc',n:'BBC'},
]

// ===== WORKABLE COMPANIES =====
const WORKABLE = [
  {s:'octopus-energy',n:'Octopus Energy'},
  {s:'graphcore',n:'Graphcore'},
  {s:'edited',n:'EDITED'},
  {s:'faculty-1',n:'Faculty'},
  {s:'speechmatics',n:'Speechmatics'},
  {s:'what3words',n:'what3words'},
  {s:'habito',n:'Habito'},
  {s:'nutmeg',n:'Nutmeg'},
  {s:'atom-bank',n:'Atom Bank'},
  {s:'cleo-ai',n:'Cleo'},
]

// ===== SKILLS =====
const SKILLS = ['python','javascript','typescript','react','node.js','nodejs','go','golang','java','kotlin','swift','rust','c++','c#','.net','ruby','php','scala','sql','mongodb','postgresql','redis','graphql','rest','aws','azure','gcp','docker','kubernetes','terraform','ci/cd','git','vue','angular','django','flask','fastapi','spring','pytorch','tensorflow','spark','airflow','kafka','figma','agile','scrum','jira','salesforce','hubspot','seo','excel','power bi','tableau','looker','dbt','snowflake']

function extractTags(text) {
  if (!text) return []
  const lower = text.toLowerCase()
  const found = SKILLS.filter(s => new RegExp(`\\b${s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`,'i').test(lower))
  return [...new Set(found.map(s => {
    if (s==='golang') return 'Go'; if (s==='nodejs'||s==='node.js') return 'Node.js';
    if (s==='postgresql') return 'PostgreSQL'; if (s==='ci/cd') return 'CI/CD';
    return s.charAt(0).toUpperCase()+s.slice(1)
  }))].slice(0,8)
}

function extractLocation(loc) {
  if (!loc) return 'UK'
  const l = loc.toLowerCase()
  const cities = [['london','London'],['manchester','Manchester'],['edinburgh','Edinburgh'],['bristol','Bristol'],['brighton','Brighton'],['birmingham','Birmingham'],['cambridge','Cambridge'],['oxford','Oxford'],['glasgow','Glasgow'],['leeds','Leeds'],['cardiff','Cardiff'],['newcastle','Newcastle'],['liverpool','Liverpool'],['nottingham','Nottingham'],['sheffield','Sheffield'],['belfast','Belfast'],['bath','Bath']]
  for (const [k,v] of cities) if (l.includes(k)) return v
  return loc.split(',')[0].trim().substring(0,30) || 'UK'
}

function extractRemote(text) {
  if (!text) return 'On-site'
  const l = text.toLowerCase()
  if (l.includes('fully remote')||l.includes('100% remote')) return 'Remote'
  if (l.includes('remote')&&l.includes('hybrid')) return 'Hybrid'
  if (l.includes('remote')) return 'Remote OK'
  if (l.includes('hybrid')) return 'Hybrid'
  return 'On-site'
}

function slugify(t){return t.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').substring(0,100)}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}

// ===== SAVE TO DB =====
async function saveJob(job) {
  const coSlug = slugify(job.company)
  const en = ENRICHMENT[job.company.toLowerCase()] || {}

  // Upsert company
  const coRow = {name:job.company,slug:coSlug,logo_emoji:en.e||'',employee_count:en.emp||'',founded:en.yr||'',funding:en.f||'',glassdoor_rating:en.g||0,tech_stack:en.s||[],claimed:false}
  let coId

  const {data:existing} = await supabase.from('companies').select('id,claimed').eq('slug',coSlug).single()
  if (existing) {
    coId = existing.id
    if (!existing.claimed) {
      await supabase.from('companies').update({employee_count:coRow.employee_count||undefined,founded:coRow.founded||undefined,funding:coRow.funding||undefined,glassdoor_rating:coRow.glassdoor_rating||undefined}).eq('id',coId)
    }
  } else {
    const {data:newCo,error} = await supabase.from('companies').insert(coRow).select().single()
    if (error) return false
    coId = newCo.id
  }

  // Insert job
  const jobSlug = slugify(job.title+'-'+coSlug)
  const {data:co} = await supabase.from('companies').select('benefits,progression,satisfaction').eq('id',coId).single()
  let trust = 0
  if (job.salary_min>0) trust+=30
  if (co?.benefits?.length>0) trust+=20
  if (co?.progression) trust+=20
  if (co?.satisfaction>0) trust+=15

  const row = {company_id:coId,title:job.title,slug:jobSlug,description:(job.description||'').substring(0,5000),location:job.location,remote_policy:job.remote||'On-site',job_type:'Full-time',salary_min:job.salary_min||0,salary_max:job.salary_max||0,tags:job.tags||[],requirements:[],trust_score:trust,has_challenge:false,source:job.source||'scraped',source_url:job.source_url||'',active:true}

  const {error} = await supabase.from('jobs').upsert(row,{onConflict:'company_id,slug'})
  if (error && !error.message.includes('duplicate')) {
    row.slug = jobSlug+'-'+Date.now().toString(36).slice(-4)
    const {error:e2} = await supabase.from('jobs').insert(row)
    if (e2) return false
  }
  return !error || error.message.includes('duplicate') ? true : true
}

// ===== ADZUNA =====
async function scrapeAdzuna() {
  console.log('\n📡 Adzuna API...\n')
  let total = 0
  const searches = ['software engineer','data scientist','product manager','devops','frontend developer','backend developer','machine learning','ux designer','data analyst','project manager','scrum master','business analyst','cloud engineer','security engineer','qa engineer','mobile developer','full stack developer','solutions architect','engineering manager','technical lead']

  for (const query of searches) {
    for (let page=1; page<=2; page++) {
      try {
        const url = `https://api.adzuna.com/v1/api/jobs/gb/search/${page}?app_id=${ADZUNA_ID}&app_key=${ADZUNA_KEY}&results_per_page=50&what=${encodeURIComponent(query)}&sort_by=date`
        const res = await fetch(url)
        if (!res.ok) { if (page===1) console.log(`  ⊘ "${query}": ${res.status}`); break }
        const data = await res.json()
        const results = data.results || []
        if (results.length===0) break

        let added = 0
        for (const j of results) {
          const co = j.company?.display_name
          if (!co || co==='Confidential' || co.length<2) continue
          const ok = await saveJob({
            title: j.title?.replace(/<[^>]*>/g,'').trim(),
            company: co,
            location: extractLocation(j.location?.display_name||''),
            description: (j.description||'').replace(/<[^>]*>/g,' ').trim(),
            salary_min: Math.round(j.salary_min||0),
            salary_max: Math.round(j.salary_max||0),
            source: 'adzuna',
            source_url: j.redirect_url||'',
            tags: extractTags(j.title+' '+(j.description||'')),
            remote: extractRemote(j.title+' '+(j.description||'')+' '+(j.location?.display_name||'')),
          })
          if (ok) added++
        }
        if (added>0) console.log(`  ✓ "${query}" p${page}: ${added} jobs`)
        await sleep(400)
      } catch(e) { console.log(`  ❌ "${query}": ${e.message}`) }
    }
  }
  console.log(`\n  Adzuna total: ${total} new jobs`)
  return total
}

// ===== GREENHOUSE =====
async function scrapeGreenhouse() {
  console.log('\n🏢 Greenhouse boards...\n')
  let total = 0
  const seen = new Set()

  for (const co of GREENHOUSE) {
    if (seen.has(co.s)) continue
    seen.add(co.s)
    try {
      const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${co.s}/jobs?content=true`)
      if (!res.ok) continue
      const data = await res.json()
      const jobs = data.jobs || []

      const ukJobs = jobs.filter(j => {
        const loc = (j.location?.name||'').toLowerCase()
        return loc.includes('uk')||loc.includes('united kingdom')||loc.includes('london')||loc.includes('manchester')||loc.includes('edinburgh')||loc.includes('bristol')||loc.includes('cambridge')||loc.includes('oxford')||loc.includes('remote')||loc.includes('glasgow')||loc.includes('birmingham')||loc.includes('leeds')||loc.includes('brighton')||loc.includes('liverpool')
      })

      let added = 0
      for (const j of ukJobs) {
        const desc = (j.content||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim()
        const ok = await saveJob({
          title: j.title, company: co.n,
          location: extractLocation(j.location?.name||''),
          description: desc.substring(0,5000),
          salary_min:0, salary_max:0,
          source:'career page',
          source_url: j.absolute_url||`https://boards.greenhouse.io/${co.s}/jobs/${j.id}`,
          tags: extractTags(j.title+' '+desc),
          remote: extractRemote(j.title+' '+(j.location?.name||'')+' '+desc),
        })
        if (ok) added++
      }
      if (added>0) { console.log(`  ✓ ${co.n}: ${added} UK jobs`); total+=added }
      await sleep(300)
    } catch(e) {}
  }
  console.log(`\n  Greenhouse total: ${total} new jobs`)
  return total
}

// ===== LEVER =====
async function scrapeLever() {
  console.log('\n🏢 Lever boards...\n')
  let total = 0
  const seen = new Set()

  for (const co of LEVER) {
    if (seen.has(co.s)) continue
    seen.add(co.s)
    try {
      const res = await fetch(`https://api.lever.co/v0/postings/${co.s}?mode=json`)
      if (!res.ok) continue
      const jobs = await res.json()
      if (!Array.isArray(jobs)) continue

      const ukJobs = jobs.filter(j => {
        const loc = (j.categories?.location||'').toLowerCase()
        return loc.includes('uk')||loc.includes('united kingdom')||loc.includes('london')||loc.includes('manchester')||loc.includes('edinburgh')||loc.includes('bristol')||loc.includes('remote')||loc.includes('glasgow')||loc.includes('birmingham')||loc.includes('leeds')
      })

      let added = 0
      for (const j of ukJobs) {
        const desc = (j.descriptionPlain||'').substring(0,5000)
        const ok = await saveJob({
          title: j.text, company: co.n,
          location: extractLocation(j.categories?.location||''),
          description: desc,
          salary_min:0, salary_max:0,
          source:'career page',
          source_url: j.hostedUrl||j.applyUrl||'',
          tags: extractTags(j.text+' '+desc),
          remote: extractRemote(j.text+' '+(j.categories?.location||'')+' '+desc),
        })
        if (ok) added++
      }
      if (added>0) { console.log(`  ✓ ${co.n}: ${added} UK jobs`); total+=added }
      await sleep(300)
    } catch(e) {}
  }
  console.log(`\n  Lever total: ${total} new jobs`)
  return total
}

// ===== WORKABLE =====
async function scrapeWorkable() {
  console.log('\n🏢 Workable boards...\n')
  let total = 0

  for (const co of WORKABLE) {
    try {
      const res = await fetch(`https://apply.workable.com/api/v1/widget/accounts/${co.s}`,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({query:'',location:[],department:[],worktype:[],remote:[]})
      })
      if (!res.ok) continue
      const data = await res.json()
      const jobs = data.results || []

      let added = 0
      for (const j of jobs) {
        const loc = (j.location?.city||'')+' '+(j.location?.country||'')
        if (!loc.toLowerCase().includes('uk')&&!loc.toLowerCase().includes('united kingdom')&&!loc.toLowerCase().includes('london')&&!loc.toLowerCase().includes('manchester')&&!loc.toLowerCase().includes('remote')) continue

        const ok = await saveJob({
          title: j.title, company: co.n,
          location: extractLocation(loc),
          description: (j.description||j.title).substring(0,5000),
          salary_min:0, salary_max:0,
          source:'career page',
          source_url: `https://apply.workable.com/${co.s}/j/${j.shortcode}/`,
          tags: extractTags(j.title+' '+(j.description||'')),
          remote: j.remote ? 'Remote' : extractRemote(j.title+' '+loc),
        })
        if (ok) added++
      }
      if (added>0) { console.log(`  ✓ ${co.n}: ${added} UK jobs`); total+=added }
      await sleep(300)
    } catch(e) {}
  }
  console.log(`\n  Workable total: ${total} new jobs`)
  return total
}

// ===== MAIN =====
async function main() {
  const args = process.argv.slice(2)
  const all = args.includes('--all') || args.length===0
  const doAdzuna = args.includes('--adzuna') || all
  const doCareers = args.includes('--careers') || all

  console.log('🚀 ProofWork Job Scraper v3')
  console.log('================================\n')

  let total = 0
  if (doAdzuna) total += await scrapeAdzuna()
  if (doCareers) {
    total += await scrapeGreenhouse()
    total += await scrapeLever()
    total += await scrapeWorkable()
  }

  const {count:jc} = await supabase.from('jobs').select('*',{count:'exact',head:true}).eq('active',true)
  const {count:cc} = await supabase.from('companies').select('*',{count:'exact',head:true})

  console.log('\n================================')
  console.log(`✅ Done! ${total} new jobs`)
  console.log(`   Total: ${jc} jobs across ${cc} companies`)
  console.log(`🌐 https://proofwork-nine.vercel.app/jobs`)
}

main().catch(console.error)
