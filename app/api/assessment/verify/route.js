import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(request) {
  try {
    var { attemptId, answers, timeSpent } = await request.json()
    if (!attemptId) return Response.json({ error: 'Missing attemptId' }, { status: 400 })
    if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: 'API key not configured' }, { status: 500 })

    var { data: attempt } = await supabaseAdmin
      .from('assessment_attempts')
      .select('*')
      .eq('id', attemptId)
      .single()

    if (!attempt) return Response.json({ error: 'Attempt not found' }, { status: 404 })

    var questions = attempt.challenge_data?.verify_questions || []
    var originalResponse = attempt.response_text || ''
    var prelimScore = attempt.score || 0
    var aiProbability = attempt.challenge_data?.ai_probability || 'none'
    var aiPenalty = attempt.challenge_data?.ai_penalty || 0

    // Build verification answers text
    var answerText = ''
    for (var i = 0; i < questions.length; i++) {
      answerText += 'Q' + (i + 1) + ': ' + questions[i] + '\n'
      answerText += 'A' + (i + 1) + ': ' + (answers[i] || '(no answer)') + '\n\n'
    }

    // Grade verification with Claude
    var response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: `You are verifying whether a candidate actually understands the assessment answer they submitted.

ORIGINAL CHALLENGE:
${attempt.challenge_text?.substring(0, 2000)}

THEIR ORIGINAL ANSWER:
${originalResponse.substring(0, 3000)}

VERIFICATION Q&A:
${answerText}

TIME SPENT ON VERIFICATION: ${timeSpent} seconds (limit was 180 seconds)
INITIAL AI DETECTION: ${aiProbability} probability of AI-generated content

EVALUATION:
- Do their verification answers show genuine understanding of their solution?
- Can they explain WHY they made specific choices?
- Do they know the limitations and trade-offs?
- Are the answers specific and confident, or vague and generic?
- Empty or "(no answer)" responses = they don't understand their own answer

If someone used AI for the main answer but doesn't understand it:
- Their verification answers will be vague, generic, or wrong
- They won't be able to reference specific parts of their code/solution
- They'll give textbook answers instead of context-specific ones

Return ONLY valid JSON:
{
  "verification_score": <0-100, how well they verified their understanding>,
  "verified": <true if they clearly understand their answer, false if not>,
  "confidence_adjustment": <-30 to +10, negative = AI suspicion confirmed, positive = AI suspicion cleared>,
  "reasoning": "<1-2 sentences explaining your assessment>",
  "answer_quality": ["<brief assessment of each answer: 'strong', 'weak', 'empty', 'vague', 'wrong'>"]
}`
        }]
      })
    })

    if (!response.ok) return Response.json({ error: 'Verification grading failed' }, { status: 500 })

    var data = await response.json()
    var rawText = data.content?.[0]?.text || ''

    var verification
    try {
      var cleaned = rawText.replace(/```json\s*|```\s*/g, '').trim()
      verification = JSON.parse(cleaned)
    } catch (e) {
      // If parsing fails, just finalise with current score
      verification = { verification_score: 50, verified: true, confidence_adjustment: 0, reasoning: 'Verification parsing error' }
    }

    // Calculate final score
    var adjustment = verification.confidence_adjustment || 0
    var finalScore = Math.min(100, Math.max(0, prelimScore + adjustment))

    // If verification clearly shows they don't understand, cap the score
    if (!verification.verified && verification.verification_score < 30) {
      finalScore = Math.min(finalScore, 35) // Cap at 35 if they can't explain their answer
    }

    // Update final AI probability based on verification
    var finalAiProbability = aiProbability
    if (!verification.verified && aiProbability === 'medium') finalAiProbability = 'high'
    if (verification.verified && aiProbability === 'medium') finalAiProbability = 'low'
    if (verification.verified && aiProbability === 'high') finalAiProbability = 'medium'

    // Build updated feedback
    var updatedFeedback = attempt.feedback || ''
    if (finalAiProbability === 'high') {
      updatedFeedback += ' Note: AI-assisted response detected with low verification confidence. Score adjusted accordingly.'
    } else if (adjustment > 0) {
      updatedFeedback += ' Verification confirmed strong understanding of the solution.'
    }

    // Finalise the attempt
    var { data: updated, error: updateError } = await supabaseAdmin
      .from('assessment_attempts')
      .update({
        score: finalScore,
        feedback: updatedFeedback,
        status: 'graded',
        graded_at: new Date().toISOString(),
        challenge_data: {
          ...attempt.challenge_data,
          ai_probability: finalAiProbability,
          verification: {
            score: verification.verification_score,
            verified: verification.verified,
            adjustment: adjustment,
            reasoning: verification.reasoning,
            answer_quality: verification.answer_quality,
            time_spent: timeSpent,
            answers: answers,
          }
        }
      })
      .eq('id', attemptId)
      .select()
      .single()

    if (updateError) return Response.json({ error: 'Failed to save: ' + updateError.message }, { status: 500 })

    return Response.json({
      attempt: updated,
      grading: {
        score: finalScore,
        feedback: updatedFeedback,
        strengths: attempt.strengths,
        improvements: attempt.improvements,
        ai_probability: finalAiProbability,
        verification: verification,
      }
    })

  } catch (err) {
    console.error('Verify error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
