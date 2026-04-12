'use client'

function decode(t) {
  if (!t) return ''
  var s = t
  for (var i = 0; i < 3; i++) {
    s = s
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&nbsp;/g, ' ')
  }
  return s
}

function cleanHTML(h) {
  return h
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<img[^>]*>/gi, '')
    .replace(/\s(class|style|id)="[^"]*"/gi, '')
    .replace(/\sdata-[a-z-]+="[^"]*"/gi, '')
    .replace(/<div[^>]*>/gi, '')
    .replace(/<\/div>/gi, '')
    .replace(/<hr\s*\/?>/gi, '<div style="height:1px;margin:20px 0;background:#E8E4DE"></div>')
}

function isHeader(line) {
  var t = line.trim()
  if (t.length > 100) return false
  if (t.length < 3) return false

  // ALL CAPS headers
  if (t.length < 60 && t === t.toUpperCase() && /[A-Z]{3,}/.test(t)) return true

  // Known header patterns
  if (/^(about|what|who|why|how|your|our|key|required|requirements|responsibilities|qualifications|skills|experience|benefits|salary|the role|the team|we offer|what you|you will|overview|job (title|specification|description|summary)|location|reporting|remuneration|package|working hours|misc|preferred|nice to have|essential|desirable|duties|role description|company|purpose|scope|objectives|competenc)/i.test(t)) {
    return true
  }

  // Ends with colon
  if (/^[A-Z].*:\s*$/.test(t) && t.length < 80) return true

  // Short line in title case with no period
  if (t.length < 50 && !t.endsWith('.') && !t.endsWith(',') && /^[A-Z][a-zA-Z\s&,/\-–]+$/.test(t)) return true

  return false
}

function isBullet(line) {
  var t = line.trim()
  // Explicit bullets
  if (/^[-•◦●▪→>*]\s/.test(t)) return true
  // Numbered
  if (/^\d+[.)]\s/.test(t)) return true
  // Starts with keyword pattern that looks like a list item
  if (/^[A-Z][a-z]+ [A-Z&]/.test(t) && t.includes(':') && t.length < 300) return true
  return false
}

function cleanBullet(line) {
  return line.trim()
    .replace(/^[-•◦●▪→>*]\s+/, '')
    .replace(/^\d+[.)]\s+/, '')
}

function isLabelValue(line) {
  // Lines like "JOB TITLE: Software Engineer" or "Location: London"
  var match = line.match(/^([A-Za-z\s/&]+):\s+(.+)$/)
  if (match && match[1].length < 30 && match[2].length < 100) return match
  return null
}

function splitIntoParagraphs(text) {
  // For blob text with no newlines, split intelligently
  var sentences = text.match(/[^.!?]+[.!?]+\s*/g) || [text]
  var paras = []
  var cur = ''

  for (var i = 0; i < sentences.length; i++) {
    var s = sentences[i].trim()
    // Start a new paragraph on topic transitions
    var isTopicShift = /^(We |You |The |This |Our |As |In |If |Key |Requirements|Responsibilities|Benefits|About)/i.test(s)

    if (isTopicShift && cur.length > 100) {
      paras.push(cur.trim())
      cur = s + ' '
    } else if (cur.length + s.length > 400 && cur.length > 0) {
      paras.push(cur.trim())
      cur = s + ' '
    } else {
      cur += s + ' '
    }
  }
  if (cur.trim()) paras.push(cur.trim())
  return paras
}

export default function JobDescription({ text }) {
  if (!text) return null

  var d = decode(text)

  // Check for HTML content
  if (/<[a-z/][^>]*>/i.test(d)) {
    var c = cleanHTML(d)
    return <div className="job-desc text-sm text-pw-text3 leading-relaxed" dangerouslySetInnerHTML={{ __html: c }} />
  }

  // Plain text processing
  var rawLines = d.split('\n')
  var isTruncated = d.endsWith('…') || d.endsWith('...') || d.length < 500

  // If it's one big blob (no real line breaks), split it
  var realLines = rawLines.filter(function(l) { return l.trim().length > 0 })
  if (realLines.length <= 3 && d.length > 300) {
    // It's a blob — split by sentence grouping and detect inline headers
    var expanded = []
    for (var r = 0; r < realLines.length; r++) {
      var line = realLines[r].trim()

      // Try to detect inline sections like "KEY ACCOUNTABILITIES: item1. item2."
      var headerSplit = line.split(/(?=(?:KEY |EXPERIENCE|SKILLS|REQUIREMENTS|RESPONSIBILITIES|BENEFITS|ABOUT|WHAT |WHY |HOW |QUALIFICATIONS|REMUNERATION|WORKING|SALARY|JOB ))/gi)

      if (headerSplit.length > 1) {
        headerSplit.forEach(function(part) {
          if (part.trim()) expanded.push(part.trim())
        })
      } else {
        var paras = splitIntoParagraphs(line)
        paras.forEach(function(p) { expanded.push(p) })
      }
    }
    realLines = expanded
  }

  // Render each line with smart detection
  var elements = []
  var inList = false

  for (var i = 0; i < realLines.length; i++) {
    var line = realLines[i].trim()
    if (!line) continue

    // Check for label:value pairs (JOB TITLE: X, LOCATION: Y)
    var lv = isLabelValue(line)
    if (lv && i < 8) { // Only at the top of the description
      elements.push(
        <div key={i} className="flex gap-2 py-1">
          <span className="text-[10px] font-mono text-pw-muted uppercase w-28 shrink-0">{lv[1].trim()}</span>
          <span className="text-sm font-semibold text-pw-text1">{lv[2].trim()}</span>
        </div>
      )
      continue
    }

    // Check for headers
    if (isHeader(line)) {
      if (inList) inList = false
      var headerText = line.replace(/:\s*$/, '').trim()
      elements.push(
        <h3 key={i} className="text-[10px] font-mono text-pw-green uppercase tracking-widest mt-5 mb-2 font-bold">
          {headerText}
        </h3>
      )
      continue
    }

    // Check for bullet points
    if (isBullet(line)) {
      inList = true
      var bulletText = cleanBullet(line)
      elements.push(
        <div key={i} className="text-sm text-pw-text3 flex gap-2 leading-relaxed py-0.5 pl-1">
          <span className="text-pw-green mt-0.5 shrink-0">→</span>
          <span>{bulletText}</span>
        </div>
      )
      continue
    }

    // Regular paragraph
    inList = false
    elements.push(
      <p key={i} className="text-sm text-pw-text3 leading-relaxed mb-2">{line}</p>
    )
  }

  return (
    <div>
      {elements}
      {isTruncated && (
        <div className="mt-4 p-3 bg-pw-bg rounded-lg border border-pw-border">
          <p className="text-xs text-pw-muted">
            This description may be truncated. Click "Apply" to see the full listing on the employer's site.
          </p>
        </div>
      )}
    </div>
  )
}
