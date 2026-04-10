'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import TrustRing from '@/components/TrustRing'

export default function EmployerDashboard() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const [jobs, setJobs] = useState([])
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedJob, setSelectedJob] = useState(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push('/login'); return }
    if (profile?.role !== 'employer') { router.push('/dashboard/candidate'); return }
    loadData()
  }, [user, profile, authLoading])

  async function loadData() {
    if (!profile?.company_id) { setLoading(false); return }

    const { data: jobData } = await supabase
      .from('jobs')
      .select('*')
      .eq('company_id', profile.company_id)
      .eq('active', true)
      .order('created_at', { ascending: false })

    setJobs(jobData || [])

    const jobIds = (jobData || []).map(j => j.id)
    if (jobIds.length > 0) {
      const { data: appData } = await supabase
        .from('applications')
        .select('*')
        .in('job_id', jobIds)
        .order('created_at', { ascending: false })
      setApplications(appData || [])
    }
    setLoading(false)
  }

  async function updateStatus(appId, newStatus) {
    await supabase.from('applications').update({ status: newStatus }).eq('id', appId)
    setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a))
  }

  if (authLoading || loading) return (
    <div className="max-w-3xl mx-auto px-6 py-20 text-center text-pw-muted text-sm">Loading...</div>
  )

  const STATUS_COLORS = {
    submitted: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    reviewing: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    interview: 'bg-pw-greenDark text-pw-green border-pw-green/20',
    rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
    offer: 'bg-pw-greenDark text-pw-green border-pw-green/20',
  }

  const filteredApps = selectedJob
    ? applications.filter(a => a.job_id === selectedJob)
    : applications

  return (
    <div className="max-w-4xl mx-auto px-6 py-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="font-display text-2xl font-black tracking-tight">
            {profile?.companies?.logo_emoji} {profile?.companies?.name || 'Employer'} Dashboard
          </h1>
          <p className="text-xs text-pw-muted font-mono mt-1">
            {jobs.length} active jobs · {applications.length} total applications
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/employer/company" className="px-4 py-2 rounded-lg border border-pw-border text-pw-text2 text-xs font-semibold hover:text-pw-text1 hover:bg-pw-card transition-all">
            Company profile
          </Link>
          <Link href="/dashboard/employer/post" className="px-4 py-2 rounded-lg bg-pw-green text-black text-xs font-bold hover:translate-y-[-1px] hover:shadow-lg hover:shadow-pw-green/20 transition-all">
            + Post a job
          </Link>
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className="bg-pw-card border border-pw-border rounded-xl p-8 text-center">
          <h2 className="font-display text-lg font-bold mb-2">No jobs yet</h2>
          <p className="text-sm text-pw-text2 mb-4">Your company doesn't have any active listings. Jobs are added when you claim scraped listings or when we index your career page.</p>
          <Link href="/jobs" className="text-pw-green text-sm font-semibold hover:underline">Browse existing listings →</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
          {/* Job list sidebar */}
          <div>
            <div className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mb-2">Your listings</div>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => setSelectedJob(null)}
                className={`text-left px-3 py-2.5 rounded-lg text-sm transition-all ${
                  !selectedJob ? 'bg-pw-greenDark border border-pw-green/20 text-pw-green' : 'bg-pw-card border border-pw-border text-pw-text2 hover:text-pw-text1'
                }`}
              >
                All applications ({applications.length})
              </button>
              {jobs.map(job => {
                const count = applications.filter(a => a.job_id === job.id).length
                return (
                  <button
                    key={job.id}
                    onClick={() => setSelectedJob(job.id)}
                    className={`text-left px-3 py-2.5 rounded-lg text-sm transition-all ${
                      selectedJob === job.id ? 'bg-pw-greenDark border border-pw-green/20 text-pw-green' : 'bg-pw-card border border-pw-border text-pw-text2 hover:text-pw-text1'
                    }`}
                  >
                    <div className="font-semibold truncate">{job.title}</div>
                    <div className="text-[10px] text-pw-muted font-mono mt-0.5">{count} applications</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Applications */}
          <div>
            <div className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mb-2">
              {selectedJob ? jobs.find(j => j.id === selectedJob)?.title : 'All'} — {filteredApps.length} applications
            </div>

            {filteredApps.length === 0 ? (
              <div className="bg-pw-card border border-pw-border rounded-xl p-8 text-center">
                <p className="text-sm text-pw-text2">No applications yet for this listing.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredApps.map(app => {
                  const job = jobs.find(j => j.id === app.job_id)
                  return (
                    <div key={app.id} className="bg-pw-card border border-pw-border rounded-xl p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-sm">{app.full_name}</span>
                            <span className={`text-[9px] font-mono px-2 py-0.5 rounded border font-semibold capitalize ${STATUS_COLORS[app.status] || STATUS_COLORS.submitted}`}>
                              {app.status}
                            </span>
                          </div>
                          <div className="text-xs text-pw-text2 mb-1">{app.email}</div>
                          {!selectedJob && <div className="text-xs text-pw-muted">Applied for: {job?.title}</div>}
                          <div className="flex gap-3 mt-2 text-[10px] text-pw-muted font-mono">
                            {app.linkedin && <span>LinkedIn ✓</span>}
                            {app.cv_url && <span>CV ✓</span>}
                            {app.notice_period && <span>{app.notice_period}</span>}
                            {app.right_to_work && <span>{app.right_to_work}</span>}
                          </div>
                          {app.cover_note && (
                            <div className="mt-2 p-2.5 bg-pw-bg rounded-md border border-pw-border text-xs text-pw-text3 leading-relaxed">
                              {app.cover_note}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1 ml-3">
                          {app.status === 'submitted' && (
                            <>
                              <button onClick={() => updateStatus(app.id, 'reviewing')} className="px-2 py-1 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors">Review</button>
                              <button onClick={() => updateStatus(app.id, 'interview')} className="px-2 py-1 rounded text-[10px] font-semibold bg-pw-greenDark text-pw-green border border-pw-green/20 hover:bg-pw-green/20 transition-colors">Interview</button>
                            </>
                          )}
                          {app.status === 'reviewing' && (
                            <>
                              <button onClick={() => updateStatus(app.id, 'interview')} className="px-2 py-1 rounded text-[10px] font-semibold bg-pw-greenDark text-pw-green border border-pw-green/20 hover:bg-pw-green/20 transition-colors">Interview</button>
                              <button onClick={() => updateStatus(app.id, 'rejected')} className="px-2 py-1 rounded text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors">Reject</button>
                            </>
                          )}
                          {app.status === 'interview' && (
                            <button onClick={() => updateStatus(app.id, 'offer')} className="px-2 py-1 rounded text-[10px] font-semibold bg-pw-greenDark text-pw-green border border-pw-green/20 hover:bg-pw-green/20 transition-colors">Send offer</button>
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
      )}
    </div>
  )
}
