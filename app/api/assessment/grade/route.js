import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(request) {
  try {
    var { attemptId, responseText } = await request.json()
    if (!attemptId || !responseText) return Response.json({ error: 'Missing attemptId or responseText' }, { status: 400 })
    if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: 'API key not configured' }, { status: 500 })

    // Get the attempt with challenge details
    var { data: attempt } = await supabaseAdmin
      .from('assessment_attempts')
      .select('*, assessments(assessment_type, difficulty)')
      .eq('id', attemptId)
      .single()

    if (!attempt) return Response.json({ error: 'Attempt not found' }, { status: 404 })
    if (attempt.status === 'graded') return Response.json({ error: 'Already graded', attempt }, { status: 400 })

    // Check time limit
    var startedAt = new Date(attempt.started_at)
    var now = new Date()
    var elapsedMinutes = (now - startedAt) / 1000 / 60
    var overtime = elapsedMinutes > attempt.time_limit_minutes * 1.5 // 50% grace period

    // Grade with Claude
    var response = await fetch('https://api.anthropic.com/v1/messages', {
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
          content: `You are grading a skill assessment for a job candidate. Be fair but rigorous.

CHALLENGE GIVEN:
${attempt.challenge_text}

CANDIDATE'S RESPONSE:
${responseText.substring(0, 10000)}

ASSESSMENT TYPE: ${attempt.challenge_data?.type || 'general'}
DIFFICULTY LEVEL: ${attempt.challenge_data?.difficulty || 'mid'}
JOB TITLE: ${attempt.challenge_data?.jobTitle || 'Unknown'}
TIME TAKEN: ${Math.round(elapsedMinutes)} minutes (limit was ${attempt.time_limit_minutes} minutes)
${overtime ? 'NOTE: Candidate significantly exceeded the time limit.' : ''}

Grade this submission. Return ONLY valid JSON:
{
  "score": <number 0-100>,
  "feedback": "<2-3 sentence overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "improvements": ["<area for improvement 1>", "<area for improvement 2>"],
  "criteria_scores": {
    "relevance": <0-25>,
    "quality": <0-25>,
    "depth": <0-25>,
    "communication": <0-25>
  }
}

Scoring guide:
- 90-100: Exceptional. Would immediately progress to interview.
- 75-89: Strong. Clearly qualified, minor gaps.
- 60-74: Adequate. Meets basic requirements, room for growth.
- 40-59: Below expectations. Significant gaps in knowledge or approach.
- 0-39: Does not meet requirements.
${overtime ? '\nDeduct 5-10 points for significantly exceeding the time limit.' : ''}`
        }]
      })
    })

    if (!response.ok) return Response.json({ error: 'AI grading failed' }, { status: 500 })

    var data = await response.json()
    var rawText = data.content?.[0]?.text || ''

    var grading
    try {
      var cleaned = rawText.replace(/```json\s*|```\s*/g, '').trim()
      grading = JSON.parse(cleaned)
    } catch (e) {
      return Response.json({ error: 'Failed to parse grading response' }, { status: 500 })
    }

    // Update attempt with results
    var { data: updated, error: updateError } = await supabaseAdmin
      .from('assessment_attempts')
      .update({
        response_text: responseText.substring(0, 50000),
        response_submitted_at: new Date().toISOString(),
        score: Math.min(100, Math.max(0, grading.score || 0)),
        feedback: grading.feedback || '',
        strengths: grading.strengths || [],
        improvements: grading.improvements || [],
        graded_at: new Date().toISOString(),
        status: 'graded',
      })
      .eq('id', attemptId)
      .select()
      .single()

    if (updateError) return Response.json({ error: 'Failed to save grade: ' + updateError.message }, { status: 500 })

    // Update job trust score if this is the first assessment for this job
    var jobId = attempt.job_id
    await supabaseAdmin
      .from('jobs')
      .update({ has_challenge: true })
      .eq('id', jobId)

    return Response.json({
      attempt: updated,
      grading: {
        score: grading.score,
        feedback: grading.feedback,
        strengths: grading.strengths,
        improvements: grading.improvements,
        criteria: grading.criteria_scores,
      }
    })

  } catch (err) {
    console.error('Grade assessment error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
