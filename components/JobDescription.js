'use client'

export default function JobDescription({ text }) {
  if (!text) return null

  // Parse the description into sections
  const sections = parseDescription(text)

  return (
    <div className="space-y-4">
      {sections.map((section, i) => (
        <div key={i}>
          {section.heading && (
            <h3 className="text-[10px] font-mono text-pw-green uppercase tracking-wider mb-2">
              {section.heading}
            </h3>
          )}
          {section.type === 'bullets' ? (
            <div className="space-y-1.5">
              {section.items.map((item, j) => (
                <div key={j} className="text-sm text-pw-text3 flex gap-2 leading-relaxed">
                  <span className="text-pw-green mt-0.5 shrink-0">→</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {section.paragraphs.map((p, j) => (
                <p key={j} className="text-sm text-pw-text3 leading-relaxed">{p}</p>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function parseDescription(raw) {
  // Clean up HTML entities and tags
  let text = raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div|li|ul|ol|h[1-6]|strong|em|b|i|a|span)[^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')

  // Split into lines
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  
  if (lines.length === 0) return [{ type: 'text', paragraphs: [text] }]

  const sections = []
  let currentSection = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // Detect headings - short lines that look like section titles
    if (isHeading(line)) {
      // Save current section
      if (currentSection) sections.push(currentSection)
      currentSection = {
        heading: cleanHeading(line),
        type: 'text',
        paragraphs: [],
        items: []
      }
      continue
    }

    // Detect bullet points
    if (isBullet(line)) {
      const cleanLine = cleanBullet(line)
      if (!currentSection) {
        currentSection = { heading: null, type: 'bullets', paragraphs: [], items: [] }
      }
      if (currentSection.type !== 'bullets' && currentSection.items.length === 0 && currentSection.paragraphs.length > 0) {
        // Switch from text to bullets — save text as separate section
        const textSection = { ...currentSection, type: 'text', items: [] }
        sections.push(textSection)
        currentSection = { heading: null, type: 'bullets', paragraphs: [], items: [] }
      }
      currentSection.type = 'bullets'
      currentSection.items.push(cleanLine)
      continue
    }

    // Regular paragraph
    if (!currentSection) {
      currentSection = { heading: null, type: 'text', paragraphs: [], items: [] }
    }
    
    if (currentSection.type === 'bullets' && currentSection.items.length > 0) {
      // We were in bullets mode, switch to new text section
      sections.push(currentSection)
      currentSection = { heading: null, type: 'text', paragraphs: [], items: [] }
    }
    
    currentSection.paragraphs.push(line)
  }

  // Push last section
  if (currentSection) sections.push(currentSection)

  // If we only got one section with no heading and it's all text, 
  // try to split long text into reasonable paragraphs
  if (sections.length === 1 && !sections[0].heading && sections[0].type === 'text') {
    const allText = sections[0].paragraphs.join(' ')
    if (allText.length > 500 && sections[0].paragraphs.length <= 2) {
      // Split by sentences, group into ~200 char paragraphs
      const sentences = allText.match(/[^.!?]+[.!?]+/g) || [allText]
      const paras = []
      let current = ''
      for (const s of sentences) {
        if (current.length + s.length > 300 && current.length > 0) {
          paras.push(current.trim())
          current = s
        } else {
          current += s
        }
      }
      if (current.trim()) paras.push(current.trim())
      sections[0].paragraphs = paras
    }
  }

  // Filter out empty sections
  return sections.filter(s => 
    s.paragraphs.length > 0 || s.items.length > 0
  )
}

function isHeading(line) {
  // Short line (under 80 chars) that looks like a title
  if (line.length > 80) return false
  if (line.length < 3) return false
  
  // Common heading patterns
  const headingPatterns = [
    /^(about|what|who|why|how|the|your|our|key|core|essential|desired|required|requirements|responsibilities|qualifications|skills|experience|benefits|perks|salary|compensation|package|location|team|role|job|position|overview|summary|description|culture|values|mission|apply|application|interview|process|we offer|what we|what you|you will|you'll|the role|the team|the company|in this role|day to day|working at|life at|equal|diversity|inclusion)\b/i,
    /^[A-Z][^.!?]*:?\s*$/,  // Starts with capital, no sentence-ending punctuation
    /^[\W]*[A-Z\s&/]+[\W]*$/,  // ALL CAPS
    /:\s*$/,  // Ends with colon
    /^🔹|^🔸|^📌|^🎯|^💡|^🚀|^✨|^⭐|^👉|^💰|^📍/,  // Emoji headings
  ]
  
  for (const p of headingPatterns) {
    if (p.test(line)) return true
  }
  
  return false
}

function cleanHeading(line) {
  return line
    .replace(/^\W+/, '')  // Remove leading non-word chars
    .replace(/[:#*]+\s*$/, '')  // Remove trailing : # *
    .replace(/^\*\*|\*\*$/g, '')  // Remove markdown bold
    .replace(/^#+\s*/, '')  // Remove markdown headings
    .trim()
}

function isBullet(line) {
  return /^[-•●◦▪→>✓✔☑★⭐🔹🔸*]\s/.test(line) || 
         /^\d+[.)]\s/.test(line) ||
         /^[a-z][.)]\s/.test(line)
}

function cleanBullet(line) {
  return line
    .replace(/^[-•●◦▪→>✓✔☑★⭐🔹🔸*]\s+/, '')
    .replace(/^\d+[.)]\s+/, '')
    .replace(/^[a-z][.)]\s+/, '')
    .trim()
}
