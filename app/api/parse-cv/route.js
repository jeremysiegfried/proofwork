import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(request) {
  try {
    const body = await request.json()
    const { userId, cvText, pdfBase64 } = body

    if (!userId) {
      return Response.json({ error: 'Missing userId' }, { status: 400 })
    }

    if (!cvText && !pdfBase64) {
      return Response.json({ error: 'Missing cvText or pdfBase64' }, { status: 400 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
    }

    var promptText = `Parse this CV/resume and extract structured data. Return ONLY valid JSON, no markdown or explanation.

Return this exact JSON structure:
{
  "full_name": "string",
  "email": "string or empty",
  "phone": "string or empty",
  "location": "string - city/region in UK if mentioned",
  "summary": "2-3 sentence professional summary",
  "skills": ["array", "of", "specific", "skills", "technologies", "tools"],
  "job_titles": ["array of job titles held or targeted, most recent first"],
  "seniority": "one of: Junior, Mid, Senior, Lead, Director, Executive",
  "years_experience": number,
  "education": "highest qualification, e.g. BSc Computer Science, University of Manchester",
  "industries": ["array", "of", "industries", "worked in"],
  "languages": ["English", "and any others"],
  "salary_min": estimated minimum salary in GBP based on experience (number, 0 if unsure),
  "salary_max": estimated maximum salary in GBP based on experience (number, 0 if unsure),
  "preferred_locations": ["array of UK cities they might work in based on their location"]
}`

    // Build messages based on whether we have PDF or text
    var messages = []

    if (pdfBase64) {
      // Send PDF directly to Claude as a document
      messages = [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: pdfBase64
            }
          },
          {
            type: 'text',
            text: promptText
          }
        ]
      }]
    } else {
      // Send plain text
      messages = [{
        role: 'user',
        content: promptText + '\n\nCV TEXT:\n' + cvText.substring(0, 8000)
      }]
    }

    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'pdfs-2024-09-25'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: messages
      })
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Claude API error:', errText)
      return Response.json({ error: 'AI parsing failed' }, { status: 500 })
    }

    const data = await response.json()
    const rawText = data.content?.[0]?.text || ''
    
    // Parse the JSON response
    let parsed
    try {
      const cleaned = rawText.replace(/```json\s*|```\s*/g, '').trim()
      parsed = JSON.parse(cleaned)
    } catch (e) {
      console.error('Failed to parse Claude response:', rawText)
      return Response.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    // Upsert candidate profile
    const profileData = {
      user_id: userId,
      full_name: parsed.full_name || '',
      email: parsed.email || '',
      phone: parsed.phone || '',
      location: parsed.location || '',
      summary: parsed.summary || '',
      skills: parsed.skills || [],
      job_titles: parsed.job_titles || [],
      seniority: ['Junior','Mid','Senior','Lead','Director','Executive'].includes(parsed.seniority) ? parsed.seniority : 'Mid',
      years_experience: parseInt(parsed.years_experience) || 0,
      education: parsed.education || '',
      industries: parsed.industries || [],
      languages: parsed.languages || ['English'],
      salary_min: parseInt(parsed.salary_min) || 0,
      salary_max: parseInt(parsed.salary_max) || 0,
      preferred_locations: parsed.preferred_locations || [],
      cv_raw_text: cvText ? cvText.substring(0, 50000) : 'Uploaded as PDF',
      cv_parsed_at: new Date().toISOString(),
      open_to_work: true,
      updated_at: new Date().toISOString()
    }

    // Try update first, then insert
    const { data: existing } = await supabaseAdmin
      .from('candidate_profiles')
      .select('id')
      .eq('user_id', userId)
      .single()

    let result
    if (existing) {
      result = await supabaseAdmin
        .from('candidate_profiles')
        .update(profileData)
        .eq('user_id', userId)
        .select()
        .single()
    } else {
      result = await supabaseAdmin
        .from('candidate_profiles')
        .insert(profileData)
        .select()
        .single()
    }

    if (result.error) {
      console.error('Supabase error:', result.error)
      return Response.json({ error: 'Failed to save profile: ' + result.error.message }, { status: 500 })
    }

    return Response.json({ profile: result.data, parsed })

  } catch (err) {
    console.error('Parse CV error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
