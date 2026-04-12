'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export default function PostJobPage() {
  var router = useRouter()
  var { user, profile, loading: authLoading } = useAuth()
  var [company, setCompany] = useState(null)
  var [loading, setLoading] = useState(true)
  var [submitting, setSubmitting] = useState(false)
  var [error, setError] = useState('')
  var [success, setSuccess] = useState(null)

  var [form, setForm] = useState({
    title: '',
    location: 'London',
    remote_policy: 'Hybrid',
    job_type: 'Full-time',
    salary_min: '',
    salary_max: '',
    description: '',
    tags: '',
  })

  useEffect(function() {
    if (authLoading) return
    if (!user) { router.push('/login'); return }
    if (profile?.role !== 'employer') { router.push('/dashboard/candidate'); return }
    loadCompany()
  }, [user, profile, authLoading])

  async function loadCompany() {
    if (!profile?.company_id) { setLoading(false); return }
    var { data } = await supabase.from('companies').select('*').eq('id', profile.company_id).single()
    setCompany(data)
    setLoading(false)
  }

  function updateForm(key, value) {
    setForm(function(prev) { var n = { ...prev }; n[key] = value; return n })
  }

  function generateSlug(title) {
    return title.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 80)
      + '-' + Date.now().toString(36)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) { setError('Job title is required'); return }
    if (!form.description.trim()) { setError('Job description is required'); return }
    if (!company) { setError('No company linked to your account'); return }

    setSubmitting(true)
    setError('')

    try {
      var salaryMin = parseInt(form.salary_min) || 0
      var salaryMax = parseInt(form.salary_max) || salaryMin
      var tags = form.tags.split(',').map(function(t) { return t.trim() }).filter(function(t) { return t.length > 0 })

      // Calculate trust score
      var trust = 0
      if (salaryMin > 0) trust += 30
      if (company.benefits && company.benefits.length > 0) trust += 20
      if (company.progression) trust += 20
      if (company.satisfaction > 0) trust += 15

      var slug = generateSlug(form.title)

      var { data: newJob, error: insertError } = await supabase.from('jobs').insert({
        title: form.title.trim(),
        slug: slug,
        location: form.location,
        remote_policy: form.remote_policy,
        job_type: form.job_type,
        salary_min: salaryMin,
        salary_max: salaryMax,
        description: form.description.trim(),
        tags: tags,
        company_id: company.id,
        source: 'employer',
        source_url: '',
        trust_score: trust,
        has_challenge: false,
        active: true,
        posted_at: new Date().toISOString(),
      }).select().single()

      if (insertError) throw insertError

      setSuccess(newJob)
    } catch (err) {
      setError(err.message || 'Failed to post job')
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || loading) {
    return <div className="max-w-2xl mx-auto px-6 py-20 text-center text-pw-muted text-sm">Loading...</div>
  }

  if (!company) {
    return (
      <div className="max-w-xl mx-auto px-6 py-12 text-center">
        <h1 className="font-display text-xl font-bold mb-2">No company linked</h1>
        <p className="text-sm text-pw-text2 mb-4">You need to claim a company before posting jobs.</p>
        <Link href="/companies" className="text-pw-green text-sm hover:underline">Find and claim your company →</Link>
      </div>
    )
  }

  if (success) {
    return (
      <div className="max-w-xl mx-auto px-6 py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-pw-green flex items-center justify-center mx-auto mb-5 text-2xl text-black">✓</div>
        <h1 className="font-display text-2xl font-black tracking-tight mb-2">Job posted!</h1>
        <p className="text-sm text-pw-text2 mb-6">
          <strong>{success.title}</strong> is now live on ShowJob with a trust score of {success.trust_score}/100.
        </p>
        <div className="flex gap-3">
          <Link href={'/jobs/' + success.slug} className="flex-1 py-3 rounded-lg bg-pw-green text-white font-bold text-sm text-center hover:translate-y-[-1px] transition-all">
            View listing →
          </Link>
          <button onClick={function() { setSuccess(null); setForm({ title: '', location: 'London', remote_policy: 'Hybrid', job_type: 'Full-time', salary_min: '', salary_max: '', description: '', tags: '' }) }}
            className="flex-1 py-3 rounded-lg border border-pw-border text-pw-text1 font-bold text-sm text-center hover:bg-pw-card transition-colors">
            Post another
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <Link href="/dashboard/employer" className="text-xs text-pw-muted hover:text-pw-text2 transition-colors mb-4 inline-block">← Dashboard</Link>

      <h1 className="font-display text-2xl font-black tracking-tight mb-1">Post a job</h1>
      <p className="text-xs text-pw-muted font-mono mb-6">Posting as {company.name}</p>

      {error && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="bg-pw-card border border-pw-border rounded-xl p-5 mb-4">
          <div className="text-[10px] font-mono text-pw-green uppercase tracking-wider mb-4">Job details</div>

          <div className="mb-4">
            <label className="text-xs font-semibold text-pw-text3 mb-1 block">Job title <span className="text-red-500">*</span></label>
            <input value={form.title} onChange={function(e) { updateForm('title', e.target.value) }} required
              placeholder="e.g. Senior Software Engineer"
              className="w-full px-3 py-2.5 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1" />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs font-semibold text-pw-text3 mb-1 block">Location</label>
              <select value={form.location} onChange={function(e) { updateForm('location', e.target.value) }}
                className="w-full px-3 py-2.5 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1 appearance-none">
                {['London','Manchester','Edinburgh','Bristol','Birmingham','Leeds','Glasgow','Liverpool','Brighton','Cambridge','Oxford','Belfast','Cardiff','Newcastle','Nottingham','Sheffield','Other UK'].map(function(loc) {
                  return <option key={loc} value={loc}>{loc}</option>
                })}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-pw-text3 mb-1 block">Remote policy</label>
              <select value={form.remote_policy} onChange={function(e) { updateForm('remote_policy', e.target.value) }}
                className="w-full px-3 py-2.5 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1 appearance-none">
                <option value="On-site">On-site</option>
                <option value="Hybrid">Hybrid</option>
                <option value="Remote">Fully remote</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs font-semibold text-pw-text3 mb-1 block">Job type</label>
              <select value={form.job_type} onChange={function(e) { updateForm('job_type', e.target.value) }}
                className="w-full px-3 py-2.5 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1 appearance-none">
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Freelance">Freelance</option>
                <option value="Internship">Internship</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-pw-text3 mb-1 block">Tags</label>
              <input value={form.tags} onChange={function(e) { updateForm('tags', e.target.value) }}
                placeholder="React, Node.js, Python"
                className="w-full px-3 py-2.5 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1" />
              <div className="text-[10px] text-pw-muted mt-0.5">Comma separated</div>
            </div>
          </div>
        </div>

        <div className="bg-pw-card border border-pw-border rounded-xl p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[10px] font-mono text-pw-green uppercase tracking-wider">Salary</div>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-pw-greenDark text-pw-green border border-pw-green/20">+30 trust points</span>
          </div>
          <p className="text-xs text-pw-text2 mb-3">Jobs that disclose salary get 3x more applications and rank higher on ShowJob.</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-pw-text3 mb-1 block">Min salary (£/year)</label>
              <input type="number" value={form.salary_min} onChange={function(e) { updateForm('salary_min', e.target.value) }}
                placeholder="e.g. 55000"
                className="w-full px-3 py-2.5 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1" />
            </div>
            <div>
              <label className="text-xs font-semibold text-pw-text3 mb-1 block">Max salary (£/year)</label>
              <input type="number" value={form.salary_max} onChange={function(e) { updateForm('salary_max', e.target.value) }}
                placeholder="e.g. 75000"
                className="w-full px-3 py-2.5 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1" />
            </div>
          </div>
        </div>

        <div className="bg-pw-card border border-pw-border rounded-xl p-5 mb-4">
          <div className="text-[10px] font-mono text-pw-green uppercase tracking-wider mb-4">Description <span className="text-red-500">*</span></div>
          <textarea value={form.description} onChange={function(e) { updateForm('description', e.target.value) }} required
            placeholder={"About the role\nWe're looking for...\n\nResponsibilities\n- ...\n- ...\n\nRequirements\n- ...\n- ...\n\nBenefits\n- ..."}
            rows={16}
            className="w-full px-3 py-2.5 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1 resize-y font-mono text-xs leading-relaxed" />
          <div className="text-[10px] text-pw-muted mt-1">Markdown supported. Be detailed — candidates prefer transparent descriptions.</div>
        </div>

        <button type="submit" disabled={submitting}
          className={'w-full py-4 rounded-xl font-extrabold text-sm transition-all ' + (submitting ? 'bg-pw-border text-pw-muted' : 'bg-pw-green text-white hover:translate-y-[-1px] hover:shadow-lg hover:shadow-pw-green/20')}>
          {submitting ? 'Posting...' : 'Post job →'}
        </button>
      </form>
    </div>
  )
}
