// Salary extraction from job description text
// Finds patterns like £60,000, £60k, £50k-70k, up to £80,000, £50,000 - £70,000 pa

export function extractSalaryFromText(text) {
  if (!text) return null

  // Normalize text
  const t = text.replace(/,/g, '').replace(/\s+/g, ' ')

  // Patterns ordered by specificity (most specific first)
  const patterns = [
    // £50000 - £70000 or £50,000 - £70,000 or £50000-£70000
    /£(\d{4,6})\s*[-–—to]+\s*£(\d{4,6})/gi,
    // £50k - £70k or £50k-£70k
    /£(\d{2,3})k\s*[-–—to]+\s*£(\d{2,3})k/gi,
    // £50000 to £70000
    /£(\d{4,6})\s+to\s+£(\d{4,6})/gi,
    // £50k to £70k
    /£(\d{2,3})k\s+to\s+£(\d{2,3})k/gi,
    // up to £70000 or up to £70k
    /up\s+to\s+£(\d{4,6})/gi,
    /up\s+to\s+£(\d{2,3})k/gi,
    // from £50000 or from £50k
    /from\s+£(\d{4,6})/gi,
    /from\s+£(\d{2,3})k/gi,
    // Single salary: £60000 or £60k (but not in random contexts)
    /(?:salary|paying|package|£)[\s:]*£?(\d{4,6})(?:\s*(?:per annum|pa|p\.a\.|per year|annually))?/gi,
    /(?:salary|paying|package)[\s:]*£?(\d{2,3})k/gi,
    // Standalone £XX,XXX or £XXk near salary keywords
    /£(\d{4,6})(?:\s*(?:per annum|pa|p\.a\.|per year|annually))/gi,
    /£(\d{2,3})k(?:\s*(?:per annum|pa|p\.a\.|per year|annually))/gi,
  ]

  let min = 0, max = 0

  // Try range patterns first
  const rangePatterns = [
    /£(\d{4,6})\s*[-–—]+\s*£(\d{4,6})/i,
    /£(\d{2,3})k\s*[-–—]+\s*£(\d{2,3})k/i,
    /£(\d{4,6})\s+to\s+£(\d{4,6})/i,
    /£(\d{2,3})k\s+to\s+£(\d{2,3})k/i,
  ]

  for (const p of rangePatterns) {
    const m = t.match(p)
    if (m) {
      let v1 = parseInt(m[1])
      let v2 = parseInt(m[2])
      // Handle k notation
      if (v1 < 1000) v1 *= 1000
      if (v2 < 1000) v2 *= 1000
      // Sanity check: reasonable UK salary range
      if (v1 >= 15000 && v1 <= 500000 && v2 >= 15000 && v2 <= 500000) {
        min = Math.min(v1, v2)
        max = Math.max(v1, v2)
        return { min, max, source: 'extracted' }
      }
    }
  }

  // Try "up to" patterns
  const upToPatterns = [
    /up\s+to\s+£(\d{4,6})/i,
    /up\s+to\s+£(\d{2,3})k/i,
  ]
  for (const p of upToPatterns) {
    const m = t.match(p)
    if (m) {
      let v = parseInt(m[1])
      if (v < 1000) v *= 1000
      if (v >= 15000 && v <= 500000) {
        return { min: Math.round(v * 0.8), max: v, source: 'extracted' }
      }
    }
  }

  // Try single salary mentions
  const singlePatterns = [
    /£(\d{4,6})(?:\s*(?:per annum|pa|p\.a\.|per year|annually))/i,
    /£(\d{2,3})k(?:\s*(?:per annum|pa|p\.a\.|per year|annually))/i,
    /salary[\s:]+£(\d{4,6})/i,
    /salary[\s:]+£(\d{2,3})k/i,
    /paying[\s:]+£(\d{4,6})/i,
    /paying[\s:]+£(\d{2,3})k/i,
  ]
  for (const p of singlePatterns) {
    const m = t.match(p)
    if (m) {
      let v = parseInt(m[1])
      if (v < 1000) v *= 1000
      if (v >= 15000 && v <= 500000) {
        return { min: v, max: v, source: 'extracted' }
      }
    }
  }

  // Last resort: find any £XX,XXX or £XXk pattern
  const allSalaries = []
  const broad = /£(\d{2,3})k|£(\d{4,6})/gi
  let match
  while ((match = broad.exec(t)) !== null) {
    let v = parseInt(match[1] || match[2])
    if (v < 1000) v *= 1000
    if (v >= 18000 && v <= 500000) {
      allSalaries.push(v)
    }
  }

  if (allSalaries.length >= 2) {
    return { min: Math.min(...allSalaries), max: Math.max(...allSalaries), source: 'extracted' }
  }
  if (allSalaries.length === 1) {
    return { min: allSalaries[0], max: allSalaries[0], source: 'extracted' }
  }

  return null
}

// Check if Adzuna salary looks like an estimate (min === max, or suspiciously round)
export function isEstimatedSalary(min, max) {
  if (min === max && min > 0) return true
  if (min === 0 && max === 0) return false
  // If the range is less than 2% of the value, probably estimated
  if (max > 0 && (max - min) / max < 0.02) return true
  return false
}
