import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(request) {
  try {
    var { jobId, userId } = await request.json()
    if (!jobId || !userId) return Response.json({ error: 'Missing jobId or userId' }, { status: 400 })
    if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: 'API key not configured' }, { status: 500 })

    // Get job details
    var { data: job } = await supabaseAdmin
      .from('jobs')
      .select('id, title, description, tags, companies(name)')
      .eq('id', jobId)
      .single()

    if (!job) return Response.json({ error: 'Job not found' }, { status: 404 })

    // Check for existing attempt
    var { data: existing } = await supabaseAdmin
      .from('assessment_attempts')
      .select('id, status, score, challenge_text')
      .eq('job_id', jobId)
      .eq('user_id', userId)
      .single()

    if (existing && existing.status === 'graded') {
      return Response.json({ error: 'Already completed', attempt: existing }, { status: 400 })
    }
    if (existing && existing.status === 'in_progress') {
      return Response.json({ attempt: existing })
    }

    // Detect assessment type from job title/tags
    var titleLower = (job.title || '').toLowerCase()
    var tags = (job.tags || []).join(' ').toLowerCase()
    var combined = titleLower + ' ' + tags

    var assessmentType = 'general'
    var difficulty = 'mid'

    if (/engineer|developer|devops|frontend|backend|fullstack|software|sre|platform/.test(combined)) {
      assessmentType = 'coding'
    } else if (/data|analyst|scientist|bi |analytics|machine learning/.test(combined)) {
      assessmentType = 'data_analysis'
    } else if (/marketing|content|copywriter|pr |communications|social media|seo/.test(combined)) {
      assessmentType = 'writing'
    } else if (/product|manager|director|head of|strategy|consultant|business/.test(combined)) {
      assessmentType = 'case_study'
    }

    if (/junior|graduate|intern|trainee|entry/.test(titleLower)) difficulty = 'junior'
    else if (/senior|sr /.test(titleLower)) difficulty = 'senior'
    else if (/lead|principal|staff|director|head of/.test(titleLower)) difficulty = 'lead'

    var timeLimit = assessmentType === 'coding' ? 45 : 30

    // Generate challenge with Claude
    var prompt = buildPrompt(assessmentType, difficulty, job)

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
        messages: [{ role: 'user', content: prompt }]
      })
    })

    if (!response.ok) return Response.json({ error: 'AI generation failed' }, { status: 500 })

    var data = await response.json()
    var challengeText = data.content?.[0]?.text || ''

    // Check/create assessment template
    var { data: assessment } = await supabaseAdmin
      .from('assessments')
      .select('id')
      .eq('job_id', jobId)
      .single()

    if (!assessment) {
      var { data: newAssessment } = await supabaseAdmin
        .from('assessments')
        .insert({
          job_id: jobId,
          title: assessmentType.replace('_', ' ') + ' assessment',
          assessment_type: assessmentType,
          time_limit_minutes: timeLimit,
          difficulty: difficulty,
        })
        .select()
        .single()
      assessment = newAssessment
    }

    // Create attempt
    var { data: attempt, error: attemptError } = await supabaseAdmin
      .from('assessment_attempts')
      .insert({
        assessment_id: assessment.id,
        user_id: userId,
        job_id: jobId,
        challenge_text: challengeText,
        challenge_data: { type: assessmentType, difficulty: difficulty, jobTitle: job.title, company: job.companies?.name },
        time_limit_minutes: timeLimit,
        status: 'in_progress',
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (attemptError) {
      return Response.json({ error: 'Failed to create attempt: ' + attemptError.message }, { status: 500 })
    }

    return Response.json({ attempt })

  } catch (err) {
    console.error('Generate assessment error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}

function buildPrompt(type, difficulty, job) {
  var difficultyDesc = {
    junior: 'junior/entry-level (1-2 years experience)',
    mid: 'mid-level (3-5 years experience)',
    senior: 'senior (5-8 years experience)',
    lead: 'lead/principal (8+ years experience)',
  }

  var base = 'Generate a skill assessment challenge for a ' + difficultyDesc[difficulty] + ' candidate applying for the role: ' + job.title + ' at ' + (job.companies?.name || 'a company') + '.\n\n'

  if (type === 'coding') {
    return base + `Create a practical coding challenge. Format your response as:

## Coding Challenge

[A clear problem statement - something practical and relevant to the role, not a LeetCode puzzle. For example: build a function that processes API data, implement a feature component, design a data pipeline step, etc.]

### Requirements
[3-5 specific requirements]

### Example Input/Output
[Show expected behavior]

### Evaluation Criteria
- Code correctness and completeness
- Code quality and readability
- Error handling
- Efficiency

The candidate should write their solution in the language most relevant to the role. Keep it achievable in 30-40 minutes. Make it practical, not academic.`

  } else if (type === 'data_analysis') {
    return base + `Create a data analysis challenge. Format your response as:

## Data Analysis Challenge

[Present a realistic business scenario with a dataset description. For example: "A subscription service has seen declining retention. Here is a summary of their user data over 6 months..."]

### The Data
[Provide a clear dataset in text/table format - keep it small enough to analyze manually but meaningful]

### Questions
[3-4 analysis questions that test practical skills: trend identification, metric calculation, insight generation, recommendations]

### Evaluation Criteria
- Analytical thinking
- Accuracy of calculations
- Quality of insights
- Business relevance of recommendations

Should be completable in 25-30 minutes.`

  } else if (type === 'writing') {
    return base + `Create a marketing/content challenge. Format your response as:

## Content Challenge

[A realistic brief - write a landing page section, email campaign, social media strategy, blog outline, or ad copy for a specific product/company scenario]

### Brief
[Detailed creative brief with target audience, goals, tone, constraints]

### Deliverables
[What exactly they need to produce]

### Evaluation Criteria
- Message clarity and persuasiveness
- Audience awareness
- Brand voice consistency
- Creative thinking

Should be completable in 25-30 minutes.`

  } else if (type === 'case_study') {
    return base + `Create a business case study challenge. Format your response as:

## Case Study

[A realistic business problem relevant to the role - product decision, market entry, process optimization, team scaling, etc.]

### Context
[Background information, data points, constraints]

### Questions
1. [Strategic question - how would you approach this?]
2. [Analytical question - what metrics/data would you use?]
3. [Execution question - outline your plan with timeline]

### Evaluation Criteria
- Strategic thinking
- Structured approach
- Practicality of recommendations
- Communication clarity

Should be completable in 25-30 minutes.`

  } else {
    return base + `Create a general professional assessment. Format your response as:

## Professional Assessment

[3-4 scenario-based questions relevant to the role that test practical knowledge, problem-solving, and communication skills]

### Evaluation Criteria
- Practical knowledge
- Problem-solving approach
- Communication clarity
- Relevance to role

Should be completable in 20-25 minutes.`
  }
}
