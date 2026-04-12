'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import TrustRing from '@/components/TrustRing'

export default function CandidateDashboard() {
  var router = useRouter()
  var { user, profile, loading: authLoading } = useAuth()
  var [applications, setApplications] = useState([])
  var [candidateProfile, setCandidateProfile] = useState(null)
  var [loading, setLoading] = useState(true)

  useEffect(function() {
    if (authLoading) return
    if (!user) { router.push('/login'); return }
    loadData()
  }, [user, authLoading])

  async function loadData() {
    if (!user) return
    // Load applications
    var { data: apps } = await supabase
      .from('applications')
      .select('*, jobs(title, slug, salary_min, salary_max, trust_score, companies(name, logo_emoji))')
      .eq('email', user.email)
      .order('created_at', { ascending: false })
    setApplications(apps || [])

    // Load candidate profile
    var { data: cp } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()
    setCandidateProfile(cp)
    setLoading(false)
  }

  if (authLoading || loading) return (
    <div className="max-w-2xl mx-auto px-6 py-20 text-center text-pw-muted text-sm">Loading...</div>
  )

  var STATUS_CONFIG = {
    submitted: { label: 'Submitted', color: 'bg-blue-50 text-blue-700 border-blue-200', desc: 'Your application has been received' },
    reviewing: { label: 'Under review', color: 'bg-amber-50 text-amber-700 border-amber-200', desc: 'The employer is reviewing your application' },
    interview: { label: 'Interview', color: 'bg-green-50 text-green-700 border-green-200', desc: "You've been invited to interview!" },
    rejected: { label: 'Not progressed', color: 'bg-red-50 text-red-700 border-red-200', desc: 'The employer has decided not to progress' },
    offer: { label: 'Offer!', color: 'bg-green-50 text-green-700 border-green-200', desc: 'Congratulations — you have an offer!' },
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-6">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-black tracking-tight">
          Hey {profile?.full_name || 'there'}
        </h1>
        <p className="text-xs text-pw-muted font-mono mt-1">
          {applications.length} application{applications.length !== 1 ? 's' : ''} · Track your progress below
        </p>
      </div>

      {/* CV profile card */}
      {!candidateProfile ? (
        <div className="bg-pw-greenDark border border-pw-green/20 rounded-xl p-5 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-display text-lg font-bold text-pw-green mb-1">Upload your CV</h2>
              <p className="text-sm text-pw-text2">Let AI match you to the best jobs based on your skills and experience.</p>
            </div>
            <Link href="/candidate" className="px-5 py-2.5 rounded-lg bg-pw-green text-white font-bold text-sm hover:translate-y-[-1px] hover:shadow-lg hover:shadow-pw-green/20 transition-all whitespace-nowrap">
              Upload CV →
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-pw-card border border-pw-border rounded-xl p-4 mb-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-display font-bold text-sm">{candidateProfile.full_name}</span>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-pw-greenDark text-pw-greenText border border-pw-green/20 font-bold">{candidateProfile.seniority}</span>
              </div>
              <div className="text-xs text-pw-muted">{candidateProfile.location} · {candidateProfile.years_experience}+ years · {candidateProfile.skills?.length || 0} skills</div>
            </div>
            <div className="flex gap-2">
              <Link href="/candidate/matches" className="px-3 py-1.5 rounded-md bg-pw-green text-white text-xs font-bold hover:translate-y-[-1px] transition-all">
                View matches
              </Link>
              <Link href="/candidate" className="px-3 py-1.5 rounded-md border border-pw-border text-pw-text2 text-xs font-semibold hover:text-pw-text1 transition-colors">
                Edit
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Applications */}
      {applications.length === 0 ? (
        <div className="bg-pw-card border border-pw-border rounded-xl p-8 text-center">
          <h2 className="font-display text-lg font-bold mb-2">No applications yet</h2>
          <p className="text-sm text-pw-text2 mb-4">Browse jobs and submit your first application to see it tracked here.</p>
          <Link href={candidateProfile ? "/candidate/matches" : "/jobs"} className="inline-block px-6 py-2.5 rounded-lg bg-pw-green text-white font-bold text-sm hover:translate-y-[-1px] hover:shadow-lg hover:shadow-pw-green/20 transition-all">
            {candidateProfile ? 'See your matches →' : 'Browse jobs →'}
          </Link>
        </div>
      ) : (
        <div>
          <div className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mb-2">Your applications</div>
          <div className="flex flex-col gap-3">
            {applications.map(function(app) {
              var job = app.jobs
              var company = job?.companies
              var status = STATUS_CONFIG[app.status] || STATUS_CONFIG.submitted
              var hasSalary = job?.salary_min > 0

              return (
                <div key={app.id} className="bg-pw-card border border-pw-border rounded-xl p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3 flex-1 min-w-0">
                      {company?.logo_emoji && <span className="text-xl mt-0.5">{company.logo_emoji}</span>}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={'/jobs/' + (job?.slug || '')} className="font-display font-bold text-sm hover:text-pw-green transition-colors truncate">
                            {job?.title || 'Unknown role'}
                          </Link>
                          <span className={'text-[9px] font-mono px-2 py-0.5 rounded border font-semibold ' + status.color}>
                            {status.label}
                          </span>
                        </div>
                        <div className="text-xs text-pw-text2 mt-0.5">
                          {company?.name}
                          {hasSalary && (' · £' + Math.round(job.salary_min/1000) + 'k–' + Math.round(job.salary_max/1000) + 'k')}
                        </div>
                        <div className="text-xs text-pw-muted mt-1">{status.desc}</div>
                        <div className="text-[10px] text-pw-muted font-mono mt-2">
                          Applied {new Date(app.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                    </div>
                    {job?.trust_score && <TrustRing score={job.trust_score} size={36} />}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
