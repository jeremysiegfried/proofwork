'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import TrustRing from '@/components/TrustRing'
import { supabase } from '@/lib/supabase'

export default function ApplyPage({ params }) {
  const router = useRouter()
  const fileRef = useRef(null)
  const [job, setJob] = useState(null)
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    linkedin: '',
    notice_period: '',
    right_to_work: '',
    cover_note: '',
  })
  const [cvFile, setCvFile] = useState(null)
  const [errors, setErrors] = useState({})

  // Load job data
  useState(() => {
    async function load() {
      const { data } = await supabase
        .from('jobs')
        .select('*, companies(*)')
        .eq('slug', params.slug)
        .single()
      if (data) {
        setJob(data)
        setCompany(data.companies)
      }
      setLoading(false)
    }
    load()
  })

  function updateField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }))
  }

  function validate() {
    const errs = {}
    if (!form.full_name.trim()) errs.full_name = 'Required'
    if (!form.email.includes('@')) errs.email = 'Valid email required'
    if (!form.right_to_work) errs.right_to_work = 'Required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)

    try {
      // Upload CV if provided
      let cvUrl = ''
      if (cvFile) {
        const ext = cvFile.name.split('.').pop()
        const fileName = `${Date.now()}-${form.full_name.replace(/\s+/g, '-').toLowerCase()}.${ext}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('cvs')
          .upload(fileName, cvFile)
        if (!uploadError && uploadData) {
          cvUrl = uploadData.path
        }
      }

      // Insert application
      const { error } = await supabase.from('applications').insert({
        job_id: job.id,
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        linkedin: form.linkedin.trim(),
        cv_url: cvUrl,
        notice_period: form.notice_period,
        right_to_work: form.right_to_work,
        cover_note: form.cover_note.trim(),
        status: 'submitted',
      })

      if (error) throw error
      setSubmitted(true)
    } catch (err) {
      console.error('Submit error:', err)
      alert('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="max-w-xl mx-auto px-6 py-20 text-center">
      <div className="text-pw-muted">Loading...</div>
    </div>
  )

  if (!job) return (
    <div className="max-w-xl mx-auto px-6 py-20 text-center">
      <h1 className="text-xl font-bold mb-2">Job not found</h1>
      <Link href="/jobs" className="text-pw-green hover:underline text-sm">← Browse jobs</Link>
    </div>
  )

  // Success page
  if (submitted) return (
    <div className="max-w-lg mx-auto px-6 py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-pw-green flex items-center justify-center mx-auto mb-4 text-2xl text-black animate-[scaleIn_0.5s_ease]">✓</div>
      <h1 className="font-display text-3xl font-black tracking-tight mb-2">Application sent</h1>
      <p className="text-pw-text2 mb-6">
        Your details have been submitted to <strong className="text-pw-text1">{company?.name}</strong> for the {job.title} role.
      </p>

      <div className="bg-pw-card border border-pw-border rounded-xl p-5 text-left mb-6">
        <h3 className="text-xs font-mono text-pw-muted uppercase tracking-wider mb-3">What happens next</h3>
        <div className="space-y-2 text-sm text-pw-text3">
          <div className="flex gap-2"><span className="text-pw-green">1.</span> {company?.name} reviews all applications</div>
          <div className="flex gap-2"><span className="text-pw-green">2.</span> Candidates are ranked by combined score (CV + challenge if applicable)</div>
          <div className="flex gap-2"><span className="text-pw-green">3.</span> You'll hear back via email</div>
        </div>
      </div>

      <div className="flex gap-3">
        <Link href="/jobs" className="flex-1 py-3 rounded-lg border border-pw-border text-pw-text1 font-bold text-sm text-center hover:bg-pw-card transition-colors">
          Browse more jobs
        </Link>
        <Link href={`/jobs/${params.slug}`} className="flex-1 py-3 rounded-lg bg-pw-green text-white font-bold text-sm text-center hover:translate-y-[-1px] transition-all">
          View listing
        </Link>
      </div>
    </div>
  )

  const hasSalary = job.salary_min > 0

  return (
    <div className="max-w-xl mx-auto px-6 py-6">
      <Link href={`/jobs/${params.slug}`} className="text-xs text-pw-muted hover:text-pw-text2 transition-colors mb-4 inline-block">
        ← Back to {job.title}
      </Link>

      {/* Progress bar */}
      <div className="flex gap-1 mb-6">
        {(job.has_challenge ? ['Your details', 'Skill challenge', 'Submitted'] : ['Your details', 'Submitted']).map((label, i) => (
          <div key={label} className="flex-1">
            <div className={`h-[3px] rounded-full ${i === 0 ? 'bg-pw-green' : 'bg-pw-border'}`} />
            <div className={`text-[9px] font-mono mt-1 uppercase tracking-wider ${i === 0 ? 'text-pw-green' : 'text-pw-muted'}`}>
              {i === 0 ? '→ ' : ''}{label}
            </div>
          </div>
        ))}
      </div>

      {/* Job header */}
      <div className="flex items-center gap-3 mb-5 p-3 bg-pw-card rounded-xl border border-pw-border">
        {company?.logo_emoji && <span className="text-xl">{company.logo_emoji}</span>}
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold text-sm truncate">{job.title}</div>
          <div className="text-xs text-pw-text2">
            {company?.name}
            {hasSalary && ` · £${Math.round(job.salary_min/1000)}k–${Math.round(job.salary_max/1000)}k`}
          </div>
        </div>
        <TrustRing score={job.trust_score} size={34} />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="bg-pw-card border border-pw-border rounded-xl p-5">
          <div className="text-[10px] font-mono text-pw-green uppercase tracking-widest mb-4">Your details</div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-semibold text-pw-text3 mb-1 block">
                Full name <span className="text-red-500">*</span>
              </label>
              <input
                value={form.full_name}
                onChange={e => updateField('full_name', e.target.value)}
                placeholder="Jerry Smith"
                className={`w-full px-3 py-2.5 rounded-md border bg-pw-bg text-sm text-pw-text1 ${errors.full_name ? 'border-red-500' : 'border-pw-border'}`}
              />
              {errors.full_name && <div className="text-[10px] text-red-500 mt-0.5">{errors.full_name}</div>}
            </div>
            <div>
              <label className="text-xs font-semibold text-pw-text3 mb-1 block">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                value={form.email}
                onChange={e => updateField('email', e.target.value)}
                placeholder="jerry@email.com"
                type="email"
                className={`w-full px-3 py-2.5 rounded-md border bg-pw-bg text-sm text-pw-text1 ${errors.email ? 'border-red-500' : 'border-pw-border'}`}
              />
              {errors.email && <div className="text-[10px] text-red-500 mt-0.5">{errors.email}</div>}
            </div>
          </div>

          <div className="mb-3">
            <label className="text-xs font-semibold text-pw-text3 mb-1 block">
              LinkedIn <span className="text-pw-muted font-normal">optional</span>
            </label>
            <input
              value={form.linkedin}
              onChange={e => updateField('linkedin', e.target.value)}
              placeholder="linkedin.com/in/you"
              className="w-full px-3 py-2.5 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1"
            />
          </div>

          {/* CV Upload */}
          <div className="mb-3">
            <label className="text-xs font-semibold text-pw-text3 mb-1 block">CV / Resume</label>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={e => { if (e.target.files?.[0]) setCvFile(e.target.files[0]) }}
              className="hidden"
            />
            {cvFile ? (
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-pw-green/30 bg-pw-greenDark">
                <span className="text-base">📄</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-pw-green truncate">{cvFile.name}</div>
                  <div className="text-[10px] text-pw-text2">{Math.round(cvFile.size / 1024)} KB</div>
                </div>
                <button type="button" onClick={() => setCvFile(null)} className="text-red-500 text-xs font-semibold">Remove</button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full py-4 rounded-md border border-dashed border-pw-border bg-pw-bg text-center hover:border-pw-green/30 transition-colors"
              >
                <div className="text-sm font-semibold text-pw-text3">Upload CV — PDF or Word</div>
                <div className="text-[11px] text-pw-muted mt-1">Your CV is shared with the employer alongside any challenge results</div>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-semibold text-pw-text3 mb-1 block">Notice period</label>
              <select
                value={form.notice_period}
                onChange={e => updateField('notice_period', e.target.value)}
                className="w-full px-3 py-2.5 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1 appearance-none"
              >
                <option value="">Select...</option>
                <option value="Immediately">Immediately</option>
                <option value="1 week">1 week</option>
                <option value="1 month">1 month</option>
                <option value="2 months">2 months</option>
                <option value="3 months">3 months</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-pw-text3 mb-1 block">
                Right to work <span className="text-red-500">*</span>
              </label>
              <select
                value={form.right_to_work}
                onChange={e => updateField('right_to_work', e.target.value)}
                className={`w-full px-3 py-2.5 rounded-md border bg-pw-bg text-sm text-pw-text1 appearance-none ${errors.right_to_work ? 'border-red-500' : 'border-pw-border'}`}
              >
                <option value="">Select...</option>
                <option value="British citizen">British citizen</option>
                <option value="Settled status">Settled / Pre-settled</option>
                <option value="Work visa">Valid work visa</option>
                <option value="Need sponsorship">Need sponsorship</option>
              </select>
              {errors.right_to_work && <div className="text-[10px] text-red-500 mt-0.5">{errors.right_to_work}</div>}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-pw-text3 mb-1 block">
              Cover note <span className="text-pw-muted font-normal">optional</span>
            </label>
            <textarea
              value={form.cover_note}
              onChange={e => updateField('cover_note', e.target.value)}
              placeholder="Why this role interests you, availability, etc."
              rows={3}
              className="w-full px-3 py-2.5 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1 resize-y"
            />
          </div>
        </div>

        <div className="mt-4">
          <button
            type="submit"
            disabled={submitting}
            className={`w-full py-4 rounded-xl font-extrabold text-sm transition-all ${
              submitting
                ? 'bg-pw-border text-pw-muted cursor-wait'
                : 'bg-pw-green text-white hover:translate-y-[-1px] hover:shadow-lg hover:shadow-pw-green/20 cursor-pointer'
            }`}
          >
            {submitting ? 'Submitting...' : job.has_challenge ? 'Continue to skill challenge →' : 'Submit application'}
          </button>
        </div>
      </form>
    </div>
  )
}
