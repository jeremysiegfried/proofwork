'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import TrustRing from '@/components/TrustRing'

var STATUS_CONFIG = {
  submitted: { label: 'New', color: 'bg-blue-50 text-blue-700 border-blue-200', next: ['reviewing', 'interview'] },
  reviewing: { label: 'Reviewing', color: 'bg-amber-50 text-amber-700 border-amber-200', next: ['interview', 'rejected'] },
  interview: { label: 'Interview', color: 'bg-purple-50 text-purple-700 border-purple-200', next: ['offer', 'rejected'] },
  offer: { label: 'Offer sent', color: 'bg-green-50 text-green-700 border-green-200', next: [] },
  rejected: { label: 'Rejected', color: 'bg-red-50 text-red-600 border-red-200', next: ['reviewing'] },
}

export default function ApplicantDetailPage({ params }) {
  var router = useRouter()
  var { user, profile, loading: authLoading } = useAuth()
  var [app, setApp] = useState(null)
  var [job, setJob] = useState(null)
  var [candidate, setCandidate] = useState(null)
  var [assessment, setAssessment] = useState(null)
  var [loading, setLoading] = useState(true)
  var [note, setNote] = useState('')

  useEffect(function() {
    if (authLoading) return
    if (!user) { router.push('/login'); return }
    if (profile?.role !== 'employer') { router.push('/dashboard'); return }
    loadData()
  }, [user, profile, authLoading])

  async function loadData() {
    // Load application
    var { data: appData } = await supabase
      .from('applications')
      .select('*')
      .eq('id', params.id)
      .single()

    if (!appData) { setLoading(false); return }
    setApp(appData)

    // Load job
    var { data: jobData } = await supabase
      .from('jobs')
      .select('*, companies(name, slug)')
      .eq('id', appData.job_id)
      .single()
    setJob(jobData)

    // Load candidate profile by email
    var { data: candidateData } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('email', appData.email)
      .single()
    setCandidate(candidateData)

    // Load assessment attempt
    if (candidateData) {
      var { data: attemptData } = await supabase
        .from('assessment_attempts')
        .select('*')
        .eq('job_id', appData.job_id)
        .eq('user_id', candidateData.user_id)
        .eq('status', 'graded')
        .single()
      setAssessment(attemptData)
    }

    setLoading(false)
  }

  async function updateStatus(newStatus) {
    await supabase.from('applications').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', app.id)
    setApp(function(prev) { return { ...prev, status: newStatus } })
  }

  function getScoreColor(score) {
    if (score >= 75) return 'text-pw-green'
    if (score >= 50) return 'text-pw-amber'
    return 'text-red-500'
  }

  function getScoreBg(score) {
    if (score >= 75) return 'bg-pw-greenDark border-pw-green/20'
    if (score >= 50) return 'bg-pw-amberDark border-pw-amber/20'
    return 'bg-red-50 border-red-200'
  }

  if (authLoading || loading) {
    return <div className="max-w-4xl mx-auto px-6 py-20 text-center text-pw-muted text-sm">Loading...</div>
  }

  if (!app) {
    return (
      <div className="max-w-xl mx-auto px-6 py-20 text-center">
        <h1 className="font-display text-xl font-bold mb-2">Application not found</h1>
        <Link href="/dashboard/employer" className="text-pw-green text-sm hover:underline">← Dashboard</Link>
      </div>
    )
  }

  var config = STATUS_CONFIG[app.status] || STATUS_CONFIG.submitted

  return (
    <div className="max-w-4xl mx-auto px-6 py-6">
      <Link href="/dashboard/employer" className="text-xs text-pw-muted hover:text-pw-text2 transition-colors mb-4 inline-block">← Dashboard</Link>

      {/* Header */}
      <div className="bg-pw-card border border-pw-border rounded-xl p-5 mb-4">
        <div className="flex justify-between items-start gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="font-display text-2xl font-black tracking-tight">{app.full_name}</h1>
              <span className={'text-[9px] font-mono px-2 py-0.5 rounded border font-semibold ' + config.color}>
                {config.label}
              </span>
              {assessment && (
                <span className={'text-[9px] font-mono px-2 py-0.5 rounded border font-bold ' + getScoreBg(assessment.score)}>
                  <span className={getScoreColor(assessment.score)}>⚡ {assessment.score}/100</span>
                </span>
              )}
            </div>
            <div className="text-sm text-pw-text2">{app.email}</div>
            {job && <div className="text-xs text-pw-muted mt-1">Applied for: <strong className="text-pw-text3">{job.title}</strong></div>}
            <div className="text-[10px] text-pw-muted font-mono mt-1">
              Applied {new Date(app.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>

          {/* Status actions */}
          <div className="flex gap-1.5 flex-wrap">
            {(config.next || []).map(function(nextStatus) {
              var nextConfig = STATUS_CONFIG[nextStatus]
              return (
                <button key={nextStatus} onClick={function() { updateStatus(nextStatus) }}
                  className={'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all hover:translate-y-[-1px] ' + nextConfig.color}>
                  Move to {nextConfig.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-4">
        {/* Main content */}
        <div>
          {/* Candidate profile from CV */}
          {candidate ? (
            <div className="bg-pw-card border border-pw-border rounded-xl p-5 mb-4">
              <div className="flex justify-between items-start mb-3">
                <div className="text-[10px] font-mono text-pw-green uppercase tracking-wider">AI-parsed CV profile</div>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-pw-greenDark text-pw-greenText font-bold border border-pw-green/20">
                  {candidate.seniority} · {candidate.years_experience}+ years
                </span>
              </div>

              {/* Summary */}
              <p className="text-sm text-pw-text3 leading-relaxed mb-4">{candidate.summary}</p>

              {/* Skills */}
              {candidate.skills && candidate.skills.length > 0 && (
                <div className="mb-4">
                  <div className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mb-2">Skills ({candidate.skills.length})</div>
                  <div className="flex gap-1.5 flex-wrap">
                    {candidate.skills.map(function(s) {
                      // Highlight skills that match the job
                      var jobText = job ? ((job.title || '') + ' ' + (job.description || '') + ' ' + (job.tags || []).join(' ')).toLowerCase() : ''
                      var isMatch = jobText.includes(s.toLowerCase())
                      return (
                        <span key={s} className={'px-2.5 py-1 rounded-md text-xs font-mono border ' +
                          (isMatch ? 'bg-pw-greenDark text-pw-green border-pw-green/20 font-bold' : 'bg-pw-bg text-pw-text3 border-pw-border')
                        }>{s}</span>
                      )
                    })}
                  </div>
                  <div className="text-[9px] text-pw-muted mt-1.5 font-mono">Green = matches this job's requirements</div>
                </div>
              )}

              {/* Job titles */}
              {candidate.job_titles && candidate.job_titles.length > 0 && (
                <div className="mb-4">
                  <div className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mb-2">Experience</div>
                  <div className="flex gap-1.5 flex-wrap">
                    {candidate.job_titles.map(function(t) {
                      return <span key={t} className="px-2.5 py-1 rounded-md bg-pw-bg text-pw-text3 text-xs font-mono border border-pw-border">{t}</span>
                    })}
                  </div>
                </div>
              )}

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {candidate.location && (
                  <div>
                    <div className="text-[10px] font-mono text-pw-muted uppercase mb-0.5">Location</div>
                    <div className="text-pw-text3">{candidate.location}</div>
                  </div>
                )}
                {candidate.education && (
                  <div>
                    <div className="text-[10px] font-mono text-pw-muted uppercase mb-0.5">Education</div>
                    <div className="text-pw-text3">{candidate.education}</div>
                  </div>
                )}
                {candidate.salary_min > 0 && (
                  <div>
                    <div className="text-[10px] font-mono text-pw-muted uppercase mb-0.5">Salary expectation</div>
                    <div className="font-mono font-bold text-pw-green">£{Math.round(candidate.salary_min/1000)}k–£{Math.round(candidate.salary_max/1000)}k</div>
                  </div>
                )}
                {candidate.preferred_locations && candidate.preferred_locations.length > 0 && (
                  <div>
                    <div className="text-[10px] font-mono text-pw-muted uppercase mb-0.5">Open to</div>
                    <div className="text-pw-text3">{candidate.preferred_locations.join(', ')}</div>
                  </div>
                )}
                {candidate.industries && candidate.industries.length > 0 && (
                  <div>
                    <div className="text-[10px] font-mono text-pw-muted uppercase mb-0.5">Industries</div>
                    <div className="text-pw-text3">{candidate.industries.join(', ')}</div>
                  </div>
                )}
                {candidate.languages && candidate.languages.length > 0 && (
                  <div>
                    <div className="text-[10px] font-mono text-pw-muted uppercase mb-0.5">Languages</div>
                    <div className="text-pw-text3">{candidate.languages.join(', ')}</div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-pw-card border border-pw-border rounded-xl p-5 mb-4">
              <div className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mb-2">Candidate profile</div>
              <p className="text-sm text-pw-text2">This candidate hasn't uploaded their CV to ShowJob yet. You have their application details below.</p>
            </div>
          )}

          {/* Assessment results */}
          {assessment && (
            <div className="bg-pw-card border border-pw-border rounded-xl p-5 mb-4">
              <div className="flex justify-between items-start mb-3">
                <div className="text-[10px] font-mono text-pw-green uppercase tracking-wider">Skill assessment results</div>
                <div className={'w-14 h-14 rounded-full flex items-center justify-center border-2 ' + getScoreBg(assessment.score)}>
                  <span className={'font-mono text-lg font-black ' + getScoreColor(assessment.score)}>{assessment.score}</span>
                </div>
              </div>

              <p className="text-sm text-pw-text3 leading-relaxed mb-3">{assessment.feedback}</p>

              {/* AI flag */}
              {assessment.challenge_data?.ai_probability === 'high' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                  <div className="text-xs text-red-600"><strong>AI-assisted response detected.</strong> Behavioral analysis and verification round suggest significant AI usage.</div>
                </div>
              )}

              {assessment.strengths && assessment.strengths.length > 0 && (
                <div className="mb-3">
                  <div className="text-[10px] font-mono text-pw-green uppercase tracking-wider mb-1.5">Strengths</div>
                  {assessment.strengths.map(function(s, i) {
                    return <div key={i} className="text-xs text-pw-text3 py-0.5 flex gap-2"><span className="text-pw-green">✓</span>{s}</div>
                  })}
                </div>
              )}

              {assessment.improvements && assessment.improvements.length > 0 && (
                <div className="mb-3">
                  <div className="text-[10px] font-mono text-pw-amber uppercase tracking-wider mb-1.5">Areas to improve</div>
                  {assessment.improvements.map(function(s, i) {
                    return <div key={i} className="text-xs text-pw-text3 py-0.5 flex gap-2"><span className="text-pw-amber">→</span>{s}</div>
                  })}
                </div>
              )}

              {/* Criteria breakdown */}
              {assessment.challenge_data?.criteria && (
                <div>
                  <div className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mb-2">Score breakdown</div>
                  {Object.entries(assessment.challenge_data.criteria).map(function(entry) {
                    var label = entry[0].charAt(0).toUpperCase() + entry[0].slice(1)
                    var val = entry[1]
                    return (
                      <div key={entry[0]} className="flex items-center gap-3 py-1">
                        <span className="text-xs text-pw-text3 w-24">{label}</span>
                        <div className="flex-1 h-2 rounded-full bg-pw-border overflow-hidden">
                          <div className="h-full rounded-full bg-pw-green" style={{ width: (val / 25 * 100) + '%' }} />
                        </div>
                        <span className="text-xs font-mono text-pw-text1 w-10 text-right">{val}/25</span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Assessment metadata */}
              <div className="mt-3 pt-3 border-t border-pw-border text-[10px] text-pw-muted font-mono">
                Type: {assessment.challenge_data?.type || 'general'} ·
                Completed: {assessment.graded_at ? new Date(assessment.graded_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'N/A'}
                {assessment.challenge_data?.ai_probability && (' · AI probability: ' + assessment.challenge_data.ai_probability)}
              </div>
            </div>
          )}

          {/* Application details */}
          <div className="bg-pw-card border border-pw-border rounded-xl p-5 mb-4">
            <div className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mb-3">Application details</div>

            <div className="grid grid-cols-2 gap-3 text-sm mb-3">
              <div>
                <div className="text-[10px] font-mono text-pw-muted uppercase mb-0.5">Notice period</div>
                <div className="text-pw-text3">{app.notice_period || 'Not specified'}</div>
              </div>
              <div>
                <div className="text-[10px] font-mono text-pw-muted uppercase mb-0.5">Right to work</div>
                <div className="text-pw-text3">{app.right_to_work || 'Not specified'}</div>
              </div>
              {app.linkedin && (
                <div>
                  <div className="text-[10px] font-mono text-pw-muted uppercase mb-0.5">LinkedIn</div>
                  <a href={'https://' + app.linkedin.replace(/^https?:\/\//, '')} target="_blank" rel="noopener noreferrer"
                    className="text-pw-green text-xs hover:underline">{app.linkedin}</a>
                </div>
              )}
            </div>

            {app.cover_note && (
              <div>
                <div className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mb-1.5">Cover note</div>
                <div className="p-3 bg-pw-bg rounded-lg border border-pw-border text-sm text-pw-text3 leading-relaxed whitespace-pre-wrap">
                  {app.cover_note}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div>
          {/* Quick actions */}
          <div className="bg-pw-card border border-pw-border rounded-xl p-4 mb-3">
            <div className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mb-3">Actions</div>
            <div className="flex flex-col gap-1.5">
              {(config.next || []).map(function(nextStatus) {
                var nextConfig = STATUS_CONFIG[nextStatus]
                return (
                  <button key={nextStatus} onClick={function() { updateStatus(nextStatus) }}
                    className={'w-full py-2 rounded-lg text-xs font-bold border transition-all hover:translate-y-[-1px] ' + nextConfig.color}>
                    Move to {nextConfig.label}
                  </button>
                )
              })}
              {app.email && (
                <a href={'mailto:' + app.email + '?subject=Re: ' + (job?.title || 'Your application') + ' at ' + (job?.companies?.name || '')}
                  className="w-full py-2 rounded-lg text-xs font-bold text-center bg-pw-bg border border-pw-border text-pw-text1 hover:border-pw-green/30 transition-all block">
                  Email candidate
                </a>
              )}
            </div>
          </div>

          {/* Job context */}
          {job && (
            <div className="bg-pw-card border border-pw-border rounded-xl p-4 mb-3">
              <div className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mb-2">Applied for</div>
              <Link href={'/jobs/' + job.slug} className="text-sm font-bold text-pw-text1 hover:text-pw-green transition-colors">{job.title}</Link>
              <div className="text-xs text-pw-muted mt-0.5">{job.location} · {job.remote_policy}</div>
              {job.salary_min > 0 && (
                <div className="font-mono text-sm font-bold text-pw-green mt-1">£{Math.round(job.salary_min/1000)}k–£{Math.round(job.salary_max/1000)}k</div>
              )}
              <div className="mt-2 flex items-center gap-2">
                <TrustRing score={job.trust_score} size={32} />
                <span className="text-[10px] text-pw-muted font-mono">Trust score</span>
              </div>
            </div>
          )}

          {/* Salary match check */}
          {candidate && candidate.salary_min > 0 && job && job.salary_min > 0 && (
            <div className={'rounded-xl p-4 mb-3 border ' +
              (candidate.salary_min <= job.salary_max ? 'bg-pw-greenDark border-pw-green/20' : 'bg-pw-amberDark border-pw-amber/20')
            }>
              <div className="text-[10px] font-mono uppercase tracking-wider mb-1.5 text-pw-muted">Salary match</div>
              <div className="text-xs text-pw-text3">
                <div>Expects: <strong className="font-mono">£{Math.round(candidate.salary_min/1000)}k–£{Math.round(candidate.salary_max/1000)}k</strong></div>
                <div>Role pays: <strong className="font-mono">£{Math.round(job.salary_min/1000)}k–£{Math.round(job.salary_max/1000)}k</strong></div>
                <div className={'font-semibold mt-1 ' + (candidate.salary_min <= job.salary_max ? 'text-pw-green' : 'text-pw-amber')}>
                  {candidate.salary_min <= job.salary_max ? '✓ Within range' : '⚠ May be below expectations'}
                </div>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-pw-card border border-pw-border rounded-xl p-4">
            <div className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mb-3">Timeline</div>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2 text-xs">
                <span className="text-pw-green">●</span>
                <div>
                  <div className="text-pw-text3 font-semibold">Applied</div>
                  <div className="text-pw-muted font-mono text-[10px]">{new Date(app.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                </div>
              </div>
              {assessment && (
                <div className="flex gap-2 text-xs">
                  <span className="text-pw-green">●</span>
                  <div>
                    <div className="text-pw-text3 font-semibold">Assessment completed — {assessment.score}/100</div>
                    <div className="text-pw-muted font-mono text-[10px]">{assessment.graded_at ? new Date(assessment.graded_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</div>
                  </div>
                </div>
              )}
              {app.status !== 'submitted' && (
                <div className="flex gap-2 text-xs">
                  <span className={'text-' + (app.status === 'rejected' ? 'red-500' : 'pw-green')}>●</span>
                  <div>
                    <div className="text-pw-text3 font-semibold">{STATUS_CONFIG[app.status]?.label}</div>
                    <div className="text-pw-muted font-mono text-[10px]">{new Date(app.updated_at || app.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
