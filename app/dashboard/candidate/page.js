'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export default function CandidateDashboard() {
  var router = useRouter()
  var { user, profile, loading: authLoading } = useAuth()
  var [candidateProfile, setCandidateProfile] = useState(null)
  var [assessments, setAssessments] = useState([])
  var [applications, setApplications] = useState([])
  var [loading, setLoading] = useState(true)

  useEffect(function() {
    if (authLoading) return
    if (!user) { router.push('/login'); return }
    loadData()
  }, [user, authLoading])

  async function loadData() {
    // Load candidate profile
    var { data: cp } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()
    setCandidateProfile(cp)

    // Load assessment attempts
    var { data: attempts } = await supabase
      .from('assessment_attempts')
      .select('*, jobs(title, slug, companies(name))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setAssessments(attempts || [])

    // Load applications
    var { data: apps } = await supabase
      .from('applications')
      .select('*, jobs(title, slug, companies(name))')
      .eq('email', user.email)
      .order('created_at', { ascending: false })
    setApplications(apps || [])

    setLoading(false)
  }

  function getScoreColor(score) {
    if (score >= 75) return 'text-pw-green'
    if (score >= 50) return 'text-pw-amber'
    return 'text-red-500'
  }

  var STATUS_LABELS = {
    submitted: { label: 'Submitted', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    reviewing: { label: 'Under review', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    interview: { label: 'Interview', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    offer: { label: 'Offer!', color: 'bg-green-50 text-green-700 border-green-200' },
    rejected: { label: 'Not progressed', color: 'bg-red-50 text-red-600 border-red-200' },
  }

  if (authLoading || loading) {
    return <div className="max-w-4xl mx-auto px-6 py-20 text-center text-pw-muted text-sm">Loading...</div>
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-6">
      <div className="flex justify-between items-start mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-black tracking-tight">
            {candidateProfile ? ('Hey, ' + (candidateProfile.name || profile?.full_name || 'there')) : 'Candidate Dashboard'}
          </h1>
          <p className="text-xs text-pw-muted font-mono mt-1">
            {assessments.length} assessment{assessments.length !== 1 ? 's' : ''} · {applications.length} application{applications.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/candidate" className="px-4 py-2 rounded-lg border border-pw-border text-pw-text2 text-xs font-semibold hover:text-pw-text1 transition-all">
            {candidateProfile ? 'Update CV' : 'Upload CV'}
          </Link>
          <Link href="/candidate/matches" className="px-4 py-2 rounded-lg bg-pw-green text-white text-xs font-bold hover:translate-y-[-1px] transition-all">
            View matches →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-4">
        {/* Main */}
        <div>
          {/* Quick actions */}
          {!candidateProfile && (
            <div className="bg-pw-greenDark border border-pw-green/20 rounded-xl p-5 mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📤</span>
                <div>
                  <h3 className="font-display text-base font-bold text-pw-green">Upload your CV to get started</h3>
                  <p className="text-xs text-pw-text2 mt-0.5">AI will extract your skills, experience, and preferences. Then we'll match you to jobs automatically.</p>
                </div>
              </div>
              <Link href="/candidate" className="block mt-3 py-2.5 rounded-lg bg-pw-green text-white font-bold text-sm text-center hover:translate-y-[-1px] transition-all">
                Upload CV →
              </Link>
            </div>
          )}

          {/* Applications */}
          <div className="mb-6">
            <h2 className="font-display text-lg font-bold mb-3 text-pw-text1">
              {applications.length > 0 ? 'Your applications' : 'No applications yet'}
            </h2>

            {applications.length === 0 ? (
              <div className="bg-pw-card border border-pw-border rounded-xl p-6 text-center">
                <p className="text-sm text-pw-text2 mb-3">You haven't applied to any jobs through ShowJob yet.</p>
                <Link href="/jobs" className="text-pw-green text-sm font-semibold hover:underline">Browse jobs →</Link>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {applications.map(function(app) {
                  var statusConfig = STATUS_LABELS[app.status] || STATUS_LABELS.submitted
                  return (
                    <Link key={app.id} href={'/jobs/' + (app.jobs?.slug || '')}>
                      <div className="bg-white border border-pw-border rounded-xl p-4 hover:border-pw-green/40 transition-all cursor-pointer">
                        <div className="flex justify-between items-start gap-3">
                          <div>
                            <div className="text-sm font-bold text-pw-text1">{app.jobs?.title || 'Unknown'}</div>
                            <div className="text-xs text-pw-muted mt-0.5">{app.jobs?.companies?.name || ''}</div>
                            <div className="text-[10px] text-pw-muted font-mono mt-1">
                              Applied {new Date(app.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                            </div>
                          </div>
                          <span className={'text-[9px] font-mono px-2 py-0.5 rounded border font-semibold shrink-0 ' + statusConfig.color}>
                            {statusConfig.label}
                          </span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Assessments */}
          <div>
            <h2 className="font-display text-lg font-bold mb-3 text-pw-text1">
              {assessments.length > 0 ? 'Your assessments' : 'No assessments yet'}
            </h2>

            {assessments.length === 0 ? (
              <div className="bg-pw-card border border-pw-border rounded-xl p-6 text-center">
                <p className="text-sm text-pw-text2 mb-3">Complete skill assessments on job listings to prove your abilities and stand out to employers.</p>
                <Link href="/jobs" className="text-pw-green text-sm font-semibold hover:underline">Find a job with an assessment →</Link>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {assessments.map(function(attempt) {
                  return (
                    <div key={attempt.id} className="bg-white border border-pw-border rounded-xl p-4">
                      <div className="flex justify-between items-start gap-3">
                        <div>
                          <div className="text-sm font-bold text-pw-text1">{attempt.jobs?.title || 'Unknown role'}</div>
                          <div className="text-xs text-pw-muted mt-0.5">
                            {attempt.jobs?.companies?.name || ''}
                            {' · '}
                            {attempt.challenge_data?.type || 'assessment'}
                          </div>
                          <div className="text-[10px] text-pw-muted font-mono mt-1">
                            {attempt.status === 'graded' ? 'Completed' : attempt.status === 'in_progress' ? 'In progress' : attempt.status}
                            {attempt.graded_at && (' · ' + new Date(attempt.graded_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }))}
                          </div>
                          {attempt.feedback && attempt.status === 'graded' && (
                            <p className="text-xs text-pw-text2 mt-2 leading-relaxed line-clamp-2">{attempt.feedback}</p>
                          )}
                        </div>
                        <div className="shrink-0 text-center">
                          {attempt.status === 'graded' ? (
                            <div>
                              <div className={'font-mono text-2xl font-black ' + getScoreColor(attempt.score)}>{attempt.score}</div>
                              <div className="text-[9px] text-pw-muted font-mono">/100</div>
                            </div>
                          ) : attempt.status === 'in_progress' ? (
                            <Link href={'/assessment/' + attempt.job_id}
                              className="px-3 py-1.5 rounded-lg bg-pw-amber text-white text-xs font-bold">
                              Continue →
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Profile summary */}
        <div>
          {candidateProfile && (
            <div className="bg-pw-card border border-pw-border rounded-xl p-4 mb-3">
              <div className="text-[10px] font-mono text-pw-green uppercase tracking-wider mb-2">Your profile</div>
              <div className="text-sm font-bold text-pw-text1 mb-0.5">{candidateProfile.name || profile?.full_name || 'Name'}</div>
              <div className="text-xs text-pw-muted mb-2">
                {candidateProfile.seniority} · {candidateProfile.years_experience}+ years
                {candidateProfile.location && (' · ' + candidateProfile.location)}
              </div>

              {candidateProfile.skills && candidateProfile.skills.length > 0 && (
                <div className="mb-2">
                  <div className="text-[9px] font-mono text-pw-muted uppercase mb-1">Top skills</div>
                  <div className="flex gap-1 flex-wrap">
                    {candidateProfile.skills.slice(0, 8).map(function(s) {
                      return <span key={s} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-pw-bg text-pw-text3 border border-pw-border">{s}</span>
                    })}
                  </div>
                </div>
              )}

              {candidateProfile.salary_min > 0 && (
                <div className="text-xs text-pw-muted">
                  Target: <span className="font-mono font-bold text-pw-green">£{Math.round(candidateProfile.salary_min/1000)}k–£{Math.round(candidateProfile.salary_max/1000)}k</span>
                </div>
              )}

              <Link href="/candidate" className="block mt-3 py-2 rounded-lg border border-pw-border text-pw-text2 font-semibold text-xs text-center hover:border-pw-green/30 hover:text-pw-green transition-all">
                Edit profile →
              </Link>
            </div>
          )}

          {/* Stats */}
          <div className="bg-pw-card border border-pw-border rounded-xl p-4 mb-3">
            <div className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mb-3">Your stats</div>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-pw-text2">Applications</span>
                <span className="font-mono text-sm font-bold text-pw-text1">{applications.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-pw-text2">Assessments</span>
                <span className="font-mono text-sm font-bold text-pw-text1">{assessments.filter(function(a) { return a.status === 'graded' }).length}</span>
              </div>
              {assessments.filter(function(a) { return a.status === 'graded' }).length > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-pw-text2">Avg score</span>
                  <span className={'font-mono text-sm font-bold ' + getScoreColor(
                    Math.round(assessments.filter(function(a) { return a.status === 'graded' }).reduce(function(acc, a) { return acc + a.score }, 0) / assessments.filter(function(a) { return a.status === 'graded' }).length)
                  )}>
                    {Math.round(assessments.filter(function(a) { return a.status === 'graded' }).reduce(function(acc, a) { return acc + a.score }, 0) / assessments.filter(function(a) { return a.status === 'graded' }).length)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-xs text-pw-text2">CV uploaded</span>
                <span className={'font-mono text-sm font-bold ' + (candidateProfile ? 'text-pw-green' : 'text-pw-muted')}>{candidateProfile ? '✓' : '✗'}</span>
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div className="bg-pw-card border border-pw-border rounded-xl p-4">
            <div className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mb-2">Quick links</div>
            <div className="flex flex-col gap-1.5">
              <Link href="/candidate/matches" className="text-xs text-pw-text2 hover:text-pw-green transition-colors py-1">View job matches →</Link>
              <Link href="/jobs" className="text-xs text-pw-text2 hover:text-pw-green transition-colors py-1">Browse all jobs →</Link>
              <Link href="/salaries" className="text-xs text-pw-text2 hover:text-pw-green transition-colors py-1">Salary data →</Link>
              <Link href="/leaderboard" className="text-xs text-pw-text2 hover:text-pw-green transition-colors py-1">Employer rankings →</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
