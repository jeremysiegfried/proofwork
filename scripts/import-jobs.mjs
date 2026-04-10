// Import scraped jobs into Supabase
// Usage: node scripts/import-jobs.mjs [path-to-json]
// Default path: ./proofwork_jobs_export.json

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const SUPABASE_URL = 'https://fovjkyqimtafpzdwtatp.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvdmpreXFpbXRhZnB6ZHd0YXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzQ5OTUsImV4cCI6MjA5MTQxMDk5NX0.qG50PxCyWTL9gyb8jlqjJsKQ6gJGULbOizqxezQTais'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Known company enrichment data
const COMPANY_DATA = {
  'monzo': { emoji: '💳', employees: '3,200', founded: '2015', funding: 'IPO-track', glassdoor: 4.5, stack: ['Go','Kubernetes','Cassandra','Kafka','AWS'] },
  'octopus energy': { emoji: '🐙', employees: '2,800', founded: '2015', funding: 'Series F · £530M', glassdoor: 4.3, stack: ['React','TypeScript','Next.js','Python','AWS'] },
  'graphcore': { emoji: '🧠', employees: '600', founded: '2016', funding: 'Series E · £500M', glassdoor: 3.8, stack: ['Python','PyTorch','C++','CUDA'] },
  'skyscanner': { emoji: '✈️', employees: '1,200', founded: '2003', funding: 'Acquired by Trip.com', glassdoor: 4.0, stack: ['Python','React','AWS','Spark'] },
  'form3': { emoji: '🏗️', employees: '400', founded: '2016', funding: 'Series C · £120M', glassdoor: 4.2, stack: ['Go','Kubernetes','AWS','Terraform'] },
  'lyst': { emoji: '🛍️', employees: '150', founded: '2010', funding: 'Series C', glassdoor: 3.7, stack: ['Python','Django','React','PostgreSQL'] },
  'starling bank': { emoji: '🏦', employees: '1,800', founded: '2014', funding: 'Series D', glassdoor: 4.1, stack: ['AWS','Terraform','Docker','Kubernetes'] },
  'revolut': { emoji: '💜', employees: '8,000', founded: '2015', funding: 'Series E · $800M', glassdoor: 3.4, stack: ['Kotlin','Swift','React','gRPC'] },
  'wise': { emoji: '💸', employees: '4,500', founded: '2011', funding: 'Public (LON: WISE)', glassdoor: 4.2, stack: ['Java','React','Kubernetes','AWS'] },
  'deliveroo': { emoji: '🚲', employees: '2,500', founded: '2013', funding: 'Public (LON: ROO)', glassdoor: 3.6, stack: ['Python','React','Go','AWS'] },
}

// Common tech skills for tag extraction
const SKILLS = ['python','javascript','typescript','react','node.js','nodejs','go','golang','java','kotlin','swift','rust','c++','c#','.net','ruby','php','scala','elixir','clojure','r','sql','nosql','mongodb','postgresql','postgres','mysql','redis','elasticsearch','graphql','rest','api','aws','azure','gcp','google cloud','docker','kubernetes','k8s','terraform','ansible','jenkins','ci/cd','cicd','git','linux','bash','html','css','sass','tailwind','next.js','nextjs','vue','angular','svelte','django','flask','fastapi','spring','rails','express','nestjs','pytorch','tensorflow','scikit-learn','pandas','numpy','spark','airflow','kafka','rabbitmq','figma','sketch','adobe','ux','ui','agile','scrum','jira','confluence','datadog','grafana','prometheus','nginx','cloudflare']

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 100)
}

function extractTags(text) {
  if (!text) return []
  const lower = text.toLowerCase()
  const found = SKILLS.filter(s => {
    const regex = new RegExp(`\\b${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    return regex.test(lower)
  })
  // Deduplicate and normalize
  const normalized = [...new Set(found.map(s => {
    if (s === 'golang') return 'Go'
    if (s === 'nodejs' || s === 'node.js') return 'Node.js'
    if (s === 'nextjs' || s === 'next.js') return 'Next.js'
    if (s === 'k8s') return 'Kubernetes'
    if (s === 'postgres') return 'PostgreSQL'
    if (s === 'cicd' || s === 'ci/cd') return 'CI/CD'
    return s.charAt(0).toUpperCase() + s.slice(1)
  }))]
  return normalized.slice(0, 8)
}

function extractRemotePolicy(text) {
  if (!text) return 'On-site'
  const lower = text.toLowerCase()
  if (lower.includes('fully remote') || lower.includes('100% remote')) return 'Remote'
  if (lower.includes('remote') && lower.includes('hybrid')) return 'Hybrid / Remote'
  if (lower.includes('remote')) return 'Remote OK'
  if (lower.includes('hybrid')) return 'Hybrid'
  return 'On-site'
}

function calculateTrustScore(job, company) {
  let score = 0
  if (job.salary_min > 0) score += 30
  if (company.benefits && company.benefits.length > 0) score += 20
  if (company.progression) score += 20
  if (company.satisfaction > 0) score += 15
  if (job.has_challenge) score += 15
  return score
}

async function importJobs() {
  // Find the JSON file
  const jsonPath = process.argv[2] || './proofwork_jobs_export.json'
  
  let rawData
  try {
    rawData = readFileSync(resolve(jsonPath), 'utf-8')
    console.log(`📄 Reading from: ${resolve(jsonPath)}`)
  } catch (e) {
    console.error(`❌ Could not find ${jsonPath}`)
    console.error(`   Try: node scripts/import-jobs.mjs "C:\\Users\\jerem\\Downloads\\proofwork_jobs_export.json"`)
    process.exit(1)
  }

  const jobs = JSON.parse(rawData)
  console.log(`📦 Found ${jobs.length} jobs to import\n`)

  // Group by company
  const companies = {}
  for (const job of jobs) {
    const coName = job.company || 'Unknown'
    if (!companies[coName]) {
      companies[coName] = { name: coName, jobs: [] }
    }
    companies[coName].jobs.push(job)
  }

  let companyCount = 0
  let jobCount = 0
  let skipped = 0

  for (const [coName, coData] of Object.entries(companies)) {
    const coKey = coName.toLowerCase()
    const enrichment = COMPANY_DATA[coKey] || {}

    // Upsert company
    const companyRow = {
      name: coName,
      slug: slugify(coName),
      logo_emoji: enrichment.emoji || '',
      employee_count: enrichment.employees || '',
      founded: enrichment.founded || '',
      funding: enrichment.funding || '',
      glassdoor_rating: enrichment.glassdoor || 0,
      tech_stack: enrichment.stack || [],
      claimed: false,
    }

    const { data: company, error: coError } = await supabase
      .from('companies')
      .upsert(companyRow, { onConflict: 'slug' })
      .select()
      .single()

    if (coError) {
      console.error(`  ❌ Company "${coName}": ${coError.message}`)
      continue
    }

    companyCount++
    console.log(`🏢 ${coName} (${coData.jobs.length} jobs)`)

    // Import each job
    for (const job of coData.jobs) {
      const title = job.title || job.job_title || 'Untitled'
      const desc = job.description || ''
      const location = job.location || ''
      const salaryMin = job.salary_min || job.salaryMin || 0
      const salaryMax = job.salary_max || job.salaryMax || 0
      const tags = extractTags(title + ' ' + desc)
      const remote = extractRemotePolicy(title + ' ' + desc + ' ' + location)

      const jobSlug = slugify(`${title}-${coName}`)

      const jobRow = {
        company_id: company.id,
        title: title,
        slug: jobSlug,
        description: desc.substring(0, 5000),
        location: location,
        remote_policy: remote,
        job_type: 'Full-time',
        salary_min: salaryMin,
        salary_max: salaryMax,
        salary_estimated: salaryMin === 0 ? '' : '',
        tags: tags,
        requirements: [],
        trust_score: calculateTrustScore({ salary_min: salaryMin, has_challenge: false }, company),
        has_challenge: false,
        source: job.source || 'scraped',
        source_url: job.url || job.source_url || '',
        active: true,
      }

      const { error: jobError } = await supabase
        .from('jobs')
        .upsert(jobRow, { onConflict: 'company_id,slug' })

      if (jobError) {
        if (jobError.message.includes('duplicate')) {
          skipped++
        } else {
          console.error(`    ❌ "${title}": ${jobError.message}`)
        }
      } else {
        jobCount++
        const salaryStr = salaryMin > 0 ? ` £${Math.round(salaryMin/1000)}k–${Math.round(salaryMax/1000)}k` : ''
        console.log(`    ✓ ${title}${salaryStr} [${tags.join(', ')}]`)
      }
    }
  }

  console.log(`\n✅ Done!`)
  console.log(`   ${companyCount} companies`)
  console.log(`   ${jobCount} jobs imported`)
  if (skipped > 0) console.log(`   ${skipped} duplicates skipped`)
  console.log(`\n🌐 View at: http://localhost:3000/jobs`)
}

importJobs().catch(console.error)
