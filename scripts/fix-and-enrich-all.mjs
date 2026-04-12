// ShowJob — Fix challenges + Enrich ALL jobs
// Usage: node scripts/fix-and-enrich-all.mjs
// 
// What this does:
// 1. Sets has_challenge = false on ALL jobs (no company has signed up yet)
// 2. Re-fetches ALL Greenhouse boards with full HTML descriptions
// 3. Re-fetches ALL Lever boards with full HTML descriptions
// 4. Crawls source URLs for ALL Adzuna jobs with short descriptions
// 5. Reports stats at the end

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fovjkyqimtafpzdwtatp.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvdmpreXFpbXRhZnB6ZHd0YXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzQ5OTUsImV4cCI6MjA5MTQxMDk5NX0.qG50PxCyWTL9gyb8jlqjJsKQ6gJGULbOizqxezQTais'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const sleep = ms => new Promise(r => setTimeout(r, ms))

// ===== STEP 1: Fix all challenge badges =====
async function fixChallenges() {
  console.log('\n⚡ Step 1: Fixing challenge badges...\n')

  // Count how many have it wrong
  const { count: wrongCount } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('has_challenge', true)

  console.log(`  Found ${wrongCount || 0} jobs with has_challenge = true`)

  if (wrongCount > 0) {
    // Fix in batches (Supabase update doesn't support updating all at once easily)
    let fixed = 0
    let page = 0
    while (true) {
      const { data: batch } = await supabase
        .from('jobs')
        .select('id')
        .eq('has_challenge', true)
        .limit(100)

      if (!batch || batch.length === 0) break

      for (const job of batch) {
        await supabase.from('jobs').update({ has_challenge: false }).eq('id', job.id)
        fixed++
      }
      page++
      process.stdout.write(`  Fixed batch ${page} (${fixed} total)\r`)
    }
    // Also recalculate trust scores — remove the 15 challenge points
    const { data: challengeJobs } = await supabase
      .from('jobs')
      .select('id, trust_score')
      .gt('trust_score', 0)
      .limit(10000)

    // We'll just let the trust scores stay as-is for now since has_challenge 
    // was wrongly true, the score included 15 extra points
    // A proper fix would recalculate, but that requires knowing all the other factors
    console.log(`\n  ✓ Fixed ${fixed} jobs — all challenges removed\n`)
  } else {
    console.log('  ✓ All good — no false challenges found\n')
  }
}

// ===== STEP 2: Greenhouse — Full HTML descriptions =====
async function enrichGreenhouse() {
  console.log('\n🏢 Step 2: Re-fetching ALL Greenhouse descriptions...\n')

  const BOARDS = [
    {s:'monzo',n:'Monzo'},{s:'octopusenergy',n:'Octopus Energy'},{s:'snyk',n:'Snyk'},
    {s:'darktrace',n:'Darktrace'},{s:'deliveroo',n:'Deliveroo'},{s:'checkoutcom',n:'Checkout.com'},
    {s:'wise48',n:'Wise'},{s:'form3',n:'Form3'},{s:'thoughtmachine',n:'Thought Machine'},
    {s:'graphcore',n:'Graphcore'},{s:'skyscanner',n:'Skyscanner'},{s:'paddle',n:'Paddle'},
    {s:'motorway',n:'Motorway'},{s:'speechmatics',n:'Speechmatics'},{s:'faculty',n:'Faculty'},
    {s:'lendable',n:'Lendable'},{s:'cleo42',n:'Cleo'},{s:'tractable',n:'Tractable'},
    {s:'starlingbank',n:'Starling Bank'},{s:'zopa',n:'Zopa'},{s:'iwoca',n:'iwoca'},
    {s:'eigen',n:'Eigen Technologies'},{s:'zappi',n:'Zappi'},{s:'edited',n:'EDITED'},
    {s:'improbable',n:'Improbable'},{s:'blockchain',n:'Blockchain.com'},
    {s:'fundingcircle',n:'Funding Circle'},{s:'what3words',n:'what3words'},
    {s:'atombank',n:'Atom Bank'},{s:'oaknorth',n:'OakNorth'},
    {s:'habito',n:'Habito'},{s:'bulb',n:'Bulb'},{s:'gousto',n:'Gousto'},
    {s:'babylonhealth',n:'Babylon Health'},{s:'depop',n:'Depop'},
    {s:'marshmallow',n:'Marshmallow'},{s:'cazoo',n:'Cazoo'},
    {s:'tide',n:'Tide'},{s:'farfetch',n:'Farfetch'},{s:'bumble',n:'Bumble'},
    {s:'onfido',n:'Onfido'},{s:'ravelin',n:'Ravelin'},{s:'contentful',n:'Contentful'},
    {s:'revolut',n:'Revolut'},{s:'checkout',n:'Checkout'},
  ]

  let updated = 0
  let checked = 0

  for (const co of BOARDS) {
    try {
      const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${co.s}/jobs?content=true`)
      if (!res.ok) continue
      const data = await res.json()
      const jobs = data.jobs || []

      for (const j of jobs) {
        if (!j.content || j.content.length < 100) continue
        checked++

        const sourceUrl = j.absolute_url || `https://boards.greenhouse.io/${co.s}/jobs/${j.id}`

        // Try source URL match
        let { data: existing } = await supabase
          .from('jobs')
          .select('id, description')
          .eq('source_url', sourceUrl)
          .single()

        // Try title + company match
        if (!existing) {
          const { data: byTitle } = await supabase
            .from('jobs')
            .select('id, description, companies!inner(name)')
            .ilike('title', j.title)
            .ilike('companies.name', '%' + co.n + '%')
            .limit(1)
          if (byTitle && byTitle.length > 0) existing = byTitle[0]
        }

        if (!existing) continue

        const newDesc = j.content
        if (newDesc.length > (existing.description || '').length) {
          await supabase.from('jobs').update({
            description: newDesc.substring(0, 15000),
            source_url: sourceUrl,
          }).eq('id', existing.id)
          updated++
          console.log(`  ✓ ${co.n}: ${j.title} (${newDesc.length} chars)`)
        }
      }
      await sleep(300)
    } catch (e) {}
  }

  console.log(`\n  Greenhouse: checked ${checked}, enriched ${updated}\n`)
  return updated
}

// ===== STEP 3: Lever — Full HTML descriptions =====
async function enrichLever() {
  console.log('\n🏢 Step 3: Re-fetching ALL Lever descriptions...\n')

  const BOARDS = [
    {s:'netlify',n:'Netlify'},{s:'vercel',n:'Vercel'},{s:'plaid',n:'Plaid'},
    {s:'stripe',n:'Stripe'},{s:'notion',n:'Notion'},{s:'figma',n:'Figma'},
    {s:'linear',n:'Linear'},{s:'datadog',n:'Datadog'},{s:'confluent',n:'Confluent'},
    {s:'hashicorp',n:'HashiCorp'},{s:'grafana',n:'Grafana Labs'},
    {s:'cockroachlabs',n:'Cockroach Labs'},{s:'samsara',n:'Samsara'},
    {s:'dbt-labs',n:'dbt Labs'},{s:'aiven',n:'Aiven'},
    {s:'multiverse',n:'Multiverse'},{s:'cuvva',n:'Cuvva'},
    {s:'otta',n:'Otta'},{s:'allplants',n:'allplants'},
    {s:'beamery',n:'Beamery'},{s:'nexmo',n:'Vonage'},
    {s:'contentful',n:'Contentful'},{s:'tessian',n:'Tessian'},
    {s:'luno',n:'Luno'},{s:'pleo',n:'Pleo'},
    {s:'geckoboard',n:'Geckoboard'},
  ]

  let updated = 0

  for (const co of BOARDS) {
    try {
      const res = await fetch(`https://api.lever.co/v0/postings/${co.s}?mode=json`)
      if (!res.ok) continue
      const jobs = await res.json()
      if (!Array.isArray(jobs)) continue

      for (const j of jobs) {
        const htmlDesc = j.description || ''
        const listsHtml = (j.lists || []).map(l => `<h3>${l.text}</h3>${l.content || ''}`).join('')
        const additionalHtml = j.additional ? `<h3>Additional</h3>${j.additional}` : ''
        const fullDesc = htmlDesc + listsHtml + additionalHtml
        if (fullDesc.length < 100) continue

        const sourceUrl = j.hostedUrl || j.applyUrl || ''
        let { data: existing } = await supabase
          .from('jobs')
          .select('id, description')
          .eq('source_url', sourceUrl)
          .single()

        if (!existing) {
          const { data: byTitle } = await supabase
            .from('jobs')
            .select('id, description, companies!inner(name)')
            .ilike('title', j.text)
            .ilike('companies.name', '%' + co.n + '%')
            .limit(1)
          if (byTitle && byTitle.length > 0) existing = byTitle[0]
        }

        if (!existing) continue

        if (fullDesc.length > (existing.description || '').length) {
          await supabase.from('jobs').update({
            description: fullDesc.substring(0, 15000),
          }).eq('id', existing.id)
          updated++
          console.log(`  ✓ ${co.n}: ${j.text} (${fullDesc.length} chars)`)
        }
      }
      await sleep(300)
    } catch (e) {}
  }

  console.log(`\n  Lever: ${updated} enriched\n`)
  return updated
}

// ===== STEP 4: Crawl ALL Adzuna/other source URLs =====
async function enrichAllSourceURLs() {
  console.log('\n🌐 Step 4: Crawling ALL source URLs for short descriptions...\n')

  // Get ALL jobs with short descriptions, in batches
  let allShort = []
  let offset = 0
  const BATCH = 500

  while (true) {
    const { data: batch } = await supabase
      .from('jobs')
      .select('id, title, description, source_url, source, companies(name)')
      .eq('active', true)
      .range(offset, offset + BATCH - 1)

    if (!batch || batch.length === 0) break
    
    // Filter to short descriptions
    const short = batch.filter(j => {
      const descLen = (j.description || '').replace(/<[^>]*>/g, '').length
      return descLen < 1000 && j.source_url && j.source_url.startsWith('http')
    })
    
    allShort = allShort.concat(short)
    offset += BATCH
    if (batch.length < BATCH) break
  }

  console.log(`  Found ${allShort.length} jobs with short descriptions\n`)

  let updated = 0
  let failed = 0
  let skipped = 0

  for (let i = 0; i < allShort.length; i++) {
    const job = allShort[i]
    
    // Progress
    if (i % 50 === 0 && i > 0) {
      console.log(`  ... ${i}/${allShort.length} processed (${updated} enriched, ${failed} failed)`)
    }

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)

      const res = await fetch(job.source_url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-GB,en;q=0.9',
        },
        redirect: 'follow',
      })
      clearTimeout(timeout)

      if (!res.ok) { failed++; continue }

      const contentType = res.headers.get('content-type') || ''
      if (!contentType.includes('html')) { skipped++; continue }

      const html = await res.text()

      // Strategy 1: JSON-LD JobPosting (best quality)
      let fullDesc = extractJsonLd(html)

      // Strategy 2: Common containers
      if (!fullDesc || fullDesc.length < 300) {
        fullDesc = extractFromHTML(html)
      }

      // Strategy 3: Large content blocks with job keywords
      if (!fullDesc || fullDesc.length < 300) {
        fullDesc = extractLargestJobBlock(html)
      }

      const currentLen = (job.description || '').replace(/<[^>]*>/g, '').length
      const newLen = fullDesc ? fullDesc.replace(/<[^>]*>/g, '').length : 0

      if (fullDesc && newLen > currentLen && newLen > 200) {
        await supabase.from('jobs').update({
          description: fullDesc.substring(0, 15000),
        }).eq('id', job.id)
        updated++
        console.log(`  ✓ ${job.companies?.name}: ${job.title} (${currentLen} → ${newLen} chars)`)
      }

      // Be polite — random delay between 300-800ms
      await sleep(300 + Math.random() * 500)
    } catch (e) {
      failed++
    }
  }

  console.log(`\n  Source URLs: ${updated} enriched, ${failed} failed, ${skipped} skipped\n`)
  return updated
}

// ===== STEP 5: Recalculate trust scores =====
async function recalcTrustScores() {
  console.log('\n🔢 Step 5: Recalculating trust scores...\n')

  let offset = 0
  let fixed = 0
  const BATCH = 200

  while (true) {
    const { data: jobs } = await supabase
      .from('jobs')
      .select('id, salary_min, has_challenge, companies(benefits, progression, satisfaction)')
      .eq('active', true)
      .range(offset, offset + BATCH - 1)

    if (!jobs || jobs.length === 0) break

    for (const job of jobs) {
      const co = job.companies
      let score = 0
      if (job.salary_min > 0) score += 30
      if (co?.benefits?.length > 0) score += 20
      if (co?.progression && co.progression.length > 0) score += 20
      if (co?.satisfaction > 0) score += 15
      if (job.has_challenge) score += 15 // will be 0 since we fixed them all

      await supabase.from('jobs').update({ trust_score: score }).eq('id', job.id)
      fixed++
    }

    offset += BATCH
    process.stdout.write(`  Recalculated ${fixed} jobs...\r`)
    if (jobs.length < BATCH) break
  }

  console.log(`\n  ✓ Trust scores recalculated for ${fixed} jobs\n`)
}

// ===== Extraction helpers =====
function extractJsonLd(html) {
  const scripts = html.match(/<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)
  if (!scripts) return null

  for (const script of scripts) {
    try {
      const jsonStr = script.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '').trim()
      const data = JSON.parse(jsonStr)
      const items = Array.isArray(data) ? data : [data]
      for (const item of items) {
        if (item['@type'] === 'JobPosting' && item.description) return item.description
        if (item['@graph']) {
          for (const g of item['@graph']) {
            if (g['@type'] === 'JobPosting' && g.description) return g.description
          }
        }
      }
    } catch (e) {}
  }
  return null
}

function extractFromHTML(html) {
  const clean = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')

  const patterns = [
    /<(?:div|section|article)[^>]*class="[^"]*(?:job-description|job-detail|vacancy-description|jobDescription|job_description|role-description|posting-description|adp-body|description-text|job-content|job__body|vacancy-text|job-overview)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|section|article)>/i,
    /<(?:div|section)[^>]*id="[^"]*(?:job-description|job-detail|jobDescription|job_description|job-content)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|section)>/i,
    /<(?:div|section)[^>]*itemprop="description"[^>]*>([\s\S]*?)<\/(?:div|section)>/i,
  ]

  for (const pattern of patterns) {
    const match = clean.match(pattern)
    if (match && match[1]) {
      const text = match[1].replace(/<img[^>]*>/gi, '').replace(/\s(class|style|id|data-[a-z-]+)="[^"]*"/gi, '')
      if (text.replace(/<[^>]*>/g, '').trim().length > 300) return text.trim()
    }
  }
  return null
}

function extractLargestJobBlock(html) {
  const clean = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')

  // Find all substantial blocks
  const blocks = []
  const regex = /<(?:div|section|article|main)[^>]*>([\s\S]{400,8000}?)<\/(?:div|section|article|main)>/gi
  let match
  while ((match = regex.exec(clean)) !== null) {
    const text = match[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    const jobKeywords = (text.match(/\b(responsibilities|qualifications|requirements|experience|skills|salary|benefits|apply|role|team|candidate|working|duties|essential|desirable)\b/gi) || []).length
    if (jobKeywords >= 3) {
      blocks.push({ html: match[1], score: jobKeywords, len: text.length })
    }
  }

  if (blocks.length === 0) return null

  // Pick the block with most job keywords
  blocks.sort((a, b) => b.score - a.score)
  const best = blocks[0]
  return best.html.replace(/<img[^>]*>/gi, '').replace(/\s(class|style|id|data-[a-z-]+)="[^"]*"/gi, '').trim()
}

// ===== MAIN =====
async function main() {
  console.log('═'.repeat(60))
  console.log('  ShowJob — Full Enrichment + Fix Script')
  console.log('═'.repeat(60))

  const t0 = Date.now()

  await fixChallenges()
  const gh = await enrichGreenhouse()
  const lv = await enrichLever()
  const src = await enrichAllSourceURLs()
  await recalcTrustScores()

  const elapsed = Math.round((Date.now() - t0) / 1000)

  console.log('═'.repeat(60))
  console.log(`\n  ✅ All done in ${elapsed}s`)
  console.log(`     Greenhouse: ${gh} enriched`)
  console.log(`     Lever: ${lv} enriched`)
  console.log(`     Source URLs: ${src} enriched`)
  console.log(`     Challenges: all removed`)
  console.log(`     Trust scores: recalculated\n`)
  console.log('═'.repeat(60))
}

main().catch(console.error)
