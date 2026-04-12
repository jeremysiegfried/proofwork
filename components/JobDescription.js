'use client'

function decode(t) {
  if (!t) return ''
  var s = t
  var prev = ''
  for (var i = 0; i < 5 && s !== prev; i++) {
    prev = s
    s = s
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/').replace(/&#x3D;/g, '=').replace(/&nbsp;/g, ' ')
      .replace(/&#(\d+);/g, function(m, code) { return String.fromCharCode(parseInt(code)) })
      .replace(/&#x([0-9a-fA-F]+);/g, function(m, code) { return String.fromCharCode(parseInt(code, 16)) })
  }
  return s
}

function cleanHTML(h) {
  return h
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<img[^>]*>/gi, '')
    .replace(/\s(class|style|id|align|bgcolor|width|height|cellpadding|cellspacing|border)="[^"]*"/gi, '')
    .replace(/\sdata-[a-z-]+="[^"]*"/gi, '')
    .replace(/\starget="[^"]*"/gi, '')
    .replace(/<div[^>]*>/gi, '<p>').replace(/<\/div>/gi, '</p>')
    .replace(/<p>\s*<\/p>/gi, '')
    .replace(/<p>\s*<br\s*\/?>\s*<\/p>/gi, '')
    .replace(/(<br\s*\/?>){2,}/gi, '</p><p>')
    .replace(/<hr\s*\/?>/gi, '<div style="height:1px;margin:20px 0;background:#E8E4DE"></div>')
    .replace(/<(strong|b|em|i)>\s*<\/\1>/gi, '')
}

// Extract the Greenhouse-style metadata line (📍Location | 💰 Salary | Tech)
function extractMetaLine(html) {
  var meta = null
  var metaPatterns = [
    /<p>([^<]*(?:📍|📌|🏢|💰|🎯)[^<]*(?:\|[^<]*){1,})<\/p>/i,
    /^([^\n]*(?:📍|📌|🏢|💰|🎯)[^\n]*(?:\|[^\n]*){1,})$/m,
    /<p>([^<]*(?:Remote|London|Manchester|Edinburgh)[^<]*\|[^<]*(?:£|\$|salary|benefits)[^<]*)<\/p>/i,
  ]

  var cleaned = html
  for (var i = 0; i < metaPatterns.length; i++) {
    var match = cleaned.match(metaPatterns[i])
    if (match) {
      meta = match[1].trim()
      cleaned = cleaned.replace(match[0], '')
      break
    }
  }
  return { meta: meta, body: cleaned }
}

function parseMetaChips(metaLine) {
  if (!metaLine) return []
  var text = metaLine.replace(/<[^>]*>/g, '').replace(/__/g, '')
  var parts = text.split('|').map(function(p) { return p.trim() }).filter(function(p) { return p.length > 0 })
  var chips = []
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i].replace(/^[📍📌🏢💰🎯⚡💼🔧]\s*/, '').trim()
    if (p.length > 0 && p.length < 120) chips.push(p)
  }
  return chips
}

function parseTextSections(text) {
  var lines = text.split('\n').map(function(l) { return l.trim() })
  var sections = []
  var current = { heading: '', items: [] }

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i]
    if (!line) continue

    var isHeading = false
    if (line.length < 100) {
      if (/^(about|what|who|why|how|your|our|key|required|requirements|responsibilities|qualifications|skills|experience|benefits|salary|the role|the team|we offer|what you|you will|you'll|overview|description|duties|essential|desirable|person specification|company|role|job purpose|main duties|package|perks|in return|why join|working hours|location|reporting|application|to apply|how to apply|additional|about us|about the role|about the company|job summary|role summary|main responsibilities|key responsibilities|key skills|key requirements|day to day|what we're looking for|what you'll do|what you'll need|what we offer|the opportunity|the ideal candidate|candidate profile|role overview|job description|position summary|about our|about the|the tech|our tech|tech stack|what we|who we|who you)\b/i.test(line.replace(/[:\-–—]/g, '').trim())) {
        isHeading = true
      }
      if (/:\s*$/.test(line) && !/\.\s*$/.test(line)) isHeading = true
      if (line === line.toUpperCase() && line.length > 3 && /[A-Z]/.test(line)) isHeading = true
    }

    if (isHeading) {
      if (current.heading || current.items.length > 0) sections.push(current)
      current = { heading: line.replace(/:\s*$/, ''), items: [] }
    } else {
      current.items.push(line)
    }
  }
  if (current.heading || current.items.length > 0) sections.push(current)
  return sections
}

export default function JobDescription({ text }) {
  if (!text) return null

  var d = decode(text)
  var extracted = extractMetaLine(d)
  var metaChips = parseMetaChips(extracted.meta)
  var body = extracted.body
  var hasHTML = /<[a-z/][^>]*>/i.test(body)

  return (
    <div>
      {metaChips.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5 pb-4 border-b border-pw-border">
          {metaChips.map(function(chip, i) {
            return (
              <span key={i} className="text-xs font-mono px-3 py-1.5 rounded-lg bg-pw-bg border border-pw-border text-pw-text3">
                {chip}
              </span>
            )
          })}
        </div>
      )}

      {hasHTML ? (
        <div className="job-desc text-[15px] text-pw-text3 leading-[1.8]" dangerouslySetInnerHTML={{ __html: cleanHTML(body) }} />
      ) : (
        <PlainTextDescription text={body} />
      )}
    </div>
  )
}

function PlainTextDescription({ text }) {
  var raw = text
  var lines = raw.split('\n').map(function(l) { return l.trim() }).filter(function(l) { return l.length > 0 })
  if (lines.length <= 2 && raw.length > 400) {
    raw = raw.replace(/\. ([A-Z])/g, '.\n$1')
  }
  var sections = parseTextSections(raw)

  return (
    <div className="space-y-3">
      {sections.map(function(section, si) {
        return (
          <div key={si}>
            {section.heading && (
              <h3 className="text-xs font-mono text-pw-green uppercase tracking-wider mt-6 mb-2 font-bold">{section.heading}</h3>
            )}
            {section.items.map(function(item, ii) {
              if (/^[-\u2022\u25CF\u25E6\u25AA\u2192>*•]\s/.test(item) || /^\d+[.)]\s/.test(item)) {
                var clean = item.replace(/^[-\u2022\u25CF\u25E6\u25AA\u2192>*•]\s+/, '').replace(/^\d+[.)]\s+/, '')
                return (
                  <div key={ii} className="text-[15px] text-pw-text3 flex gap-2.5 leading-[1.8] py-0.5">
                    <span className="text-pw-green mt-0.5 shrink-0">→</span>
                    <span>{clean}</span>
                  </div>
                )
              }
              return <p key={ii} className="text-[15px] text-pw-text3 leading-[1.8]">{item}</p>
            })}
          </div>
        )
      })}
    </div>
  )
}
