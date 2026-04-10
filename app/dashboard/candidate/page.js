'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import TrustRing from '@/components/TrustRing'

export default function CandidateDashboard() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push('/login'); return }
    loadApplications()
  }, [user, authLoading])

  async function loadApplications() {
    if (!user) return
    const { data } = await supabase
      .from('applications')
      .select('*, jobs(title, slug, salary_min, salary_max, trust_score, companies(name, logo_emoji))')
      .eq('email', user.email)
      .order('created_at', { ascending: false })
    setApplications(data || [])
    setLoading(false)
  }

  if (authLoading || loading) return (
    <div className="max-w-2xl mx-auto px-6 py-20 text-center text-pw-muted text-sm">Loading...</div>
  )

  const STATUS_CONFIG = {
    submitted: { label: 'Submitted', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', desc: 'Your application has been received' },
    reviewing: { label: 'Under review', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', desc: 'The employer is reviewing your application' },
    interview: { label: 'Interview', color: 'bg-pw-greenDark text-pw-green border-pw-green/20', desc: 'You\'ve been invited to interview!' },
    rejected: { label: 'Not progressed', color: 'bg-red-500/10 text-red-400 border-red-500/20', desc: 'The employer has decided not to progress' },
    offer: { label: 'Offer!', color: 'bg-pw-greenDark text-pw-green border-pw-green/20', desc: 'Congratulations — you have an offer!' },
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-6">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-black tracking-tight">
          Hey {profile?.full_name || 'there'} 👋
        </h1>
        <p className="text-xs text-pw-muted font-mono mt-1">
          {applications.length} application{applications.length !== 1 ? 's' : ''} · Track your progress below
        </p>
      </div>

      {applications.length === 0 ? (
        <div className="bg-pw-card border border-pw-border rounded-xl p-8 text-center">
          <h2 className="font-display text-lg font-bold mb-2">No applications yet</h2>
          <p className="text-sm text-pw-text2 mb-4">Browse jobs and submit your first application to see it tracked here.</p>
          <Link href="/jobs" className="inline-block px-6 py-2.5 rounded-lg bg-pw-green text-black font-bold text-sm hover:translate-y-[-1px] hover:shadow-lg hover:shadow-pw-green/20 transition-all">
            Browse jobs →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {applications.map(app => {
            const job = app.jobs
            const company = job?.companies
            const status = STATUS_CONFIG[app.status] || STATUS_CONFIG.submitted
            const hasSalary = job?.salary_min > 0

            return (
              <div key={app.id} className="bg-pw-card border border-pw-border rounded-xl p-4">
                <div className="flex justify-between items-start">
                  <div className="flex gap-3 flex-1 min-w-0">
                    {company?.logo_emoji && <span className="text-xl mt-0.5">{company.logo_emoji}</span>}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/jobs/${job?.slug}`} className="font-display font-bold text-sm hover:text-pw-green transition-colors truncate">
                          {job?.title || 'Unknown role'}
                        </Link>
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded border font-semibold ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      <div className="text-xs text-pw-text2 mt-0.5">
                        {company?.name}
                        {hasSalary && ` · £${Math.round(job.salary_min/1000)}k–${Math.round(job.salary_max/1000)}k`}
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
      )}
    </div>
  )
}
