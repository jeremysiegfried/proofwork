// Quick fix: Read scrape.mjs and update Greenhouse to store full HTML
// Run: node scripts/fix-scraper-greenhouse.js

const fs = require('fs')
const path = require('path')

const file = path.join(__dirname, 'scrape.mjs')
let content = fs.readFileSync(file, 'utf8')

// Replace the Greenhouse description stripping line
// Old: const desc = (j.content||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim()
// New: const desc = (j.content||'').trim()
content = content.replace(
  /const desc = \(j\.content\|\|''\)\.replace\(\/\<\[\^>\]\*\>\/g,' '\)\.replace\(\/\\s\+\/g,' '\)\.trim\(\)/,
  "const desc = (j.content||'').trim() // Keep full HTML — JobDescription component handles rendering"
)

fs.writeFileSync(file, content)
console.log('✓ Updated scrape.mjs — Greenhouse now stores full HTML descriptions')
