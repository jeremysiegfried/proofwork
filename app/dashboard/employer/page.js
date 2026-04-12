'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import TrustRing from '@/components/TrustRing'

var STATUSES = ['submitted', 'reviewing', 'interview', 'offer', 'rejected']
var STATUS_CONFIG = {
  submitted: { label: 'New', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: '📩' },
  reviewing: { label: 'Reviewing', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: '👀' },
  interview: { label: 'Interview', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: '🎯' },
  offer: { label: 'Offer', color: 'bg-green-50 text-green-700 border-green-200', icon: '🎉' },
  rejected: { label: 'Rejected', color: 'bg-red-50 text-red-600 border-red-200', icon: '✗' },
}

export default function EmployerDashboard() {
  var router = useRouter()
  var { user, profile, loading: authLoading } = useAuth()
  var [company, setCompany] = useState(null)
  var [jobs, setJobs] = useState([])
  var [applications, setApplications] = useState([])
  var [candidates, setCandidates] = useState({})
  var [assessments, setAssessments] = useState({})
  var [loading, setLoading] = useState(true)
  var [selectedJob, setSelectedJob] = useState(null)
  var [selectedStatus, setSelectedStatus] = useState(null)
  var [view, setView] = useState('pipeline') // pipeline or list

  useEffect(function() {
    if (authLoading) return
    if (!user) { router.push('/login'); return }
    if (profile?.role !== 'employer') { router.push('/dashboard/candidate'); return }
    loadData()
  }, [user, profile, authLoading])

  async function loadData() {
    if (!profile?.company_id) { setLoading(false); return }

    // Load company
    var { data: companyData } = await supabase
      .from('companies')
      .select('*')
      .eq('id', profile.company_id)
      .single()
    setCompany(companyData)

    // Load jobs
    var { data: jobData } = await supabase
      .from('jobs')
      .select('*')
      .eq('company_id', profile.company_id)
      .eq('active', true)
      .order('created_at', { ascending: false })
    setJobs(jobData || [])

    // Load applications with candidate data
    var jobIds = (jobData || []).map(function(j) { return j.id })
    if (jobIds.length > 0) {
      var { data: appData } = await supabase
        .from('applications')
        .select('*')
        .in('job_id', jobIds)
        .order('created_at', { ascending: false })
      setApplications(appData || [])

      // Load candidate profiles for applicants
      var emails = [...new Set((appData || []).map(function(a) { return a.email }))]
      if (emails.length > 0) {
        var { data: candidateData } = await supabase
          .from('candidate_profiles')
          .select('*')
          .in('email', emails)
        var candidateMap = {}
        if (candidateData) {
          candidateData.forEach(function(c) { candidateMap[c.email] = c })
        }
        setCandidates(candidateMap)
      }

      // Load assessment attempts for these jobs
      var { data: attemptData } = await supabase
        .from('assessment_attempts')
        .select('*')
        .in('job_id', jobIds)
        .eq('status', 'graded')
      var attemptMap = {}
      if (attemptData) {
        attemptData.forEach(function(a) { attemptMap[a.job_id + '_' + a.user_id] = a })
      }
      setAssessments(attemptMap)
    }
    setLoading(false)
  }

  async function updateStatus(appId, newStatus) {
    await supabase.from('applications').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', appId)
    setApplications(function(prev) { return prev.map(function(a) { return a.id === appId ? { ...a, status: newStatus } : a }) })
  }

  async function toggleAssessment(jobId, current) {
    await supabase.from('jobs').update({ has_challenge: !current }).eq('id', jobId)
    setJobs(function(prev) { return prev.map(function(j) { return j.id === jobId ? { ...j, has_challenge: !current } : j }) })
  }

  if (authLoading || loading) {
    return <div className="max-w-5xl mx-auto px-6 py-20 text-center text-pw-muted text-sm">Loading...</div>
  }

  // Filter applications
  var filteredApps = applications
  if (selectedJob) filteredApps = filteredApps.filter(function(a) { return a.job_id === selectedJob })
  if (selectedStatus) filteredApps = filteredApps.filter(function(a) { return a.status === selectedStatus })

  // Pipeline counts
  var pipelineCounts = {}
  STATUSES.forEach(function(s) {
    pipelineCounts[s] = applications.filter(function(a) {
      return a.status === s && (!selectedJob || a.job_id === selectedJob)
    }).length
  })

  function getCandidate(email) { return candidates[email] || null }

  function getAssessment(app) {
    // Try to find by looking up user_id from candidate profile
    var candidate = getCandidate(app.email)
    if (candidate) {
      return assessments[app.job_id + '_' + candidate.user_id] || null
    }
    return null
  }

  function getMatchScore(app) {
    var candidate = getCandidate(app.email)
    if (!candidate || !candidate.skills) return null
    var job = jobs.find(function(j) { return j.id === app.job_id })
    if (!job) return null
    var jobText = ((job.title || '') + ' ' + (job.description || '') + ' ' + (job.tags || []).join(' ')).toLowerCase()
    var matched = 0
    var total = Math.min(candidate.skills.length, 10)
    for (var i = 0; i < total; i++) {
      if (jobText.includes(candidate.skills[i].toLowerCase())) matched++
    }
    return total > 0 ? Math.round((matched / total) * 100) : null
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-black tracking-tight">
            {company?.logo_emoji} {company?.name || 'Employer'} Dashboard
          </h1>
          <p className="text-xs text-pw-muted font-mono mt-1">
            {jobs.length} active jobs · {applications.length} total applicants
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/dashboard/employer/company" className="px-4 py-2 rounded-lg border border-pw-border text-pw-text2 text-xs font-semibold hover:text-pw-text1 hover:bg-pw-card transition-all">
            Company profile
          </Link>
          <Link href="/dashboard/employer/post" className="px-4 py-2 rounded-lg bg-pw-green text-white text-xs font-bold hover:translate-y-[-1px] hover:shadow-lg hover:shadow-pw-green/20 transition-all">
            + Post a job
          </Link>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-6">
        {STATUSES.map(function(status) {
          var config = STATUS_CONFIG[status]
          var count = pipelineCounts[status]
          return (
            <button key={status} onClick={function() { setSelectedStatus(selectedStatus === status ? null : status) }}
              className={'rounded-xl p-3 text-center border transition-all ' + (selectedStatus === status ? 'border-pw-green bg-pw-greenDark' : 'border-pw-border bg-white hover:border-pw-green/30')}>
              <div className="text-lg mb-0.5">{config.icon}</div>
              <div className="font-mono text-xl font-black text-pw-text1">{count}</div>
              <div className="text-[9px] font-mono text-pw-muted uppercase">{config.label}</div>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
        {/* Sidebar - Jobs */}
        <div>
          <div className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mb-2">Filter by job</div>
          <div className="flex flex-col gap-1.5">
            <button onClick={function() { setSelectedJob(null) }}
              className={'text-left px-3 py-2.5 rounded-lg text-sm transition-all ' +
                (!selectedJob ? 'bg-pw-greenDark border border-pw-green/20 text-pw-green' : 'bg-pw-card border border-pw-border text-pw-text2 hover:text-pw-text1')
              }>
              All jobs ({applications.length})
            </button>
            {jobs.map(function(job) {
              var count = applications.filter(function(a) { return a.job_id === job.id }).length
              return (
                <div key={job.id} className={'px-3 py-2.5 rounded-lg text-sm transition-all ' +
                  (selectedJob === job.id ? 'bg-pw-greenDark border border-pw-green/20' : 'bg-pw-card border border-pw-border')
                }>
                  <button onClick={function() { setSelectedJob(selectedJob === job.id ? null : job.id) }} className="text-left w-full">
                    <div className={'font-semibold truncate text-xs ' + (selectedJob === job.id ? 'text-pw-green' : 'text-pw-text2 hover:text-pw-text1')}>{job.title}</div>
                    <div className="text-[10px] text-pw-muted font-mono mt-0.5">
                      {count} apps · trust {job.trust_score}
                      {job.has_challenge && ' · ⚡'}
                    </div>
                  </button>
                  <div className="flex gap-2 mt-1.5">
                    <button onClick={function() { toggleAssessment(job.id, job.has_challenge) }}
                      className={'text-[9px] font-mono px-2 py-0.5 rounded border transition-all ' +
                        (job.has_challenge ? 'bg-pw-greenDark text-pw-green border-pw-green/20' : 'bg-pw-bg text-pw-muted border-pw-border hover:text-pw-green')
                      }>
                      {job.has_challenge ? '⚡ Assessment ON' : '⚡ Assessment OFF'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Main - Applications */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <div className="text-[10px] font-mono text-pw-muted uppercase tracking-wider">
              {filteredApps.length} applicant{filteredApps.length !== 1 ? 's' : ''}
              {selectedJob ? ' for ' + (jobs.find(function(j) { return j.id === selectedJob })?.title || '') : ''}
              {selectedStatus ? ' · ' + STATUS_CONFIG[selectedStatus].label : ''}
            </div>
            {(selectedJob || selectedStatus) && (
              <button onClick={function() { setSelectedJob(null); setSelectedStatus(null) }}
                className="text-xs text-red-500 hover:underline">Clear filters</button>
            )}
          </div>

          {filteredApps.length === 0 ? (
            <div className="bg-pw-card border border-pw-border rounded-xl p-8 text-center">
              <p className="text-sm text-pw-text2 mb-2">No applicants {selectedStatus ? 'in this stage' : 'yet'}.</p>
              {!selectedJob && <p className="text-xs text-pw-muted">Applicants will appear here when candidates apply through ShowJob.</p>}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredApps.map(function(app) {
                var job = jobs.find(function(j) { return j.id === app.job_id })
                var candidate = getCandidate(app.email)
                var assessment = getAssessment(app)
                var matchScore = getMatchScore(app)
                var config = STATUS_CONFIG[app.status] || STATUS_CONFIG.submitted

                return (
                  <div key={app.id} className="bg-white border border-pw-border rounded-xl p-4 hover:border-pw-green/20 transition-all">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Name + status */}
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Link href={'/dashboard/employer/applicant/' + app.id}
                            className="font-display font-bold text-sm hover:text-pw-green transition-colors">
                            {app.full_name}
                          </Link>
                          <span className={'text-[9px] font-mono px-2 py-0.5 rounded border font-semibold ' + config.color}>
                            {config.label}
                          </span>
                          {assessment && (
                            <span className={'text-[9px] font-mono px-2 py-0.5 rounded border font-bold ' +
                              (assessment.score >= 75 ? 'bg-pw-greenDark text-pw-green border-pw-green/20' :
                               assessment.score >= 50 ? 'bg-pw-amberDark text-pw-amber border-pw-amber/20' :
                               'bg-red-50 text-red-500 border-red-200')
                            }>
                              ⚡ {assessment.score}/100
                            </span>
                          )}
                          {matchScore !== null && (
                            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-pw-bg text-pw-muted border border-pw-border">
                              {matchScore}% fit
                            </span>
                          )}
                        </div>

                        {/* Email + job */}
                        <div className="text-xs text-pw-text2 mb-1">
                          {app.email}
                          {!selectedJob && job && <span className="text-pw-muted"> · {job.title}</span>}
                        </div>

                        {/* Candidate skills preview */}
                        {candidate && candidate.skills && candidate.skills.length > 0 && (
                          <div className="flex gap-1 flex-wrap mt-1.5 mb-1.5">
                            {candidate.skills.slice(0, 6).map(function(s) {
                              return <span key={s} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-pw-bg text-pw-muted border border-pw-border">{s}</span>
                            })}
                            {candidate.skills.length > 6 && (
                              <span className="text-[9px] font-mono text-pw-muted">+{candidate.skills.length - 6}</span>
                            )}
                          </div>
                        )}

                        {/* Meta */}
                        <div className="flex gap-3 text-[10px] text-pw-muted font-mono flex-wrap">
                          {candidate && <span>{candidate.seniority} · {candidate.years_experience}yr</span>}
                          {candidate && candidate.location && <span>{candidate.location}</span>}
                          {app.notice_period && <span>{app.notice_period}</span>}
                          {app.right_to_work && <span>{app.right_to_work}</span>}
                          {app.linkedin && <span>LinkedIn ✓</span>}
                          {app.cv_url && <span>CV ✓</span>}
                          <span>Applied {new Date(app.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                        </div>

                        {/* Cover note preview */}
                        {app.cover_note && (
                          <div className="mt-2 p-2.5 bg-pw-bg rounded-md border border-pw-border text-xs text-pw-text3 leading-relaxed line-clamp-2">
                            {app.cover_note.substring(0, 150)}{app.cover_note.length > 150 ? '...' : ''}
                          </div>
                        )}
                      </div>

                      {/* Right side - actions */}
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <Link href={'/dashboard/employer/applicant/' + app.id}
                          className="px-3 py-1.5 rounded-md bg-pw-green text-white text-[10px] font-bold text-center hover:translate-y-[-1px] transition-all">
                          View profile
                        </Link>

                        {app.status === 'submitted' && (
                          <>
                            <button onClick={function() { updateStatus(app.id, 'reviewing') }}
                              className="px-3 py-1 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors">
                              Review
                            </button>
                            <button onClick={function() { updateStatus(app.id, 'interview') }}
                              className="px-3 py-1 rounded-md text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors">
                              Interview
                            </button>
                          </>
                        )}
                        {app.status === 'reviewing' && (
                          <>
                            <button onClick={function() { updateStatus(app.id, 'interview') }}
                              className="px-3 py-1 rounded-md text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors">
                              Interview
                            </button>
                            <button onClick={function() { updateStatus(app.id, 'rejected') }}
                              className="px-3 py-1 rounded-md text-[10px] font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors">
                              Reject
                            </button>
                          </>
                        )}
                        {app.status === 'interview' && (
                          <>
                            <button onClick={function() { updateStatus(app.id, 'offer') }}
                              className="px-3 py-1 rounded-md text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors">
                              Send offer
                            </button>
                            <button onClick={function() { updateStatus(app.id, 'rejected') }}
                              className="px-3 py-1 rounded-md text-[10px] font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors">
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
