export function extractJobDetails(description, job) {
  var details = {}
  
  // Use existing job fields as defaults
  if (job) {
    if (job.job_type === 'Full-time') details.workType = 'Full-time'
    else if (job.job_type === 'Part-time') details.workType = 'Part-time'
    else if (job.job_type === 'Contract') details.contract = 'Contract'
    
    if (job.remote_policy === 'Remote') details.remote = 'Fully remote'
    else if (job.remote_policy === 'Remote OK') details.remote = 'Remote OK'
    else if (job.remote_policy === 'Hybrid') details.remote = 'Hybrid'
  }

  if (!description) return details

  var t = description
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').toLowerCase()

  // Contract type — override defaults if found in description
  if (/\bpermanent\b/.test(t)) details.contract = 'Permanent'
  else if (/\bfixed.?term\b|\bftc\b/.test(t)) details.contract = 'Fixed term'
  else if (/\bcontract\b/.test(t) && !/\bcontract management\b/.test(t) && !/\bcontract negotiation\b/.test(t)) details.contract = 'Contract'
  else if (/\bfreelance\b/.test(t)) details.contract = 'Freelance'
  else if (/\btemporary\b|\btemp position\b/.test(t)) details.contract = 'Temporary'

  // Work type
  if (/\bfull[- ]?time\b/.test(t)) details.workType = 'Full-time'
  else if (/\bpart[- ]?time\b/.test(t)) details.workType = 'Part-time'

  // Remote — override if description is more specific
  if (/\bfully remote\b|\b100% remote\b/.test(t)) details.remote = 'Fully remote'
  else if (/\bhybrid\b/.test(t)) details.remote = 'Hybrid'

  // Salary extraction from raw text (with HTML stripped)
  var raw = description
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/<[^>]*>/g, ' ')

  // Range: £40,000 - £75,000 or £40k-£75k
  var range = raw.match(/£([\d,]+)\s*[-\u2013\u2014to]+\s*£([\d,]+)/i)
  if (!range) range = raw.match(/£(\d{2,3})k\s*[-\u2013\u2014to]+\s*£(\d{2,3})k/i)
  if (range) {
    var v1 = parseInt(range[1].replace(/,/g, ''))
    var v2 = parseInt(range[2].replace(/,/g, ''))
    if (v1 < 1000) v1 *= 1000
    if (v2 < 1000) v2 *= 1000
    if (v1 >= 15000 && v2 >= 15000) {
      details.salaryMin = Math.min(v1, v2)
      details.salaryMax = Math.max(v1, v2)
    }
  }

  // "Up to £75,000" or "up to £75k"
  if (!details.salaryMin) {
    var upTo = raw.match(/up\s+to\s+£([\d,]+)/i)
    if (!upTo) upTo = raw.match(/up\s+to\s+£(\d{2,3})k/i)
    if (upTo) {
      var v = parseInt(upTo[1].replace(/,/g, ''))
      if (v < 1000) v *= 1000
      if (v >= 15000) { details.salaryMin = Math.round(v * 0.75); details.salaryMax = v }
    }
  }

  // "£75,000 per annum" or "£75k pa"
  if (!details.salaryMin) {
    var single = raw.match(/£([\d,]+)\s*(?:per annum|pa|p\.a\.|per year|annually)/i)
    if (single) {
      var v = parseInt(single[1].replace(/,/g, ''))
      if (v >= 15000 && v <= 500000) { details.salaryMin = v; details.salaryMax = v }
    }
  }

  // Clearance
  if (/\bdv clear/i.test(t) || /\bedv\b/i.test(t) || /\benhanced dv\b/i.test(t) || /\bdeveloped vetting\b/i.test(t)) details.clearance = 'DV Cleared'
  else if (/\bsc clear/i.test(t) || /\bsecurity clear/i.test(t)) details.clearance = 'SC Cleared'
  else if (/\bctc\b/i.test(t) || /\bcounter terrorist/i.test(t)) details.clearance = 'CTC'

  // Visa
  if (/\bvisa sponsor/i.test(t)) details.visa = 'Visa sponsorship'

  // Level — from job title first, then description
  var title = (job && job.title ? job.title : '').toLowerCase()
  if (/\bdirector\b|\bhead of\b|\bvp\b|\bchief\b/.test(title)) details.level = 'Director+'
  else if (/\blead\b|\bprincipal\b|\bstaff\b/.test(title)) details.level = 'Lead'
  else if (/\bsenior\b|\bsr\b/.test(title)) details.level = 'Senior'
  else if (/\bmanager\b/.test(title)) details.level = 'Manager'
  else if (/\bjunior\b|\bgraduate\b|\bintern\b|\btrainee\b|\bentry/i.test(title)) details.level = 'Junior'
  else if (/\bmid[- ]?level\b/.test(t)) details.level = 'Mid-level'

  return details
}
