// ShowJob Enrichment Script — Crawl source URLs for full descriptions
// Usage: node scripts/enrich.mjs [--all] [--greenhouse] [--adzuna] [--limit=100]
// Default: enriches jobs with short descriptions (< 1000 chars)

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fovjkyqimtafpzdwtatp.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvdmpreXFpbXRhZnB6ZHd0YXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzQ5OTUsImV4cCI6MjA5MTQxMDk5NX0.qG50PxCyWTL9gyb8jlqjJsKQ6gJGULbOizqxezQTais'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const sleep = ms => new Promise(r => setTimeout(r, ms))

// Parse CLI args
const args = process.argv.slice(2)
const doAll = args.includes('--all')
const doGreenhouse = args.includes('--greenhouse')
const doAdzuna = args.includes('--adzuna')
const limitArg = args.find(a => a.startsWith('--limit='))
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1]) : 200

// ===== STEP 1: Re-fetch Greenhouse jobs with full HTML =====
async function enrichGreenhouse() {
  console.log('\n🏢 Re-fetching Greenhouse descriptions with full HTML...\n')

  // Get all Greenhouse company slugs we know about
  const GREENHOUSE_BOARDS = [
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
  ]

  let updated = 0

  for (const co of GREENHOUSE_BOARDS) {
    try {
      const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${co.s}/jobs?content=true`)
      if (!res.ok) continue
      const data = await res.json()
      const jobs = data.jobs || []

      for (const j of jobs) {
        if (!j.content || j.content.length < 100) continue

        // Find matching job in our DB by source_url or title+company
        const sourceUrl = j.absolute_url || `https://boards.greenhouse.io/${co.s}/jobs/${j.id}`

        // Try to match by source URL first
        let { data: existing } = await supabase
          .from('jobs')
          .select('id, description')
          .eq('source_url', sourceUrl)
          .single()

        // If not found by URL, try title + company
        if (!existing) {
          const { data: byTitle } = await supabase
            .from('jobs')
            .select('id, description, companies!inner(name)')
            .ilike('title', j.title)
            .ilike('companies.name', co.n)
            .limit(1)

          if (byTitle && byTitle.length > 0) existing = byTitle[0]
        }

        if (!existing) continue

        // Only update if new content is longer
        const newDesc = j.content // Keep raw HTML — JobDescription component handles rendering
        if (newDesc.length > (existing.description || '').length) {
          await supabase.from('jobs').update({
            description: newDesc.substring(0, 10000),
            source_url: sourceUrl,
          }).eq('id', existing.id)
          updated++
          process.stdout.write(`  ✓ ${co.n}: ${j.title}\n`)
        }
      }
      await sleep(300)
    } catch (e) {
      // Skip failures silently
    }
  }

  console.log(`\n  Greenhouse: ${updated} jobs enriched with full HTML\n`)
  return updated
}

// ===== STEP 2: Crawl Adzuna/other source URLs =====
async function enrichFromSourceURLs() {
  console.log('\n🌐 Crawling source URLs for full descriptions...\n')

  // Find jobs with short descriptions
  const { data: shortJobs, error } = await supabase
    .from('jobs')
    .select('id, title, description, source_url, source, companies(name)')
    .eq('active', true)
    .order('trust_score', { ascending: false })
    .limit(LIMIT)

  if (error || !shortJobs) {
    console.log('  Error fetching jobs:', error?.message)
    return 0
  }

  // Filter to only short descriptions
  const toEnrich = shortJobs.filter(j => {
    const descLen = (j.description || '').replace(/<[^>]*>/g, '').length
    return descLen < 1000 && j.source_url && j.source_url.startsWith('http')
  })

  console.log(`  Found ${toEnrich.length} jobs with short descriptions to enrich\n`)

  let updated = 0
  let failed = 0

  for (const job of toEnrich) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)

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

      const html = await res.text()

      // Strategy 1: Look for JSON-LD JobPosting schema (best quality)
      let fullDesc = extractJsonLd(html)

      // Strategy 2: Look for common job description containers
      if (!fullDesc || fullDesc.length < 200) {
        fullDesc = extractFromHTML(html)
      }

      // Strategy 3: Extract from meta description as fallback
      if (!fullDesc || fullDesc.length < 200) {
        const metaMatch = html.match(/<meta\s+(?:name|property)="(?:og:)?description"\s+content="([^"]+)"/i)
        if (metaMatch && metaMatch[1].length > (job.description || '').length) {
          fullDesc = metaMatch[1]
        }
      }

      if (fullDesc && fullDesc.length > (job.description || '').replace(/<[^>]*>/g, '').length) {
        await supabase.from('jobs').update({
          description: fullDesc.substring(0, 10000),
        }).eq('id', job.id)
        updated++
        process.stdout.write(`  ✓ ${job.companies?.name}: ${job.title} (${fullDesc.length} chars)\n`)
      } else {
        process.stdout.write(`  · ${job.companies?.name}: ${job.title} — no improvement\n`)
      }

      await sleep(500 + Math.random() * 500) // Random delay to be polite
    } catch (e) {
      failed++
    }
  }

  console.log(`\n  Source URLs: ${updated} enriched, ${failed} failed\n`)
  return updated
}

// Extract job description from JSON-LD schema
function extractJsonLd(html) {
  const scripts = html.match(/<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)
  if (!scripts) return null

  for (const script of scripts) {
    try {
      const jsonStr = script.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '').trim()
      const data = JSON.parse(jsonStr)

      // Handle both single object and array
      const items = Array.isArray(data) ? data : [data]
      for (const item of items) {
        if (item['@type'] === 'JobPosting' && item.description) {
          return item.description
        }
        // Check @graph array (common in WordPress)
        if (item['@graph']) {
          for (const g of item['@graph']) {
            if (g['@type'] === 'JobPosting' && g.description) {
              return g.description
            }
          }
        }
      }
    } catch (e) {
      // Invalid JSON, skip
    }
  }
  return null
}

// Extract job description from common HTML patterns
function extractFromHTML(html) {
  // Remove script and style blocks
  const clean = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')

  // Common job description selectors — try each
  const patterns = [
    // Common class names for job descriptions
    /<(?:div|section|article)[^>]*class="[^"]*(?:job-description|job-detail|vacancy-description|jobDescription|job_description|role-description|posting-description)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|section|article)>/i,
    // ID-based
    /<(?:div|section)[^>]*id="[^"]*(?:job-description|job-detail|jobDescription|job_description)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|section)>/i,
    // Data attributes
    /<(?:div|section)[^>]*data-[a-z-]*="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/(?:div|section)>/i,
    // Workday, Lever, etc
    /<div[^>]*class="[^"]*posting-page[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    // Reed/Totaljobs style
    /<div[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
  ]

  for (const pattern of patterns) {
    const match = clean.match(pattern)
    if (match && match[1]) {
      const text = match[1]
        .replace(/<img[^>]*>/gi, '')
        .replace(/\s(class|style|id|data-[a-z-]+)="[^"]*"/gi, '')
      if (text.replace(/<[^>]*>/g, '').trim().length > 300) {
        return text.trim()
      }
    }
  }

  // Last resort: find the largest content block
  const blocks = clean.match(/<(?:div|section|article)[^>]*>([\s\S]{500,}?)<\/(?:div|section|article)>/gi) || []
  let best = ''
  for (const block of blocks) {
    const text = block.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    // Look for job-related keywords
    const hasKeywords = /\b(responsibilities|qualifications|requirements|experience|skills|salary|benefits|apply)\b/i.test(text)
    if (hasKeywords && text.length > best.length && text.length < 15000) {
      best = block.replace(/^<[^>]*>/, '').replace(/<\/[^>]*>$/, '')
    }
  }

  return best.length > 300 ? best : null
}

// ===== STEP 3: Re-fetch Lever with full HTML descriptions =====
async function enrichLever() {
  console.log('\n🏢 Re-fetching Lever descriptions...\n')

  const LEVER_BOARDS = [
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
    {s:'travelperka',n:'TravelPerk'},{s:'truecaller',n:'Truecaller'},
    {s:'geckoboard',n:'Geckoboard'},
  ]

  let updated = 0

  for (const co of LEVER_BOARDS) {
    try {
      const res = await fetch(`https://api.lever.co/v0/postings/${co.s}?mode=json`)
      if (!res.ok) continue
      const jobs = await res.json()
      if (!Array.isArray(jobs)) continue

      for (const j of jobs) {
        // Lever has descriptionPlain AND description (HTML)
        const htmlDesc = j.description || ''
        const listsHtml = (j.lists || []).map(l => {
          const items = (l.content || '').trim()
          return `<h3>${l.text}</h3>${items}`
        }).join('')

        const fullDesc = htmlDesc + listsHtml
        if (fullDesc.length < 100) continue

        // Find in our DB
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
            .ilike('companies.name', co.n)
            .limit(1)
          if (byTitle && byTitle.length > 0) existing = byTitle[0]
        }

        if (!existing) continue

        if (fullDesc.length > (existing.description || '').length) {
          await supabase.from('jobs').update({
            description: fullDesc.substring(0, 10000),
          }).eq('id', existing.id)
          updated++
          process.stdout.write(`  ✓ ${co.n}: ${j.text}\n`)
        }
      }
      await sleep(300)
    } catch (e) {}
  }

  console.log(`\n  Lever: ${updated} jobs enriched\n`)
  return updated
}

// ===== MAIN =====
async function main() {
  console.log('🔍 ShowJob Enrichment Script\n')
  console.log('='.repeat(50))

  let total = 0

  if (doAll || doGreenhouse || (!doAdzuna)) {
    total += await enrichGreenhouse()
    total += await enrichLever()
  }

  if (doAll || doAdzuna || (!doGreenhouse)) {
    total += await enrichFromSourceURLs()
  }

  console.log('='.repeat(50))
  console.log(`\n✅ Done. ${total} total jobs enriched.\n`)
}

main().catch(console.error)
