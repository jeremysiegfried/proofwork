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

  useEffect(function() {
    if (authLoading) return
    if (!user) { router.push('/login'); return }
    loadData()
  }, [user, authLoading])

  // Timer
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

  async function loadData() {
    // Load job
    var { data: jobData } = await supabase
      .from('jobs')
      .select('id, title, slug, companies(name)')
      .eq('id', params.id)
      .single()

    if (jobData) {
      setJob(jobData)
      // Check for existing attempt
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
      var res = await fetch('/api/assessment/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId: attempt.id, responseText: response })
      })
      var data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Grading failed')
      setAttempt(data.attempt)
      setGrading(data.grading)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
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

  // Graded state
  if (attempt && attempt.status === 'graded') {
    var score = attempt.score || 0
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

        {grading?.criteria && (
          <div className="bg-pw-card border border-pw-border rounded-xl p-5 mb-4">
            <div className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mb-3">Score breakdown</div>
            {Object.entries(grading.criteria).map(function(entry) {
              var label = entry[0].charAt(0).toUpperCase() + entry[0].slice(1)
              var val = entry[1]
              return (
                <div key={entry[0]} className="flex items-center gap-3 py-1.5">
                  <span className="text-xs text-pw-text3 w-28">{label}</span>
                  <div className="flex-1 h-2 rounded-full bg-pw-border overflow-hidden">
                    <div className="h-full rounded-full bg-pw-green transition-all" style={{ width: (val / 25 * 100) + '%' }} />
                  </div>
                  <span className="text-xs font-mono text-pw-text1 w-10 text-right">{val}/25</span>
                </div>
              )
            })}
          </div>
        )}

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

  // In-progress state
  if (attempt && attempt.status === 'in_progress') {
    var isOvertime = timeLeft !== null && timeLeft <= 0
    return (
      <div className="max-w-3xl mx-auto px-6 py-6">
        {/* Sticky timer bar */}
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

        {/* Challenge */}
        <div className="bg-pw-card border border-pw-border rounded-xl p-5 mb-4">
          <div className="text-[10px] font-mono text-pw-green uppercase tracking-wider mb-3">Your challenge</div>
          <div className="prose prose-sm max-w-none text-pw-text3 leading-relaxed job-desc" dangerouslySetInnerHTML={{ __html: formatChallenge(attempt.challenge_text) }} />
        </div>

        {/* Response area */}
        <div className="bg-pw-card border border-pw-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] font-mono text-pw-green uppercase tracking-wider">Your response</div>
            <div className="text-[10px] font-mono text-pw-muted">{response.length.toLocaleString()} characters</div>
          </div>
          <textarea
            value={response}
            onChange={function(e) { setResponse(e.target.value) }}
            placeholder="Write your answer here... Take your time, be thorough, and show your working."
            rows={20}
            className="w-full px-4 py-3 rounded-lg border border-pw-border bg-pw-bg text-sm text-pw-text1 resize-y font-mono text-xs leading-relaxed"
            autoFocus
          />
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
          <div className="text-center text-[10px] text-pw-muted mt-2">
            Your response will be graded by AI. You cannot edit after submission.
          </div>
        </div>
      </div>
    )
  }

  // Start state
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
          <div className="flex gap-3"><span className="text-pw-green font-bold shrink-0">3.</span> AI grades your submission and gives a score (0-100)</div>
          <div className="flex gap-3"><span className="text-pw-green font-bold shrink-0">4.</span> Your verified score appears on your applications</div>
        </div>
      </div>

      <div className="bg-pw-card border border-pw-border rounded-xl p-5 mb-4">
        <div className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mb-3">Before you start</div>
        <div className="flex flex-col gap-2 text-xs text-pw-text2">
          <div className="flex gap-2"><span className="text-pw-amber">⚠</span> The timer starts once you click "Start". You can't pause it.</div>
          <div className="flex gap-2"><span className="text-pw-amber">⚠</span> You get one attempt per job.</div>
          <div className="flex gap-2"><span className="text-pw-green">✓</span> You can use any resources — this isn't a memory test.</div>
          <div className="flex gap-2"><span className="text-pw-green">✓</span> Quality over speed. A thoughtful answer beats a rushed one.</div>
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
