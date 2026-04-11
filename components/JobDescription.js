'use client'

function decode(t) {
  if (!t) return ''
  // Decode HTML entities — must run multiple times for double-encoding
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

export default function JobDescription({ text }) {
  if (!text) return null

  // Decode entities (may be double or triple encoded)
  var d = decode(text)

  // Check for HTML
  if (/<[a-z/][^>]*>/i.test(d)) {
    var c = cleanHTML(d)
    return <div className="job-desc text-sm text-pw-text3 leading-relaxed" dangerouslySetInnerHTML={{ __html: c }} />
  }

  // Plain text
  var lines = d.split('\n').map(function(l){return l.trim()}).filter(function(l){return l.length > 0})
  if (lines.length <= 2 && d.length > 400) {
    var sentences = d.match(/[^.!?]+[.!?]+/g) || [d]
    var paras = []; var cur = ''
    for (var i = 0; i < sentences.length; i++) {
      if (cur.length + sentences[i].length > 300 && cur.length > 0) { paras.push(cur.trim()); cur = sentences[i] }
      else cur += sentences[i]
    }
    if (cur.trim()) paras.push(cur.trim())
    lines = paras
  }

  return (
    <div className="space-y-3">
      {lines.map(function(line, i) {
        if (/^[-\u2022\u25CF\u25E6\u25AA\u2192>*]\s/.test(line) || /^\d+[.)]\s/.test(line)) {
          var clean = line.replace(/^[-\u2022\u25CF\u25E6\u25AA\u2192>*]\s+/, '').replace(/^\d+[.)]\s+/, '')
          return <div key={i} className="text-sm text-pw-text3 flex gap-2 leading-relaxed"><span className="text-pw-green mt-0.5 shrink-0">&rarr;</span><span>{clean}</span></div>
        }
        if (line.length < 80 && (/^(about|what|who|why|how|your|our|key|required|requirements|responsibilities|qualifications|skills|experience|benefits|salary|the role|the team|we offer|what you|you will|overview)\b/i.test(line) || /:\s*$/.test(line))) {
          return <h3 key={i} className="text-xs font-mono text-pw-green uppercase tracking-wider mt-4 mb-1">{line.replace(/:\s*$/,'')}</h3>
        }
        return <p key={i} className="text-sm text-pw-text3 leading-relaxed">{line}</p>
      })}
    </div>
  )
}
