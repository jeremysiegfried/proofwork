'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export default function ApplyPage({ params }) {
  var router = useRouter()
  var { user, profile, loading: authLoading } = useAuth()
  var [job, setJob] = useState(null)
  var [candidate, setCandidate] = useState(null)
  var [loading, setLoading] = useState(true)
  var [submitting, setSubmitting] = useState(false)
  var [submitted, setSubmitted] = useState(false)
  var [error, setError] = useState('')

  var [form, setForm] = useState({
    full_name: '',
    email: '',
    cover_note: '',
    linkedin: '',
    notice_period: '',
    right_to_work: 'Yes - UK citizen/settled status',
  })

  useEffect(function() {
    if (authLoading) return
    loadData()
  }, [authLoading])

  async function loadData() {
    var { data: jobData } = await supabase
      .from('jobs')
      .select('*, companies(name, slug, claimed)')
      .eq('slug', params.slug)
      .single()

    if (jobData) {
      setJob(jobData)

      // Check if already applied
      if (user) {
        var { data: existing } = await supabase
          .from('applications')
          .select('id')
          .eq('job_id', jobData.id)
          .eq('email', user.email)
          .single()

        if (existing) {
          setSubmitted(true)
        }

        // Pre-fill from profile
        setForm(function(prev) {
          return {
            ...prev,
            full_name: profile?.full_name || '',
            email: user.email || '',
          }
        })

        // Load candidate profile for auto-fill
        var { data: cp } = await supabase
          .from('candidate_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()
        setCandidate(cp)
      }
    }
    setLoading(false)
  }

  function updateForm(key, value) {
    setForm(function(prev) { var n = { ...prev }; n[key] = value; return n })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.full_name.trim()) { setError('Please enter your name'); return }
    if (!form.email.trim() || !form.email.includes('@')) { setError('Please enter a valid email'); return }

    setSubmitting(true)
    setError('')

    try {
      var { error: insertError } = await supabase.from('applications').insert({
        job_id: job.id,
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        cover_note: form.cover_note.trim(),
        linkedin: form.linkedin.trim(),
        notice_period: form.notice_period,
        right_to_work: form.right_to_work,
        status: 'submitted',
      })

      if (insertError) throw insertError

      // Try to send email notification to employer (fails silently if not configured)
      try {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: '', // Would be employer email from company data
            subject: 'New application: ' + form.full_name + ' applied for ' + job.title,
            html: '<p>' + form.full_name + ' applied for ' + job.title + ' at ' + job.companies?.name + '</p>',
            type: 'new_application',
          })
        })
      } catch (e) { /* silent */ }

      setSubmitted(true)
    } catch (err) {
      setError(err.message || 'Failed to submit application')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || authLoading) {
    return <div className="max-w-xl mx-auto px-6 py-20 text-center text-pw-muted text-sm">Loading...</div>
  }

  if (!job) {
    return (
      <div className="max-w-xl mx-auto px-6 py-20 text-center">
        <h1 className="font-display text-xl font-bold mb-2">Job not found</h1>
        <Link href="/jobs" className="text-pw-green text-sm hover:underline">← Browse jobs</Link>
      </div>
    )
  }

  // Already applied
  if (submitted) {
    return (
      <div className="max-w-xl mx-auto px-6 py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-pw-green flex items-center justify-center mx-auto mb-5 text-2xl text-black">✓</div>
        <h1 className="font-display text-2xl font-black tracking-tight mb-2">Application submitted!</h1>
        <p className="text-sm text-pw-text2 mb-6">
          Your application for <strong>{job.title}</strong> at {job.companies?.name} has been sent. The employer will review it and update your status.
        </p>

        <div className="bg-pw-card border border-pw-border rounded-xl p-5 mb-6 text-left">
          <div className="text-[10px] font-mono text-pw-green uppercase tracking-wider mb-3">What happens next</div>
          <div className="flex flex-col gap-2 text-sm text-pw-text3">
            <div className="flex gap-2"><span className="text-pw-green">1.</span> The employer reviews your application and CV</div>
            <div className="flex gap-2"><span className="text-pw-green">2.</span> You'll see status updates in your dashboard</div>
            <div className="flex gap-2"><span className="text-pw-green">3.</span> Complete the skill assessment to stand out ⚡</div>
          </div>
        </div>

        <div className="flex gap-3">
          <Link href={'/assessment/' + job.id} className="flex-1 py-3 rounded-lg border-2 border-pw-green text-pw-green font-bold text-sm text-center hover:bg-pw-greenDark transition-all">
            Take assessment ⚡
          </Link>
          <Link href={'/jobs/' + job.slug} className="flex-1 py-3 rounded-lg border border-pw-border text-pw-text1 font-bold text-sm text-center hover:bg-pw-card transition-colors">
            Back to job
          </Link>
        </div>

        {user && (
          <div className="mt-4">
            <Link href="/dashboard/candidate" className="text-xs text-pw-muted hover:text-pw-green transition-colors">View all applications →</Link>
          </div>
        )}
      </div>
    )
  }

  // Not logged in
  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-6 py-12">
        <Link href={'/jobs/' + job.slug} className="text-xs text-pw-muted hover:text-pw-text2 transition-colors mb-4 inline-block">← {job.title}</Link>

        <div className="text-center mb-6">
          <h1 className="font-display text-2xl font-black tracking-tight mb-2">Apply for {job.title}</h1>
          <p className="text-sm text-pw-text2">at {job.companies?.name}</p>
        </div>

        <div className="bg-pw-card border border-pw-border rounded-xl p-6 text-center">
          <p className="text-sm text-pw-text2 mb-4">Create an account or log in to apply through ShowJob. Your application will be tracked and the employer can see your CV and assessment scores.</p>
          <div className="flex gap-3">
            <Link href={'/signup?redirect=/jobs/' + params.slug + '/apply'} className="flex-1 py-3 rounded-lg bg-pw-green text-white font-bold text-sm text-center hover:translate-y-[-1px] transition-all">
              Sign up to apply
            </Link>
            <Link href={'/login?redirect=/jobs/' + params.slug + '/apply'} className="flex-1 py-3 rounded-lg border border-pw-border text-pw-text1 font-bold text-sm text-center hover:bg-pw-card transition-colors">
              Log in
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-8">
      <Link href={'/jobs/' + job.slug} className="text-xs text-pw-muted hover:text-pw-text2 transition-colors mb-4 inline-block">← {job.title}</Link>

      <div className="mb-6">
        <h1 className="font-display text-2xl font-black tracking-tight mb-1">Apply for {job.title}</h1>
        <p className="text-sm text-pw-text2">at {job.companies?.name} · {job.location}</p>
        {job.salary_min > 0 && (
          <p className="font-mono text-sm font-bold text-pw-green mt-1">£{Math.round(job.salary_min / 1000)}k–£{Math.round(job.salary_max / 1000)}k</p>
        )}
      </div>

      {/* CV status */}
      {candidate ? (
        <div className="bg-pw-greenDark border border-pw-green/20 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-pw-green text-sm font-bold">✓ CV on file</span>
          </div>
          <p className="text-xs text-pw-text2">
            {candidate.seniority} · {candidate.years_experience}+ years · {candidate.skills?.slice(0, 5).join(', ')}
          </p>
          <Link href="/candidate" className="text-[10px] text-pw-green hover:underline mt-1 inline-block">Update CV →</Link>
        </div>
      ) : (
        <div className="bg-pw-amberDark border border-pw-amber/20 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-pw-amber text-sm font-bold">⚠ No CV uploaded</span>
          </div>
          <p className="text-xs text-pw-text2">
            Upload your CV to help the employer see your skills and experience alongside this application.
          </p>
          <Link href="/candidate" className="text-[10px] text-pw-green hover:underline mt-1 inline-block">Upload CV →</Link>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs">{error}</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="bg-pw-card border border-pw-border rounded-xl p-5">
          <div className="mb-4">
            <label className="text-xs font-semibold text-pw-text3 mb-1 block">Full name <span className="text-red-500">*</span></label>
            <input value={form.full_name} onChange={function(e) { updateForm('full_name', e.target.value) }} required
              className="w-full px-3 py-2.5 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1" />
          </div>

          <div className="mb-4">
            <label className="text-xs font-semibold text-pw-text3 mb-1 block">Email <span className="text-red-500">*</span></label>
            <input type="email" value={form.email} onChange={function(e) { updateForm('email', e.target.value) }} required
              className="w-full px-3 py-2.5 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1" />
          </div>

          <div className="mb-4">
            <label className="text-xs font-semibold text-pw-text3 mb-1 block">Why are you a great fit?</label>
            <textarea value={form.cover_note} onChange={function(e) { updateForm('cover_note', e.target.value) }}
              placeholder="Tell the employer why you're interested and what makes you a strong candidate..."
              rows={5}
              className="w-full px-3 py-2.5 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1 resize-y" />
            <div className="text-[10px] text-pw-muted mt-1">Optional but recommended. A short note goes a long way.</div>
          </div>

          <div className="mb-4">
            <label className="text-xs font-semibold text-pw-text3 mb-1 block">LinkedIn profile</label>
            <input value={form.linkedin} onChange={function(e) { updateForm('linkedin', e.target.value) }}
              placeholder="linkedin.com/in/yourname"
              className="w-full px-3 py-2.5 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1" />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs font-semibold text-pw-text3 mb-1 block">Notice period</label>
              <select value={form.notice_period} onChange={function(e) { updateForm('notice_period', e.target.value) }}
                className="w-full px-3 py-2.5 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1 appearance-none">
                <option value="">Select...</option>
                <option value="Immediately available">Immediately</option>
                <option value="1 week">1 week</option>
                <option value="2 weeks">2 weeks</option>
                <option value="1 month">1 month</option>
                <option value="2 months">2 months</option>
                <option value="3 months">3 months</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-pw-text3 mb-1 block">Right to work in UK</label>
              <select value={form.right_to_work} onChange={function(e) { updateForm('right_to_work', e.target.value) }}
                className="w-full px-3 py-2.5 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1 appearance-none">
                <option value="Yes - UK citizen/settled status">UK citizen / settled</option>
                <option value="Yes - valid work visa">Valid work visa</option>
                <option value="Need sponsorship">Need sponsorship</option>
              </select>
            </div>
          </div>
        </div>

        <button type="submit" disabled={submitting}
          className={'w-full mt-4 py-4 rounded-xl font-extrabold text-sm transition-all ' + (submitting ? 'bg-pw-border text-pw-muted' : 'bg-pw-green text-white hover:translate-y-[-1px] hover:shadow-lg hover:shadow-pw-green/20')}>
          {submitting ? 'Submitting...' : 'Submit application →'}
        </button>

        <div className="text-center text-[10px] text-pw-muted mt-2">
          By applying, you agree to our <Link href="/terms" className="text-pw-green hover:underline">Terms</Link> and <Link href="/privacy" className="text-pw-green hover:underline">Privacy Policy</Link>.
        </div>
      </form>
    </div>
  )
}
