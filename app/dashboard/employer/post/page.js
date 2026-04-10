'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

const COMMON_TAGS = ['React','TypeScript','JavaScript','Python','Go','Java','Kotlin','Swift','Node.js','Next.js','Django','Flask','AWS','Azure','GCP','Docker','Kubernetes','Terraform','SQL','PostgreSQL','MongoDB','Redis','GraphQL','REST','CI/CD','Figma','Agile']

const LOCATIONS = ['London','Manchester','Edinburgh','Bristol','Brighton','Birmingham','Leeds','Glasgow','Cardiff','Cambridge','Oxford','Remote']

export default function PostJobPage() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    title: '',
    location: '',
    remote_policy: 'Hybrid',
    job_type: 'Full-time',
    salary_min: '',
    salary_max: '',
    description: '',
    requirements: '',
    tags: [],
  })

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push('/login'); return }
    if (profile?.role !== 'employer') { router.push('/dashboard'); return }
  }, [user, profile, authLoading])

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function toggleTag(tag) {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag]
    }))
  }

  function slugify(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 100)
  }

  function calcTrust() {
    let s = 0
    if (parseInt(form.salary_min) > 0) s += 30
    // Check if company has benefits/progression/satisfaction
    if (profile?.companies?.benefits?.length > 0) s += 20
    if (profile?.companies?.progression) s += 20
    if (profile?.companies?.satisfaction > 0) s += 15
    return s
  }

  async function handleSubmit() {
    setError('')

    if (!form.title.trim()) { setError('Job title is required'); return }
    if (!form.location) { setError('Location is required'); return }
    if (!form.salary_min || !form.salary_max) { setError('Salary range is required — this is what makes ProofWork different'); return }
    if (parseInt(form.salary_min) >= parseInt(form.salary_max)) { setError('Max salary must be higher than min'); return }
    if (!form.description.trim()) { setError('Description is required'); return }

    setSubmitting(true)

    try {
      const companySlug = profile?.companies?.name ? slugify(profile.companies.name) : 'unknown'
      const jobSlug = slugify(form.title + '-' + companySlug)
      const reqs = form.requirements.split('\n').map(r => r.trim()).filter(r => r.length > 0)

      const { error: insertError } = await supabase.from('jobs').insert({
        company_id: profile.company_id,
        title: form.title.trim(),
        slug: jobSlug,
        description: form.description.trim(),
        location: form.location,
        remote_policy: form.remote_policy,
        job_type: form.job_type,
        salary_min: parseInt(form.salary_min),
        salary_max: parseInt(form.salary_max),
        tags: form.tags,
        requirements: reqs,
        trust_score: calcTrust(),
        has_challenge: false,
        source: 'employer',
        active: true,
      })

      if (insertError) throw insertError
      setStep(3)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading) return <div className="max-w-xl mx-auto px-6 py-20 text-center text-pw-muted text-sm">Loading...</div>

  // Success
  if (step === 3) return (
    <div className="max-w-md mx-auto px-6 py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-pw-green flex items-center justify-center mx-auto mb-5 text-2xl text-black">✓</div>
      <h1 className="font-display text-3xl font-black tracking-tight mb-2">Job posted!</h1>
      <p className="text-sm text-pw-text2 mb-2">{form.title} is now live on ProofWork.</p>
      <p className="text-sm text-pw-text2 mb-6">Candidates can find it, see the salary, and apply immediately.</p>

      <div className="bg-pw-card border border-pw-border rounded-xl p-4 mb-6 text-left">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-mono text-pw-muted uppercase">Trust score</span>
          <span className="font-mono font-bold text-pw-green">{calcTrust()}/100</span>
        </div>
        <div className="text-xs text-pw-text2 leading-relaxed">
          {calcTrust() < 50 ? 'Add benefits, progression, and satisfaction data to your company profile to increase your score and attract more candidates.' :
           calcTrust() < 85 ? 'Good score! Add a skill challenge to reach maximum visibility.' :
           'Excellent! Your listing has maximum visibility.'}
        </div>
      </div>

      <div className="flex gap-3">
        <Link href="/dashboard/employer" className="flex-1 py-3 rounded-lg border border-pw-border text-pw-text1 font-bold text-sm text-center hover:bg-pw-card transition-colors">
          Dashboard
        </Link>
        <button onClick={() => { setStep(0); setForm({ title:'',location:'',remote_policy:'Hybrid',job_type:'Full-time',salary_min:'',salary_max:'',description:'',requirements:'',tags:[] }) }} className="flex-1 py-3 rounded-lg bg-pw-green text-black font-bold text-sm text-center hover:translate-y-[-1px] transition-all">
          Post another
        </button>
      </div>
    </div>
  )

  return (
    <div className="max-w-xl mx-auto px-6 py-6">
      <Link href="/dashboard/employer" className="text-xs text-pw-muted hover:text-pw-text2 mb-4 inline-block">← Dashboard</Link>

      <h1 className="font-display text-2xl font-black tracking-tight mb-1">Post a job</h1>
      <p className="text-sm text-pw-text2 mb-6">Posting as <strong className="text-pw-text1">{profile?.companies?.name || 'your company'}</strong>. Salary is mandatory — that's the ProofWork promise.</p>

      {/* Progress */}
      <div className="flex gap-1 mb-6">
        {['Job details', 'Description & skills', 'Review'].map((label, i) => (
          <div key={label} className="flex-1">
            <div className={`h-[3px] rounded-full ${i <= step ? 'bg-pw-green' : 'bg-pw-border'}`} />
            <div className={`text-[9px] font-mono mt-1 uppercase tracking-wider ${i <= step ? 'text-pw-green' : 'text-pw-muted'}`}>
              {i < step ? '✓ ' : i === step ? '→ ' : ''}{label}
            </div>
          </div>
        ))}
      </div>

      {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">{error}</div>}

      {/* STEP 0: Job details */}
      {step === 0 && (
        <div className="bg-pw-card border border-pw-border rounded-xl p-5">
          <div className="text-[10px] font-mono text-pw-green uppercase tracking-widest mb-4">Job details</div>

          <div className="mb-3">
            <label className="text-xs font-semibold text-pw-text3 mb-1 block">Job title <span className="text-red-500">*</span></label>
            <input value={form.title} onChange={e => update('title', e.target.value)} placeholder="e.g. Senior Frontend Engineer" className="w-full px-3 py-2.5 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1" />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-semibold text-pw-text3 mb-1 block">Location <span className="text-red-500">*</span></label>
              <select value={form.location} onChange={e => update('location', e.target.value)} className="w-full px-3 py-2.5 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1 appearance-none">
                <option value="">Select...</option>
                {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-pw-text3 mb-1 block">Remote policy</label>
              <select value={form.remote_policy} onChange={e => update('remote_policy', e.target.value)} className="w-full px-3 py-2.5 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1 appearance-none">
                <option value="On-site">On-site</option>
                <option value="Hybrid">Hybrid</option>
                <option value="Remote OK">Remote OK</option>
                <option value="Remote">Fully remote</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-semibold text-pw-text3 mb-1 block">Salary min (£) <span className="text-red-500">*</span></label>
              <input type="number" value={form.salary_min} onChange={e => update('salary_min', e.target.value)} placeholder="e.g. 75000" className="w-full px-3 py-2.5 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1" />
            </div>
            <div>
              <label className="text-xs font-semibold text-pw-text3 mb-1 block">Salary max (£) <span className="text-red-500">*</span></label>
              <input type="number" value={form.salary_max} onChange={e => update('salary_max', e.target.value)} placeholder="e.g. 95000" className="w-full px-3 py-2.5 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1" />
            </div>
          </div>
          <div className="text-[10px] text-pw-green mb-3">💡 Salary is mandatory on ProofWork. This is what makes candidates trust your listing.</div>

          <div>
            <label className="text-xs font-semibold text-pw-text3 mb-1 block">Job type</label>
            <div className="flex gap-2">
              {['Full-time', 'Part-time', 'Contract'].map(t => (
                <button key={t} type="button" onClick={() => update('job_type', t)} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${form.job_type === t ? 'bg-pw-greenDark border border-pw-green/20 text-pw-green' : 'bg-pw-bg border border-pw-border text-pw-muted'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <button onClick={() => {
            if (!form.title.trim() || !form.location || !form.salary_min || !form.salary_max) { setError('Fill in all required fields'); return }
            setError(''); setStep(1)
          }} className="w-full py-3 rounded-lg bg-pw-green text-black font-bold text-sm mt-5 hover:translate-y-[-1px] hover:shadow-lg hover:shadow-pw-green/20 transition-all">
            Next: Description & skills →
          </button>
        </div>
      )}

      {/* STEP 1: Description & skills */}
      {step === 1 && (
        <div className="bg-pw-card border border-pw-border rounded-xl p-5">
          <div className="text-[10px] font-mono text-pw-green uppercase tracking-widest mb-4">Description & skills</div>

          <div className="mb-3">
            <label className="text-xs font-semibold text-pw-text3 mb-1 block">Job description <span className="text-red-500">*</span></label>
            <textarea value={form.description} onChange={e => update('description', e.target.value)} placeholder="What does this role involve? What will they work on? What's the team like?" rows={6} className="w-full px-3 py-2.5 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1 resize-y" />
          </div>

          <div className="mb-4">
            <label className="text-xs font-semibold text-pw-text3 mb-1 block">Requirements <span className="text-pw-muted font-normal">one per line</span></label>
            <textarea value={form.requirements} onChange={e => update('requirements', e.target.value)} placeholder={"3+ years React experience\nTypeScript proficiency\nExperience with testing frameworks"} rows={4} className="w-full px-3 py-2.5 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1 resize-y font-mono text-xs" />
          </div>

          <div className="mb-4">
            <label className="text-xs font-semibold text-pw-text3 mb-2 block">Skills & tags <span className="text-pw-muted font-normal">select all that apply</span></label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_TAGS.map(tag => (
                <button key={tag} type="button" onClick={() => toggleTag(tag)} className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-all ${form.tags.includes(tag) ? 'bg-pw-greenDark text-pw-green border border-pw-green/20' : 'bg-pw-bg text-pw-muted border border-pw-border hover:text-pw-text2'}`}>
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(0)} className="flex-1 py-3 rounded-lg border border-pw-border text-pw-text1 font-bold text-sm hover:bg-pw-card transition-colors">
              ← Back
            </button>
            <button onClick={() => {
              if (!form.description.trim()) { setError('Description is required'); return }
              setError(''); setStep(2)
            }} className="flex-1 py-3 rounded-lg bg-pw-green text-black font-bold text-sm hover:translate-y-[-1px] hover:shadow-lg hover:shadow-pw-green/20 transition-all">
              Review →
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Review */}
      {step === 2 && (
        <div>
          <div className="bg-pw-card border border-pw-border rounded-xl p-5 mb-3">
            <div className="text-[10px] font-mono text-pw-green uppercase tracking-widest mb-4">Review your listing</div>

            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="font-display text-xl font-bold">{form.title}</h2>
                <div className="text-sm text-pw-text2 mt-1">{profile?.companies?.name} · {form.location} · {form.remote_policy}</div>
                <div className="font-mono text-lg font-bold text-pw-green mt-2">£{Math.round(parseInt(form.salary_min)/1000)}k–{Math.round(parseInt(form.salary_max)/1000)}k</div>
              </div>
              <div className="text-center">
                <div className="w-14 h-14 rounded-full border-[2.5px] border-pw-green flex items-center justify-center font-mono text-base font-bold text-pw-green">{calcTrust()}</div>
                <div className="text-[8px] font-mono text-pw-muted mt-1 uppercase">Trust</div>
              </div>
            </div>

            <div className="flex gap-1.5 flex-wrap mb-3">
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-pw-greenDark text-pw-green font-bold border border-pw-green/20">✓ VERIFIED</span>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-pw-bg text-pw-muted">{form.job_type}</span>
            </div>

            <p className="text-sm text-pw-text3 leading-relaxed mb-3">{form.description.substring(0, 200)}{form.description.length > 200 ? '...' : ''}</p>

            {form.tags.length > 0 && (
              <div className="flex gap-1.5 flex-wrap mb-3">
                {form.tags.map(t => <span key={t} className="px-2 py-0.5 rounded bg-pw-bg text-pw-text2 text-[10px] font-mono">{t}</span>)}
              </div>
            )}

            {form.requirements && (
              <div className="text-xs text-pw-text3">
                {form.requirements.split('\n').filter(r => r.trim()).slice(0, 3).map((r, i) => (
                  <div key={i} className="flex gap-2 py-0.5"><span className="text-pw-green">→</span>{r.trim()}</div>
                ))}
                {form.requirements.split('\n').filter(r => r.trim()).length > 3 && <div className="text-pw-muted mt-1">+ {form.requirements.split('\n').filter(r => r.trim()).length - 3} more</div>}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-lg border border-pw-border text-pw-text1 font-bold text-sm hover:bg-pw-card transition-colors">
              ← Edit
            </button>
            <button onClick={handleSubmit} disabled={submitting} className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${submitting ? 'bg-pw-border text-pw-muted' : 'bg-pw-green text-black hover:translate-y-[-1px] hover:shadow-lg hover:shadow-pw-green/20'}`}>
              {submitting ? 'Publishing...' : 'Publish job 🎉'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
