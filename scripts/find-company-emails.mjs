// Extract contact emails from job descriptions + guess company domains
// Run: node scripts/find-company-emails.mjs

import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'

const SUPABASE_URL = 'https://fovjkyqimtafpzdwtatp.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvdmpreXFpbXRhZnB6ZHd0YXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzQ5OTUsImV4cCI6MjA5MTQxMDk5NX0.qG50PxCyWTL9gyb8jlqjJsKQ6gJGULbOizqxezQTais'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Email regex
var emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g

// Ignore these domains (job boards, not companies)
var ignoreDomains = ['adzuna.co.uk', 'indeed.com', 'reed.co.uk', 'linkedin.com', 'totaljobs.com', 
  'example.com', 'email.com', 'test.com', 'gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com',
  'googlemail.com', 'icloud.com', 'protonmail.com', 'mail.com', 'aol.com',
  'sentry.io', 'w3.org', 'schema.org', 'placeholder.com', 'company.com', 'yourcompany.com',
  'youremail.com', 'email.co.uk', 'yourname.com']

// Known company domain mappings
var knownDomains = {
  'monzo': 'monzo.com',
  'deliveroo': 'deliveroo.com',
  'revolut': 'revolut.com',
  'wise': 'wise.com',
  'octopus energy': 'octopusenergy.com',
  'starling bank': 'starlingbank.com',
  'skyscanner': 'skyscanner.net',
  'google': 'google.com',
  'microsoft': 'microsoft.com',
  'barclays': 'barclays.com',
  'barclays uk': 'barclays.co.uk',
  'natwest group': 'natwest.com',
  'lloyds bank': 'lloydsbank.com',
  'jpmorgan': 'jpmorgan.com',
  'jpmorganchase': 'jpmorganchase.com',
  'citi': 'citi.com',
  'accenture': 'accenture.com',
  'ee': 'ee.co.uk',
  'form3': 'form3.tech',
  'checkout.com': 'checkout.com',
  'snyk': 'snyk.io',
  'reed': 'reed.com',
  'hays': 'hays.com',
  'adecco': 'adecco.co.uk',
  'robert half': 'roberthalf.co.uk',
  'saab uk': 'saab.com',
  'thg': 'thg.com',
  'capita': 'capita.com',
  'bae systems': 'baesystems.com',
  'rolls-royce': 'rolls-royce.com',
  'bt group': 'bt.com',
  'vodafone': 'vodafone.com',
  'sky': 'sky.com',
  'bbc': 'bbc.co.uk',
  'itv': 'itv.com',
  'astrazeneca': 'astrazeneca.com',
  'unilever': 'unilever.com',
  'hsbc': 'hsbc.com',
  'amazon': 'amazon.co.uk',
  'meta': 'meta.com',
  'apple': 'apple.com',
  'ibm': 'ibm.com',
  'deloitte': 'deloitte.co.uk',
  'pwc': 'pwc.co.uk',
  'kpmg': 'kpmg.co.uk',
  'ey': 'ey.com',
  'marsh mclennan': 'marshmclennan.com',
  'capital one': 'capitalone.co.uk',
  'gopuff': 'gopuff.com',
  'motorway': 'motorway.co.uk',
  'paddle': 'paddle.com',
  'thought machine': 'thoughtmachine.net',
}

function guessDomain(companyName) {
  var lower = companyName.toLowerCase().trim()
  
  // Check known domains
  if (knownDomains[lower]) return knownDomains[lower]
  
  // Try to construct domain from name
  var clean = lower
    .replace(/\s*(ltd|limited|plc|uk|group|inc|corp|holdings|trading as.*|recruitment|solutions|consulting|services|technologies|digital)\.?\s*/gi, '')
    .trim()
    .replace(/[^a-z0-9]/g, '')
  
  if (clean.length >= 3) {
    return clean + '.com'
  }
  return null
}

async function main() {
  console.log('Fetching all jobs with descriptions...\n')

  var allJobs = []
  var offset = 0
  while (true) {
    var { data, error } = await supabase
      .from('jobs')
      .select('id, title, description, source_url, company_id, companies(id, name, slug)')
      .eq('active', true)
      .range(offset, offset + 999)
    if (error || !data || data.length === 0) break
    allJobs = allJobs.concat(data)
    offset += 1000
    if (data.length < 1000) break
  }

  console.log('Scanning ' + allJobs.length + ' job descriptions for emails...\n')

  // Group by company
  var companyData = {} // companyId -> { name, slug, jobs, emails, domain }

  for (var i = 0; i < allJobs.length; i++) {
    var job = allJobs[i]
    var companyId = job.company_id
    var companyName = job.companies?.name || 'Unknown'
    var companySlug = job.companies?.slug || ''

    if (!companyData[companyId]) {
      companyData[companyId] = {
        name: companyName,
        slug: companySlug,
        jobs: 0,
        emails: new Set(),
        guessedDomain: guessDomain(companyName),
      }
    }
    companyData[companyId].jobs++

    // Scan description for emails
    var desc = (job.description || '') + ' ' + (job.source_url || '')
    var matches = desc.match(emailRegex)
    if (matches) {
      matches.forEach(function(email) {
        var emailLower = email.toLowerCase()
        var domain = emailLower.split('@')[1]
        // Skip job board and personal email domains
        if (!ignoreDomains.includes(domain)) {
          companyData[companyId].emails.add(emailLower)
        }
      })
    }
  }

  // Convert to array and sort by jobs
  var companies = Object.values(companyData).map(function(c) {
    return {
      name: c.name,
      slug: c.slug,
      jobs: c.jobs,
      emails: Array.from(c.emails),
      guessedDomain: c.guessedDomain,
    }
  })
  companies.sort(function(a, b) { return b.jobs - a.jobs })

  // Stats
  var withEmails = companies.filter(function(c) { return c.emails.length > 0 })
  var withDomains = companies.filter(function(c) { return c.guessedDomain })

  console.log('='.repeat(70))
  console.log('EMAIL DISCOVERY RESULTS')
  console.log('='.repeat(70))
  console.log('')
  console.log('Total companies:             ' + companies.length)
  console.log('Found emails in descriptions: ' + withEmails.length)
  console.log('Total emails found:          ' + withEmails.reduce(function(a, c) { return a + c.emails.length }, 0))
  console.log('Guessed domains:             ' + withDomains.length)
  console.log('')

  // Show companies with found emails
  if (withEmails.length > 0) {
    console.log('='.repeat(70))
    console.log('COMPANIES WITH EMAILS FOUND IN JOB DESCRIPTIONS')
    console.log('='.repeat(70))
    console.log('')
    withEmails.forEach(function(c) {
      console.log(c.name + ' (' + c.jobs + ' jobs)')
      c.emails.forEach(function(e) {
        console.log('  → ' + e)
      })
      console.log('')
    })
  }

  // Show top targets with guessed contact emails
  console.log('='.repeat(70))
  console.log('TOP OUTREACH TARGETS WITH SUGGESTED EMAILS')
  console.log('='.repeat(70))
  console.log('')

  var targets = companies.filter(function(c) { return c.jobs >= 2 })
  targets.forEach(function(c) {
    var domain = c.guessedDomain
    var foundEmail = c.emails.length > 0 ? c.emails[0] : null
    
    if (foundEmail) {
      var foundDomain = foundEmail.split('@')[1]
      domain = foundDomain // Use the real domain we found
    }

    var contactEmails = []
    if (foundEmail) {
      contactEmails.push(foundEmail + ' (FOUND in job description)')
    }
    if (domain) {
      contactEmails.push('careers@' + domain)
      contactEmails.push('hr@' + domain)
      contactEmails.push('talent@' + domain)
      contactEmails.push('recruitment@' + domain)
    }

    console.log(c.name.padEnd(45) + c.jobs + ' jobs')
    if (contactEmails.length > 0) {
      contactEmails.slice(0, 3).forEach(function(e) {
        console.log('  → ' + e)
      })
    } else {
      console.log('  → (no domain found)')
    }
    console.log('')
  })

  // Export CSV
  var csvLines = ['Company,Jobs,Email Found,Guessed Domain,Careers Email,HR Email,ShowJob URL']
  targets.forEach(function(c) {
    var domain = c.guessedDomain
    if (c.emails.length > 0) {
      domain = c.emails[0].split('@')[1]
    }
    csvLines.push([
      '"' + c.name.replace(/"/g, '""') + '"',
      c.jobs,
      c.emails[0] || '',
      domain || '',
      domain ? 'careers@' + domain : '',
      domain ? 'hr@' + domain : '',
      'https://proofwork-nine.vercel.app/companies/' + c.slug
    ].join(','))
  })

  writeFileSync('outreach-emails.csv', csvLines.join('\n'))
  console.log('✓ Exported outreach-emails.csv (' + (csvLines.length - 1) + ' companies)')
}

main().catch(console.error)
