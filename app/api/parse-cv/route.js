import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(request) {
  try {
    const { cvText, userId } = await request.json()

    if (!cvText || !userId) {
      return Response.json({ error: 'Missing cvText or userId' }, { status: 400 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
    }

    // Call Claude API to parse the CV
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `Parse this CV/resume and extract structured data. Return ONLY valid JSON, no markdown or explanation.

CV TEXT:
${cvText.substring(0, 8000)}

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
        }]
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
      cv_raw_text: cvText.substring(0, 50000),
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
      return Response.json({ error: 'Failed to save profile' }, { status: 500 })
    }

    return Response.json({ profile: result.data, parsed })

  } catch (err) {
    console.error('Parse CV error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
