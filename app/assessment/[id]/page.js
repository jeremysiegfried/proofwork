'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export default function AssessmentPage({ params }) {
  var router = useRouter()
  var { user, loading: authLoading } = useAuth()
  var [attempt, setAttempt] = useState(null)
  var [job, setJob] = useState(null)
  var [loading, setLoading] = useState(true)
  var [generating, setGenerating] = useState(false)
  var [submitting, setSubmitting] = useState(false)
  var [response, setResponse] = useState('')
  var [error, setError] = useState('')
  var [timeLeft, setTimeLeft] = useState(null)
  var [grading, setGrading] = useState(null)
  var timerRef = useRef(null)

  // Verification follow-up state
  var [verifyPhase, setVerifyPhase] = useState(false)
  var [verifyQuestions, setVerifyQuestions] = useState([])
  var [verifyAnswers, setVerifyAnswers] = useState({})
  var [verifySubmitting, setVerifySubmitting] = useState(false)
  var [verifyTimeLeft, setVerifyTimeLeft] = useState(null)
  var verifyTimerRef = useRef(null)

  // Behavioral tracking
  var behaviorRef = useRef({
    keystrokes: 0,
    pasteCount: 0,
    pastedChars: 0,
    tabSwitches: 0,
    focusLosses: 0,
    largestPaste: 0,
    typingBursts: [], // timestamps of typing activity
    startedTypingAt: null,
    lastKeystrokeAt: null,
  })

  // Track paste events
  function handlePaste(e) {
    var pastedText = e.clipboardData?.getData('text') || ''
    var b = behaviorRef.current
    b.pasteCount++
    b.pastedChars += pastedText.length
    if (pastedText.length > b.largestPaste) b.largestPaste = pastedText.length
  }

  // Track keystrokes
  function handleKeyDown(e) {
    var b = behaviorRef.current
    // Don't count modifier keys, arrows, etc
    if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete' || e.key === 'Enter') {
      b.keystrokes++
      var now = Date.now()
      if (!b.startedTypingAt) b.startedTypingAt = now
      b.lastKeystrokeAt = now
      // Record burst timestamps (sample every 5th keystroke)
      if (b.keystrokes % 5 === 0) b.typingBursts.push(now)
    }
  }

  // Track tab switches / focus loss
  useEffect(function() {
    function handleVisibility() {
      if (document.hidden) {
        behaviorRef.current.tabSwitches++
      }
    }
    function handleBlur() {
      behaviorRef.current.focusLosses++
    }
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('blur', handleBlur)
    return function() {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('blur', handleBlur)
    }
  }, [])

  useEffect(function() {
    if (authLoading) return
    if (!user) { router.push('/login'); return }
    loadData()
  }, [user, authLoading])

  // Main timer
  useEffect(function() {
    if (!attempt || attempt.status !== 'in_progress') return
    function updateTimer() {
      var started = new Date(attempt.started_at)
      var limit = attempt.time_limit_minutes * 60 * 1000
      var elapsed = Date.now() - started.getTime()
      var remaining = Math.max(0, limit - elapsed)
      setTimeLeft(remaining)
    }
    updateTimer()
    timerRef.current = setInterval(updateTimer, 1000)
    return function() { clearInterval(timerRef.current) }
  }, [attempt])

  // Verification timer (3 minutes total for follow-ups)
  useEffect(function() {
    if (!verifyPhase) return
    var verifyStart = Date.now()
    var verifyLimit = 180000 // 3 minutes
    function updateVerifyTimer() {
      var remaining = Math.max(0, verifyLimit - (Date.now() - verifyStart))
      setVerifyTimeLeft(remaining)
      if (remaining <= 0) {
        // Auto-submit if time runs out
        submitVerification()
      }
    }
    updateVerifyTimer()
    verifyTimerRef.current = setInterval(updateVerifyTimer, 1000)
    return function() { clearInterval(verifyTimerRef.current) }
  }, [verifyPhase])

  async function loadData() {
    var { data: jobData } = await supabase
      .from('jobs')
      .select('id, title, slug, companies(name)')
      .eq('id', params.id)
      .single()

    if (jobData) {
      setJob(jobData)
      var { data: existingAttempt } = await supabase
        .from('assessment_attempts')
        .select('*')
        .eq('job_id', params.id)
        .eq('user_id', user.id)
        .single()

      if (existingAttempt) {
        setAttempt(existingAttempt)
        if (existingAttempt.response_text) setResponse(existingAttempt.response_text)
      }
    }
    setLoading(false)
  }

  async function startAssessment() {
    setGenerating(true)
    setError('')
    try {
      var res = await fetch('/api/assessment/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: params.id, userId: user.id })
      })
      var data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate')
      setAttempt(data.attempt)
      // Reset behavior tracking
      behaviorRef.current = {
        keystrokes: 0, pasteCount: 0, pastedChars: 0,
        tabSwitches: 0, focusLosses: 0, largestPaste: 0,
        typingBursts: [], startedTypingAt: null, lastKeystrokeAt: null,
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  async function submitAssessment() {
    if (!response.trim()) { setError('Please write your response before submitting'); return }
    setSubmitting(true)
    setError('')
    try {
      var behavior = behaviorRef.current
      var res = await fetch('/api/assessment/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId: attempt.id,
          responseText: response,
          behavior: {
            keystrokes: behavior.keystrokes,
            pasteCount: behavior.pasteCount,
            pastedChars: behavior.pastedChars,
            largestPaste: behavior.largestPaste,
            tabSwitches: behavior.tabSwitches,
            focusLosses: behavior.focusLosses,
            responseLength: response.length,
            typingDurationMs: behavior.lastKeystrokeAt && behavior.startedTypingAt ? behavior.lastKeystrokeAt - behavior.startedTypingAt : 0,
            typingBurstCount: behavior.typingBursts.length,
          }
        })
      })
      var data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Grading failed')

      // If we got verification questions, show them
      if (data.verifyQuestions && data.verifyQuestions.length > 0) {
        setGrading(data.grading)
        setVerifyQuestions(data.verifyQuestions)
        setVerifyPhase(true)
      } else {
        setAttempt(data.attempt)
        setGrading(data.grading)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function submitVerification() {
    if (verifySubmitting) return
    setVerifySubmitting(true)
    setError('')
    clearInterval(verifyTimerRef.current)
    try {
      var res = await fetch('/api/assessment/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId: attempt.id,
          answers: verifyAnswers,
          timeSpent: verifyTimeLeft !== null ? 180 - Math.floor(verifyTimeLeft / 1000) : 180,
        })
      })
      var data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Verification failed')
      setAttempt(data.attempt)
      setGrading(data.grading)
      setVerifyPhase(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setVerifySubmitting(false)
    }
  }

  function formatTime(ms) {
    if (ms === null) return '--:--'
    var totalSeconds = Math.floor(ms / 1000)
    var mins = Math.floor(totalSeconds / 60)
    var secs = totalSeconds % 60
    return mins + ':' + String(secs).padStart(2, '0')
  }

  function getScoreColor(score) {
    if (score >= 75) return 'text-pw-green'
    if (score >= 60) return 'text-pw-amber'
    return 'text-red-500'
  }

  function getScoreBg(score) {
    if (score >= 75) return 'bg-pw-greenDark border-pw-green/20'
    if (score >= 60) return 'bg-pw-amberDark border-pw-amber/20'
    return 'bg-red-50 border-red-200'
  }

  function getScoreLabel(score) {
    if (score >= 90) return 'Exceptional'
    if (score >= 75) return 'Strong'
    if (score >= 60) return 'Adequate'
    if (score >= 40) return 'Below expectations'
    return 'Needs improvement'
  }

  if (authLoading || loading) {
    return <div className="max-w-3xl mx-auto px-6 py-20 text-center text-pw-muted text-sm">Loading...</div>
  }

  if (!job) {
    return (
      <div className="max-w-xl mx-auto px-6 py-20 text-center">
        <h1 className="font-display text-xl font-bold mb-2">Job not found</h1>
        <Link href="/jobs" className="text-pw-green text-sm hover:underline">← Browse jobs</Link>
      </div>
    )
  }

  // VERIFICATION PHASE - quick follow-up questions
  if (verifyPhase && verifyQuestions.length > 0) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-6">
        <div className="sticky top-[49px] z-40 flex items-center justify-between px-4 py-2 rounded-lg mb-4 border bg-pw-amberDark border-pw-amber/20">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-pw-amberText">Verification round</span>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-pw-bg text-pw-muted border border-pw-border">Quick-fire questions</span>
          </div>
          <span className={'font-mono text-sm font-bold ' + (verifyTimeLeft < 30000 ? 'text-red-500' : 'text-pw-amber')}>
            {formatTime(verifyTimeLeft)}
          </span>
        </div>

        <div className="bg-pw-card border border-pw-border rounded-xl p-5 mb-4">
          <div className="text-[10px] font-mono text-pw-amber uppercase tracking-wider mb-2">Why this step?</div>
          <p className="text-sm text-pw-text2 leading-relaxed">
            To verify your understanding, answer these quick questions about YOUR solution. These are timed and specific to what you wrote. Be concise — a few sentences each.
          </p>
        </div>

        {error && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs">{error}</div>}

        {verifyQuestions.map(function(q, i) {
          return (
            <div key={i} className="bg-pw-card border border-pw-border rounded-xl p-5 mb-3">
              <div className="text-[10px] font-mono text-pw-green uppercase tracking-wider mb-2">Question {i + 1} of {verifyQuestions.length}</div>
              <p className="text-sm text-pw-text1 font-semibold mb-3">{q}</p>
              <textarea
                value={verifyAnswers[i] || ''}
                onChange={function(e) {
                  setVerifyAnswers(function(prev) { var n = { ...prev }; n[i] = e.target.value; return n })
                }}
                placeholder="Your answer..."
                rows={3}
                className="w-full px-3 py-2.5 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1 resize-y"
                onPaste={function(e) { e.preventDefault() }}
              />
            </div>
          )
        })}

        <button
          onClick={submitVerification}
          disabled={verifySubmitting}
          className={'w-full py-4 rounded-xl font-extrabold text-sm transition-all ' + (verifySubmitting ? 'bg-pw-border text-pw-muted' : 'bg-pw-green text-white hover:translate-y-[-1px] hover:shadow-lg hover:shadow-pw-green/20')}
        >
          {verifySubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              Verifying...
            </span>
          ) : 'Submit verification'}
        </button>
      </div>
    )
  }

  // GRADED STATE - show results
  if (attempt && attempt.status === 'graded') {
    var score = attempt.score || 0
    var aiFlag = attempt.challenge_data?.ai_probability

    return (
      <div className="max-w-2xl mx-auto px-6 py-8">
        <Link href={'/jobs/' + job.slug} className="text-xs text-pw-muted hover:text-pw-text2 transition-colors mb-4 inline-block">← {job.title}</Link>

        <div className="text-center mb-6">
          <div className={'w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-3 border-2 ' + getScoreBg(score)}>
            <span className={'font-mono text-2xl font-black ' + getScoreColor(score)}>{score}</span>
          </div>
          <h1 className="font-display text-2xl font-black tracking-tight">{getScoreLabel(score)}</h1>
          <p className="text-sm text-pw-text2 mt-1">{job.title} at {job.companies?.name}</p>
        </div>

        {aiFlag && aiFlag === 'high' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <div className="text-xs text-red-600 leading-relaxed">
              <strong>AI-assisted response detected.</strong> Our system flagged behavioral patterns suggesting significant AI assistance. This has been factored into your score. Employers can see this flag.
            </div>
          </div>
        )}

        <div className="bg-pw-card border border-pw-border rounded-xl p-5 mb-4">
          <p className="text-sm text-pw-text3 leading-relaxed mb-4">{attempt.feedback || grading?.feedback}</p>

          {(attempt.strengths?.length > 0 || grading?.strengths?.length > 0) && (
            <div className="mb-3">
              <div className="text-[10px] font-mono text-pw-green uppercase tracking-wider mb-2">Strengths</div>
              {(attempt.strengths || grading?.strengths || []).map(function(s, i) {
                return <div key={i} className="text-xs text-pw-text3 py-1 flex gap-2"><span className="text-pw-green">✓</span>{s}</div>
              })}
            </div>
          )}

          {(attempt.improvements?.length > 0 || grading?.improvements?.length > 0) && (
            <div>
              <div className="text-[10px] font-mono text-pw-amber uppercase tracking-wider mb-2">Areas to improve</div>
              {(attempt.improvements || grading?.improvements || []).map(function(s, i) {
                return <div key={i} className="text-xs text-pw-text3 py-1 flex gap-2"><span className="text-pw-amber">→</span>{s}</div>
              })}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Link href={'/jobs/' + job.slug} className="flex-1 py-3 rounded-lg bg-pw-green text-white font-bold text-sm text-center hover:translate-y-[-1px] hover:shadow-lg hover:shadow-pw-green/20 transition-all">
            Back to job →
          </Link>
          <Link href="/candidate/matches" className="flex-1 py-3 rounded-lg border border-pw-border text-pw-text1 font-bold text-sm text-center hover:bg-pw-card transition-colors">
            View matches
          </Link>
        </div>
      </div>
    )
  }

  // IN-PROGRESS STATE - taking the assessment
  if (attempt && attempt.status === 'in_progress') {
    var isOvertime = timeLeft !== null && timeLeft <= 0
    return (
      <div className="max-w-3xl mx-auto px-6 py-6">
        <div className={'sticky top-[49px] z-40 flex items-center justify-between px-4 py-2 rounded-lg mb-4 border ' + (isOvertime ? 'bg-red-50 border-red-200' : timeLeft < 300000 ? 'bg-pw-amberDark border-pw-amber/20' : 'bg-pw-card border-pw-border')}>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-pw-text1">{job.title}</span>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-pw-bg text-pw-muted border border-pw-border">
              {attempt.challenge_data?.type || 'assessment'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className={'font-mono text-sm font-bold ' + (isOvertime ? 'text-red-500' : timeLeft < 300000 ? 'text-pw-amber' : 'text-pw-text1')}>
              {isOvertime ? 'OVERTIME' : formatTime(timeLeft)}
            </span>
            <button
              onClick={submitAssessment}
              disabled={submitting || !response.trim()}
              className={'px-4 py-1.5 rounded-lg text-xs font-bold transition-all ' + (submitting ? 'bg-pw-border text-pw-muted' : 'bg-pw-green text-white hover:translate-y-[-1px]')}
            >
              {submitting ? 'Grading...' : 'Submit'}
            </button>
          </div>
        </div>

        {error && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs">{error}</div>}

        <div className="bg-pw-card border border-pw-border rounded-xl p-5 mb-4">
          <div className="text-[10px] font-mono text-pw-green uppercase tracking-wider mb-3">Your challenge</div>
          <div className="prose prose-sm max-w-none text-pw-text3 leading-relaxed job-desc" dangerouslySetInnerHTML={{ __html: formatChallenge(attempt.challenge_text) }} />
        </div>

        <div className="bg-pw-card border border-pw-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] font-mono text-pw-green uppercase tracking-wider">Your response</div>
            <div className="text-[10px] font-mono text-pw-muted">{response.length.toLocaleString()} chars</div>
          </div>
          <textarea
            value={response}
            onChange={function(e) { setResponse(e.target.value) }}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            placeholder="Write your answer here... Take your time, be thorough, and show your working."
            rows={20}
            className="w-full px-4 py-3 rounded-lg border border-pw-border bg-pw-bg text-sm text-pw-text1 resize-y font-mono text-xs leading-relaxed"
            autoFocus
          />
          <div className="mt-2 text-[9px] font-mono text-pw-muted">
            Your typing patterns are monitored to verify authenticity. Write in your own words.
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={submitAssessment}
            disabled={submitting || !response.trim()}
            className={'w-full py-4 rounded-xl font-extrabold text-sm transition-all ' + (submitting ? 'bg-pw-border text-pw-muted' : response.trim() ? 'bg-pw-green text-white hover:translate-y-[-1px] hover:shadow-lg hover:shadow-pw-green/20' : 'bg-pw-border text-pw-muted cursor-not-allowed')}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                AI is grading your submission...
              </span>
            ) : 'Submit for grading'}
          </button>
        </div>
      </div>
    )
  }

  // START STATE
  return (
    <div className="max-w-xl mx-auto px-6 py-8">
      <Link href={'/jobs/' + job.slug} className="text-xs text-pw-muted hover:text-pw-text2 transition-colors mb-4 inline-block">← {job.title}</Link>

      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-full bg-pw-greenDark flex items-center justify-center mx-auto mb-4 text-2xl border border-pw-green/20">⚡</div>
        <h1 className="font-display text-2xl font-black tracking-tight mb-2">Skill Assessment</h1>
        <p className="text-sm text-pw-text2">{job.title} at {job.companies?.name}</p>
      </div>

      {error && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs">{error}</div>}

      <div className="bg-pw-card border border-pw-border rounded-xl p-5 mb-4">
        <div className="text-[10px] font-mono text-pw-green uppercase tracking-wider mb-3">How it works</div>
        <div className="flex flex-col gap-3 text-sm text-pw-text3">
          <div className="flex gap-3"><span className="text-pw-green font-bold shrink-0">1.</span> AI generates a challenge tailored to this role</div>
          <div className="flex gap-3"><span className="text-pw-green font-bold shrink-0">2.</span> You have a set time limit to write your response</div>
          <div className="flex gap-3"><span className="text-pw-green font-bold shrink-0">3.</span> After submitting, you answer quick verification questions about your solution</div>
          <div className="flex gap-3"><span className="text-pw-green font-bold shrink-0">4.</span> AI grades everything and gives a verified score (0-100)</div>
        </div>
      </div>

      <div className="bg-pw-card border border-pw-border rounded-xl p-5 mb-4">
        <div className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mb-3">Before you start</div>
        <div className="flex flex-col gap-2 text-xs text-pw-text2">
          <div className="flex gap-2"><span className="text-pw-amber">⚠</span> The timer starts once you click "Start". You can't pause it.</div>
          <div className="flex gap-2"><span className="text-pw-amber">⚠</span> You get one attempt per job.</div>
          <div className="flex gap-2"><span className="text-red-500">⚠</span> AI-generated responses are detected and penalised. Write your own answer.</div>
          <div className="flex gap-2"><span className="text-red-500">⚠</span> After submitting, you'll face quick-fire verification questions about YOUR solution.</div>
          <div className="flex gap-2"><span className="text-pw-green">✓</span> You can reference docs — this tests understanding, not memorisation.</div>
        </div>
      </div>

      <button
        onClick={startAssessment}
        disabled={generating}
        className={'w-full py-4 rounded-xl font-extrabold text-sm transition-all ' + (generating ? 'bg-pw-border text-pw-muted' : 'bg-pw-green text-white hover:translate-y-[-1px] hover:shadow-lg hover:shadow-pw-green/20')}
      >
        {generating ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            Generating your challenge...
          </span>
        ) : 'Start assessment →'}
      </button>
    </div>
  )
}

function formatChallenge(text) {
  if (!text) return ''
  return text
    .replace(/## (.*)/g, '<h2>$1</h2>')
    .replace(/### (.*)/g, '<h3>$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.*)/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$&</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
}
