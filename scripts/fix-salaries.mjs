// Fix salaries — extracts real salary from job descriptions
// and overrides Adzuna estimates
// node scripts/fix-salaries.mjs

import { createClient } from '@supabase/supabase-js'
const supabase = createClient(
  'https://fovjkyqimtafpzdwtatp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvdmpreXFpbXRhZnB6ZHd0YXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzQ5OTUsImV4cCI6MjA5MTQxMDk5NX0.qG50PxCyWTL9gyb8jlqjJsKQ6gJGULbOizqxezQTais'
)

function extractSalary(text) {
  if (!text) return null
  var t = text.replace(/,/g, '').replace(/\s+/g, ' ')

  // Range: £50000 - £70000 or £50k - £70k
  var rangePatterns = [
    /£(\d{4,6})\s*[-–—]+\s*£(\d{4,6})/i,
    /£(\d{2,3})k\s*[-–—]+\s*£(\d{2,3})k/i,
    /£(\d{4,6})\s+to\s+£(\d{4,6})/i,
    /£(\d{2,3})k\s+to\s+£(\d{2,3})k/i,
  ]
  for (var i = 0; i < rangePatterns.length; i++) {
    var m = t.match(rangePatterns[i])
    if (m) {
      var v1 = parseInt(m[1]); var v2 = parseInt(m[2])
      if (v1 < 1000) v1 *= 1000; if (v2 < 1000) v2 *= 1000
      if (v1 >= 15000 && v1 <= 500000 && v2 >= 15000 && v2 <= 500000) {
        return { min: Math.min(v1, v2), max: Math.max(v1, v2) }
      }
    }
  }

  // Up to £70000 or up to £70k
  var upTo = [/up\s+to\s+£(\d{4,6})/i, /up\s+to\s+£(\d{2,3})k/i]
  for (var i = 0; i < upTo.length; i++) {
    var m = t.match(upTo[i])
    if (m) {
      var v = parseInt(m[1]); if (v < 1000) v *= 1000
      if (v >= 15000 && v <= 500000) return { min: Math.round(v * 0.8), max: v }
    }
  }

  // Collect all salary-looking numbers
  var all = []
  var broad = /£(\d{2,3})k|£(\d{4,6})/gi
  var match
  while ((match = broad.exec(t)) !== null) {
    var v = parseInt(match[1] || match[2])
    if (v < 1000) v *= 1000
    if (v >= 18000 && v <= 500000) all.push(v)
  }

  if (all.length >= 2) return { min: Math.min.apply(null, all), max: Math.max.apply(null, all) }
  if (all.length === 1) return { min: all[0], max: all[0] }
  return null
}

function isEstimate(min, max) {
  if (min === max && min > 0) return true
  if (max > 0 && (max - min) / max < 0.02) return true
  return false
}

async function main() {
  console.log('=== Fixing salaries from job descriptions ===\n')

  var fixed = 0, checked = 0, total = 0
  var pageSize = 500
  var offset = 0

  while (true) {
    var { data: jobs, error } = await supabase
      .from('jobs')
      .select('id, title, description, salary_min, salary_max, source')
      .eq('active', true)
      .range(offset, offset + pageSize - 1)

    if (error || !jobs || jobs.length === 0) break
    total += jobs.length

    for (var i = 0; i < jobs.length; i++) {
      var job = jobs[i]
      checked++

      var extracted = extractSalary(job.description)
      if (!extracted) continue

      var currentIsEstimate = isEstimate(job.salary_min, job.salary_max)
      var extractedIsBetter = false

      // Case 1: we have no salary at all
      if (job.salary_min === 0 && job.salary_max === 0) {
        extractedIsBetter = true
      }
      // Case 2: current salary looks like an estimate (min === max) and extracted is different
      else if (currentIsEstimate && (extracted.min !== job.salary_min || extracted.max !== job.salary_max)) {
        extractedIsBetter = true
      }
      // Case 3: extracted has a proper range but current doesn't
      else if (job.salary_min === job.salary_max && extracted.min !== extracted.max) {
        extractedIsBetter = true
      }

      if (extractedIsBetter) {
        var newTrust = extracted.min > 0 ? 30 : 0
        var { error: updateError } = await supabase.from('jobs').update({
          salary_min: extracted.min,
          salary_max: extracted.max,
          trust_score: newTrust
        }).eq('id', job.id)

        if (!updateError) {
          fixed++
          if (fixed <= 20) {
            console.log('  Fixed: ' + job.title)
            console.log('    Was: £' + job.salary_min + ' - £' + job.salary_max + (currentIsEstimate ? ' (estimate)' : ''))
            console.log('    Now: £' + extracted.min + ' - £' + extracted.max + ' (from description)')
            console.log('')
          }
        }
      }
    }

    console.log('  ... checked ' + checked + ' jobs, fixed ' + fixed + ' so far')
    offset += pageSize
  }

  console.log('\n=== Done ===')
  console.log('  Total jobs checked: ' + total)
  console.log('  Salaries fixed: ' + fixed)
}

main().catch(function(e) { console.error(e) })
