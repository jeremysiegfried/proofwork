// Seeds ProofWork database with real UK tech jobs
// Run: node scripts/seed.mjs

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://fovjkyqimtafpzdwtatp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvdmpreXFpbXRhZnB6ZHd0YXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzQ5OTUsImV4cCI6MjA5MTQxMDk5NX0.qG50PxCyWTL9gyb8jlqjJsKQ6gJGULbOizqxezQTais'
)

const COMPANIES = [
  { name:'Monzo', slug:'monzo', logo_emoji:'💳', employee_count:'3,200', founded:'2015', funding:'IPO-track', glassdoor_rating:4.5, tech_stack:['Go','Kubernetes','Cassandra','Kafka','AWS'], claimed:true, benefits:['28 days holiday','Stock options','Mental health support','£1k home office','Sabbatical at 5yrs'], progression:'Staff → Principal: ~24mo | Principal → Distinguished: ~36mo', satisfaction:4.7 },
  { name:'Octopus Energy', slug:'octopus-energy', logo_emoji:'🐙', employee_count:'2,800', founded:'2015', funding:'Series F · £530M', glassdoor_rating:4.3, tech_stack:['React','TypeScript','Next.js','Python','Django','AWS'], claimed:true, benefits:['30 days holiday','Equity','£2k learning budget','Enhanced parental leave','Hybrid flexible'], progression:'Mid → Senior: ~18mo | Senior → Staff: ~24mo', satisfaction:4.6 },
  { name:'Wise', slug:'wise', logo_emoji:'💸', employee_count:'4,500', founded:'2011', funding:'Public (LON: WISE)', glassdoor_rating:4.2, tech_stack:['Java','React','Kubernetes','AWS','PostgreSQL'], claimed:true, benefits:['25 days holiday','RSUs','Sabbatical at 4yrs','Remote-friendly'], progression:'Mid → Senior: ~18mo', satisfaction:4.4 },
  { name:'Graphcore', slug:'graphcore', logo_emoji:'🧠', employee_count:'600', founded:'2016', funding:'Series E · £500M', glassdoor_rating:3.8, tech_stack:['Python','PyTorch','C++','CUDA','PopART'], claimed:false, benefits:[], progression:'', satisfaction:0 },
  { name:'Starling Bank', slug:'starling-bank', logo_emoji:'🏦', employee_count:'1,800', founded:'2014', funding:'Series D', glassdoor_rating:4.1, tech_stack:['AWS','Terraform','Docker','Kubernetes','Datadog'], claimed:false, benefits:[], progression:'', satisfaction:0 },
  { name:'Skyscanner', slug:'skyscanner', logo_emoji:'✈️', employee_count:'1,200', founded:'2003', funding:'Acquired by Trip.com', glassdoor_rating:4.0, tech_stack:['Python','React','AWS','Spark','Airflow'], claimed:false, benefits:[], progression:'', satisfaction:0 },
  { name:'Revolut', slug:'revolut', logo_emoji:'💜', employee_count:'8,000', founded:'2015', funding:'Series E · $800M', glassdoor_rating:3.4, tech_stack:['Kotlin','Swift','React','gRPC','Firebase'], claimed:false, benefits:[], progression:'', satisfaction:0 },
  { name:'Deliveroo', slug:'deliveroo', logo_emoji:'🚲', employee_count:'2,500', founded:'2013', funding:'Public (LON: ROO)', glassdoor_rating:3.6, tech_stack:['Python','Go','React','AWS','Kafka'], claimed:false, benefits:[], progression:'', satisfaction:0 },
  { name:'Form3', slug:'form3', logo_emoji:'🏗️', employee_count:'400', founded:'2016', funding:'Series C · £120M', glassdoor_rating:4.2, tech_stack:['Go','Kubernetes','AWS','Terraform','PostgreSQL'], claimed:false, benefits:[], progression:'', satisfaction:0 },
  { name:'Lyst', slug:'lyst', logo_emoji:'🛍️', employee_count:'150', founded:'2010', funding:'Series C', glassdoor_rating:3.7, tech_stack:['Python','Django','React','PostgreSQL','AWS'], claimed:false, benefits:[], progression:'', satisfaction:0 },
  { name:'NatWest Group', slug:'natwest-group', logo_emoji:'🏛️', employee_count:'61,000', founded:'1968', funding:'Public (LON: NWG)', glassdoor_rating:3.6, tech_stack:['Java','React','Spring','AWS','Oracle'], claimed:false, benefits:[], progression:'', satisfaction:0 },
  { name:'Checkout.com', slug:'checkout-com', logo_emoji:'💳', employee_count:'1,800', founded:'2012', funding:'Series D · $1B', glassdoor_rating:3.9, tech_stack:['Go','Kotlin','React','AWS','Kubernetes'], claimed:false, benefits:[], progression:'', satisfaction:0 },
]

const JOBS = [
  // CLAIMED COMPANIES — verified data, high trust
  { co:'Monzo', title:'Staff Backend Engineer', slug:'staff-backend-engineer-monzo', location:'London', remote:'Remote OK (UK)', salary_min:115000, salary_max:150000, tags:['Go','Kubernetes','Microservices','Cassandra'], has_challenge:true, source:'claimed', desc:'Design and build distributed systems handling millions of daily transactions across Monzo\'s core banking platform serving 8M+ customers.', reqs:['5+ years backend engineering','Go or systems language','Distributed systems experience','Technical leadership track record'] },
  { co:'Monzo', title:'Senior iOS Engineer', slug:'senior-ios-engineer-monzo', location:'London', remote:'Remote OK (UK)', salary_min:85000, salary_max:115000, tags:['Swift','SwiftUI','iOS','CI/CD'], has_challenge:true, source:'claimed', desc:'Build and maintain the Monzo iOS app used by millions of customers daily. Focus on performance, accessibility, and delightful user experiences.', reqs:['4+ years iOS development','Swift expertise','UIKit and SwiftUI','Testing best practices'] },
  { co:'Monzo', title:'Data Engineer', slug:'data-engineer-monzo', location:'London', remote:'Remote OK (UK)', salary_min:75000, salary_max:100000, tags:['Python','SQL','Spark','Airflow','AWS'], has_challenge:true, source:'claimed', desc:'Build data pipelines that power Monzo\'s analytics, ML models, and regulatory reporting. Work with petabytes of financial data.', reqs:['3+ years data engineering','Python and SQL','Spark or similar','Cloud data platforms'] },
  { co:'Monzo', title:'Product Manager', slug:'product-manager-monzo', location:'London', remote:'Hybrid', salary_min:80000, salary_max:110000, tags:['Product','Analytics','Fintech'], has_challenge:false, source:'claimed', desc:'Own the product roadmap for a core Monzo feature used by millions. Drive strategy, run experiments, and ship improvements weekly.', reqs:['3+ years product management','Data-driven decision making','Fintech or consumer tech experience','Strong communication skills'] },
  { co:'Octopus Energy', title:'Senior Frontend Engineer', slug:'senior-frontend-engineer-octopus-energy', location:'London', remote:'Hybrid', salary_min:75000, salary_max:95000, tags:['React','TypeScript','Node.js','GraphQL'], has_challenge:true, source:'claimed', desc:'Own features from design through deployment on React apps used by 3M+ customers. Strong engineering culture, weekly learning sessions, real impact on climate tech.', reqs:['3+ years React/TypeScript','Large-scale SPA experience','Web performance knowledge','CI/CD pipelines'] },
  { co:'Octopus Energy', title:'Python Developer', slug:'python-developer-octopus-energy', location:'Brighton', remote:'Hybrid', salary_min:55000, salary_max:75000, tags:['Python','Django','PostgreSQL','AWS'], has_challenge:true, source:'claimed', desc:'Build the systems that manage energy for millions of homes. Work on Django applications that handle billing, smart meters, and tariff calculations.', reqs:['2+ years Python','Django experience','SQL proficiency','Interest in energy/climate'] },
  { co:'Octopus Energy', title:'Engineering Manager', slug:'engineering-manager-octopus-energy', location:'London', remote:'Hybrid', salary_min:95000, salary_max:120000, tags:['Leadership','Python','React','Agile'], has_challenge:false, source:'claimed', desc:'Lead a team of 6-8 engineers building customer-facing energy products. Balance technical direction with people development.', reqs:['Engineering management experience','Technical background','Coaching and mentoring','Delivery track record'] },
  { co:'Wise', title:'Product Designer', slug:'product-designer-wise', location:'London', remote:'Hybrid', salary_min:65000, salary_max:85000, tags:['Figma','Research','Design Systems'], has_challenge:true, source:'claimed', desc:'Design consumer financial products used by 16M+ customers across 80 countries. Work on the core send-money experience.', reqs:['3+ years product design','Figma expertise','User research experience','Design system thinking'] },
  { co:'Wise', title:'Senior Backend Engineer', slug:'senior-backend-engineer-wise', location:'London', remote:'Hybrid', salary_min:80000, salary_max:105000, tags:['Java','Kubernetes','PostgreSQL','AWS'], has_challenge:true, source:'claimed', desc:'Build scalable payment infrastructure processing billions in cross-border transfers. Work on low-latency, high-reliability systems.', reqs:['4+ years backend','Java or similar','Distributed systems','Payment systems interest'] },
  { co:'Wise', title:'Data Analyst', slug:'data-analyst-wise', location:'London', remote:'Hybrid', salary_min:50000, salary_max:68000, tags:['SQL','Python','Looker','Analytics'], has_challenge:false, source:'claimed', desc:'Analyse product and business data to drive decisions across Wise\'s consumer platform. Build dashboards and run experiments.', reqs:['2+ years analytics','SQL expert','Python for analysis','BI tools experience'] },

  // SCRAPED — unclaimed, low trust
  { co:'Graphcore', title:'ML Engineer (Large Systems)', slug:'ml-engineer-large-systems-graphcore', location:'Bristol', remote:'On-site', salary_min:0, salary_max:0, salary_estimated:'£75k–£110k', tags:['Python','PyTorch','CUDA','C++'], has_challenge:false, source:'career page', desc:'Build and optimise AI models for Graphcore\'s specialised IPU hardware. Work on large-scale training systems and model compilation pipelines.', reqs:['Strong Python','ML framework experience','GPU/accelerator knowledge'] },
  { co:'Graphcore', title:'Senior Software Engineer (Compiler)', slug:'senior-software-engineer-compiler-graphcore', location:'Bristol', remote:'On-site', salary_min:0, salary_max:0, salary_estimated:'£80k–£120k', tags:['C++','LLVM','Compilers','Python'], has_challenge:false, source:'career page', desc:'Work on the Poplar compiler toolchain that translates ML models to run on Graphcore\'s IPU processors.', reqs:['C++ expertise','Compiler development','Performance optimisation'] },
  { co:'Starling Bank', title:'DevOps Engineer', slug:'devops-engineer-starling-bank', location:'Manchester', remote:'Remote OK', salary_min:0, salary_max:0, salary_estimated:'£65k–£90k', tags:['AWS','Terraform','Docker','Kubernetes'], has_challenge:false, source:'career page', desc:'Scale Starling\'s cloud infrastructure across AWS. Focus on reliability, observability, and developer experience.', reqs:['AWS certified or equivalent','Terraform','Container orchestration','On-call experience'] },
  { co:'Starling Bank', title:'Senior Backend Engineer', slug:'senior-backend-engineer-starling-bank', location:'London', remote:'Hybrid', salary_min:0, salary_max:0, salary_estimated:'£75k–£100k', tags:['Java','Spring','AWS','Microservices'], has_challenge:false, source:'career page', desc:'Build and maintain core banking APIs handling millions of transactions for Starling\'s mobile-first platform.', reqs:['Java/Spring experience','API design','Banking or fintech background preferred'] },
  { co:'Skyscanner', title:'Data Scientist', slug:'data-scientist-skyscanner', location:'Edinburgh', remote:'Hybrid', salary_min:0, salary_max:0, salary_estimated:'£55k–£80k', tags:['Python','ML','SQL','Spark'], has_challenge:false, source:'career page', desc:'Build recommendation and ranking systems for hotels, cars, and travel products at global scale.', reqs:['Python','ML experience','SQL proficiency'] },
  { co:'Skyscanner', title:'Frontend Engineer', slug:'frontend-engineer-skyscanner', location:'Edinburgh', remote:'Hybrid', salary_min:0, salary_max:0, salary_estimated:'£50k–£75k', tags:['React','TypeScript','Node.js','CSS'], has_challenge:false, source:'career page', desc:'Build fast, accessible search and booking interfaces used by 100M+ monthly travellers worldwide.', reqs:['React/TypeScript','Performance optimisation','Accessibility knowledge'] },
  { co:'Revolut', title:'Senior iOS Engineer', slug:'senior-ios-engineer-revolut', location:'London', remote:'On-site', salary_min:0, salary_max:0, salary_estimated:'£85k–£120k', tags:['Swift','SwiftUI','Objective-C','CI/CD'], has_challenge:false, source:'career page', desc:'Work on the Revolut iOS app used by 35M+ customers globally. Build new financial products and improve core features.', reqs:['4+ years iOS','Swift','UIKit/SwiftUI','CI/CD pipelines'] },
  { co:'Revolut', title:'Backend Engineer (Crypto)', slug:'backend-engineer-crypto-revolut', location:'London', remote:'On-site', salary_min:0, salary_max:0, salary_estimated:'£80k–£115k', tags:['Kotlin','Java','Microservices','Crypto'], has_challenge:false, source:'career page', desc:'Build and scale Revolut\'s cryptocurrency trading platform handling millions of trades daily.', reqs:['Kotlin or Java','High-throughput systems','Financial systems experience'] },
  { co:'Deliveroo', title:'Senior Machine Learning Engineer', slug:'senior-ml-engineer-deliveroo', location:'London', remote:'Hybrid', salary_min:0, salary_max:0, salary_estimated:'£85k–£115k', tags:['Python','ML','TensorFlow','AWS'], has_challenge:false, source:'career page', desc:'Build ML models for delivery time prediction, restaurant ranking, and personalisation across Deliveroo\'s marketplace.', reqs:['3+ years ML engineering','Python','Production ML systems','Deep learning frameworks'] },
  { co:'Deliveroo', title:'Staff Engineer (Payments)', slug:'staff-engineer-payments-deliveroo', location:'London', remote:'Hybrid', salary_min:0, salary_max:0, salary_estimated:'£110k–£140k', tags:['Go','Python','Kafka','AWS','Payments'], has_challenge:false, source:'career page', desc:'Lead technical direction for Deliveroo\'s payments platform processing millions of orders across 10+ markets.', reqs:['7+ years engineering','Payments or fintech','System design','Technical leadership'] },
  { co:'Form3', title:'Go Engineer', slug:'go-engineer-form3', location:'London', remote:'Remote OK', salary_min:0, salary_max:0, salary_estimated:'£70k–£95k', tags:['Go','Kubernetes','AWS','Terraform'], has_challenge:false, source:'career page', desc:'Build cloud-native payment processing infrastructure handling real-time bank transfers across the UK and Europe.', reqs:['Go experience','Cloud-native development','API design','Testing practices'] },
  { co:'Form3', title:'Platform Engineer', slug:'platform-engineer-form3', location:'London', remote:'Remote OK', salary_min:0, salary_max:0, salary_estimated:'£75k–£100k', tags:['Kubernetes','Terraform','AWS','Go'], has_challenge:false, source:'career page', desc:'Build and operate the platform that Form3\'s payment services run on. Focus on reliability, security, and developer experience.', reqs:['Kubernetes expertise','Infrastructure as code','AWS','Monitoring and observability'] },
  { co:'Lyst', title:'Senior Python Engineer', slug:'senior-python-engineer-lyst', location:'London', remote:'Hybrid', salary_min:0, salary_max:0, salary_estimated:'£65k–£90k', tags:['Python','Django','PostgreSQL','React'], has_challenge:false, source:'career page', desc:'Build the platform connecting 200M+ shoppers with 8,000+ fashion brands. Work on search, recommendations, and e-commerce infrastructure.', reqs:['Python/Django expertise','PostgreSQL','REST API design','E-commerce experience a plus'] },
  { co:'NatWest Group', title:'Full Stack Developer', slug:'full-stack-developer-natwest', location:'Edinburgh', remote:'Hybrid', salary_min:55000, salary_max:72000, tags:['Java','React','Spring','SQL'], has_challenge:false, source:'adzuna', desc:'Join NatWest\'s digital banking team building internal tools and customer-facing applications.', reqs:['Java','React','SQL'] },
  { co:'NatWest Group', title:'Cloud Engineer', slug:'cloud-engineer-natwest', location:'London', remote:'Hybrid', salary_min:60000, salary_max:78000, tags:['AWS','Azure','Terraform','Python'], has_challenge:false, source:'adzuna', desc:'Migrate legacy infrastructure to cloud platforms and build CI/CD pipelines for NatWest\'s engineering teams.', reqs:['AWS or Azure','Infrastructure as code','Scripting'] },
  { co:'Checkout.com', title:'Senior Go Engineer', slug:'senior-go-engineer-checkout-com', location:'London', remote:'On-site', salary_min:0, salary_max:0, salary_estimated:'£90k–£130k', tags:['Go','Kubernetes','gRPC','AWS'], has_challenge:false, source:'career page', desc:'Build high-performance payment processing services handling thousands of transactions per second for global merchants.', reqs:['Go expertise','High-throughput systems','API design','Payments experience preferred'] },
  { co:'Checkout.com', title:'Engineering Manager', slug:'engineering-manager-checkout-com', location:'London', remote:'Hybrid', salary_min:0, salary_max:0, salary_estimated:'£110k–£140k', tags:['Leadership','Go','Kotlin','Payments'], has_challenge:false, source:'career page', desc:'Lead a squad of 6-10 engineers building merchant-facing payment products. Balance delivery with team growth.', reqs:['Engineering management experience','Payments or fintech','Technical credibility','Hiring and coaching'] },
]

function calcTrust(job, company) {
  let s = 0
  if (job.salary_min > 0) s += 30
  if (company.benefits?.length > 0) s += 20
  if (company.progression) s += 20
  if (company.satisfaction > 0) s += 15
  if (job.has_challenge) s += 15
  return s
}

async function seed() {
  console.log('🌱 Seeding ProofWork database...\n')

  // Insert companies
  for (const co of COMPANIES) {
    const { error } = await supabase.from('companies').upsert(co, { onConflict: 'slug' })
    if (error) { console.error(`  ❌ Company ${co.name}: ${error.message}`); continue }
    console.log(`🏢 ${co.name} ${co.claimed ? '✓ verified' : '(unclaimed)'}`)
  }

  // Get company IDs
  const { data: allCos } = await supabase.from('companies').select('id, name, slug, benefits, progression, satisfaction')
  const coMap = {}
  for (const co of allCos) coMap[co.name] = co

  console.log('')

  // Insert jobs
  let count = 0
  for (const job of JOBS) {
    const company = coMap[job.co]
    if (!company) { console.error(`  ❌ Company not found: ${job.co}`); continue }

    const trust = calcTrust(job, company)
    const row = {
      company_id: company.id,
      title: job.title,
      slug: job.slug,
      description: job.desc,
      location: job.location,
      remote_policy: job.remote,
      job_type: 'Full-time',
      salary_min: job.salary_min || 0,
      salary_max: job.salary_max || 0,
      salary_estimated: job.salary_estimated || '',
      tags: job.tags,
      requirements: job.reqs || [],
      trust_score: trust,
      has_challenge: job.has_challenge,
      source: job.source || 'scraped',
      active: true,
    }

    const { error } = await supabase.from('jobs').upsert(row, { onConflict: 'company_id,slug' })
    if (error) { console.error(`  ❌ ${job.title}: ${error.message}`); continue }

    const sal = job.salary_min > 0 ? ` £${Math.round(job.salary_min/1000)}k–${Math.round(job.salary_max/1000)}k` : job.salary_estimated ? ` est. ${job.salary_estimated}` : ''
    console.log(`  ✓ ${job.title} at ${job.co}${sal} [trust: ${trust}]`)
    count++
  }

  console.log(`\n✅ Done! ${COMPANIES.length} companies, ${count} jobs`)
  console.log('🌐 Run: npm run dev → http://localhost:3000')
}

seed().catch(console.error)
