import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(request) {
  try {
    var { attemptId, responseText, behavior } = await request.json()
    if (!attemptId || !responseText) return Response.json({ error: 'Missing attemptId or responseText' }, { status: 400 })
    if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: 'API key not configured' }, { status: 500 })

    var { data: attempt } = await supabaseAdmin
      .from('assessment_attempts')
      .select('*, assessments(assessment_type, difficulty)')
      .eq('id', attemptId)
      .single()

    if (!attempt) return Response.json({ error: 'Attempt not found' }, { status: 404 })
    if (attempt.status === 'graded') return Response.json({ error: 'Already graded', attempt }, { status: 400 })

    // Analyse behavioral signals
    var aiSignals = analyseSignals(behavior, responseText)

    var startedAt = new Date(attempt.started_at)
    var now = new Date()
    var elapsedMinutes = (now - startedAt) / 1000 / 60

    // Grade with AI detection
    var response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        messages: [{
          role: 'user',
          content: `You are grading a skill assessment AND detecting AI-generated content. Be rigorous.

CHALLENGE GIVEN:
${attempt.challenge_text}

CANDIDATE'S RESPONSE:
${responseText.substring(0, 10000)}

ASSESSMENT TYPE: ${attempt.challenge_data?.type || 'general'}
DIFFICULTY: ${attempt.challenge_data?.difficulty || 'mid'}
JOB TITLE: ${attempt.challenge_data?.jobTitle || 'Unknown'}
TIME TAKEN: ${Math.round(elapsedMinutes)} minutes (limit: ${attempt.time_limit_minutes} min)

BEHAVIORAL DATA:
- Keystrokes typed: ${behavior?.keystrokes || 'unknown'}
- Times pasted: ${behavior?.pasteCount || 0}
- Characters pasted: ${behavior?.pastedChars || 0}
- Largest single paste: ${behavior?.largestPaste || 0} chars
- Tab switches: ${behavior?.tabSwitches || 0}
- Focus losses: ${behavior?.focusLosses || 0}
- Response length: ${behavior?.responseLength || responseText.length} chars
- Typing duration: ${behavior?.typingDurationMs ? Math.round(behavior.typingDurationMs / 1000) + 's' : 'unknown'}

AI DETECTION INSTRUCTIONS:
Analyze the response for these AI-generated content signals:
1. Unnaturally perfect structure (every section perfectly formatted)
2. Generic/templated language ("In conclusion", "It's worth noting", "Let's break this down")
3. Excessive comprehensiveness (covers every edge case perfectly - real humans miss things)
4. No personal voice, opinions, or informal language
5. Suspiciously fast completion relative to complexity
6. Response length vastly exceeds what a human would type in the time (>100 chars/min sustained)
7. Large paste events (pasting the whole answer at once)
8. Very few keystrokes relative to response length (indicates copy-paste)

BEHAVIORAL RED FLAGS:
- If pastedChars > 50% of responseLength: STRONG AI signal
- If keystrokes < responseLength * 0.3: STRONG AI signal (didn't type most of it)
- If largestPaste > 200: Likely pasted from external source
- If tabSwitches > 5: Possibly referencing AI tool

Return ONLY valid JSON:
{
  "score": <0-100, penalize heavily if AI-generated>,
  "raw_score": <0-100, what the answer would score WITHOUT ai penalty>,
  "ai_probability": "<none|low|medium|high>",
  "ai_evidence": ["<specific evidence 1>", "<evidence 2>"],
  "ai_penalty": <0-50, points deducted for AI usage>,
  "feedback": "<2-3 sentences, mention AI detection if flagged>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<improvement 1>", "<improvement 2>"],
  "criteria_scores": {
    "relevance": <0-25>,
    "quality": <0-25>,
    "depth": <0-25>,
    "communication": <0-25>
  },
  "verify_questions": [
    "<Question about a specific choice they made in their answer - something only someone who understands the code/solution would know>",
    "<Question about trade-offs or alternatives - why this approach vs another>",
    "<Question about edge cases or limitations they should understand if they wrote it>"
  ]
}

CRITICAL: The verify_questions must be SPECIFIC to their actual answer. Reference exact variable names, function names, approaches, or claims they made. These questions should be trivial for someone who wrote the answer themselves but hard for someone who pasted AI output without understanding it.`
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
      return Response.json({ error: 'Failed to parse grading' }, { status: 500 })
    }

    // Store preliminary results (before verification)
    var prelimScore = Math.min(100, Math.max(0, grading.score || 0))

    await supabaseAdmin
      .from('assessment_attempts')
      .update({
        response_text: responseText.substring(0, 50000),
        response_submitted_at: new Date().toISOString(),
        score: prelimScore,
        feedback: grading.feedback || '',
        strengths: grading.strengths || [],
        improvements: grading.improvements || [],
        challenge_data: {
          ...attempt.challenge_data,
          ai_probability: grading.ai_probability,
          ai_evidence: grading.ai_evidence,
          ai_penalty: grading.ai_penalty,
          raw_score: grading.raw_score,
          behavior: behavior,
          verify_questions: grading.verify_questions,
          criteria: grading.criteria_scores,
        },
        // Don't set graded yet if we have verification questions
        status: grading.verify_questions?.length > 0 ? 'in_progress' : 'graded',
        graded_at: grading.verify_questions?.length > 0 ? null : new Date().toISOString(),
      })
      .eq('id', attemptId)

    // Update job has_challenge flag
    await supabaseAdmin.from('jobs').update({ has_challenge: true }).eq('id', attempt.job_id)

    return Response.json({
      grading: {
        score: prelimScore,
        feedback: grading.feedback,
        strengths: grading.strengths,
        improvements: grading.improvements,
        criteria: grading.criteria_scores,
        ai_probability: grading.ai_probability,
      },
      verifyQuestions: grading.verify_questions || [],
    })

  } catch (err) {
    console.error('Grade assessment error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}

function analyseSignals(behavior, responseText) {
  if (!behavior) return { risk: 'unknown' }

  var signals = []
  var riskScore = 0

  // Paste analysis
  if (behavior.pastedChars > responseText.length * 0.5) {
    signals.push('Over 50% of response was pasted')
    riskScore += 30
  }
  if (behavior.largestPaste > 200) {
    signals.push('Large paste event: ' + behavior.largestPaste + ' chars')
    riskScore += 20
  }

  // Typing analysis
  if (behavior.keystrokes > 0 && behavior.keystrokes < responseText.length * 0.3) {
    signals.push('Very few keystrokes relative to response length')
    riskScore += 25
  }

  // Tab switching
  if (behavior.tabSwitches > 5) {
    signals.push('Excessive tab switching: ' + behavior.tabSwitches + ' times')
    riskScore += 10
  }

  // Typing speed (superhuman = > 150 chars/min sustained)
  if (behavior.typingDurationMs > 0) {
    var charsPerMin = (responseText.length / behavior.typingDurationMs) * 60000
    if (charsPerMin > 150) {
      signals.push('Superhuman typing speed: ' + Math.round(charsPerMin) + ' chars/min')
      riskScore += 20
    }
  }

  return {
    risk: riskScore >= 50 ? 'high' : riskScore >= 25 ? 'medium' : 'low',
    score: riskScore,
    signals: signals,
  }
}
