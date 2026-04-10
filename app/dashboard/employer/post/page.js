'use client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

const TAG_CATEGORIES = {
  'Engineering': ['React','TypeScript','JavaScript','Python','Go','Java','Kotlin','Swift','Node.js','Next.js','Django','Flask','AWS','Azure','GCP','Docker','Kubernetes','Terraform','SQL','PostgreSQL','MongoDB','Redis','GraphQL','REST','CI/CD','C++','C#','.NET','Ruby','Rails','Rust','Elixir','PHP','Vue','Angular','Spring','FastAPI','Microservices','Linux','Git'],
  'Data & ML': ['Python','SQL','Spark','Airflow','Kafka','TensorFlow','PyTorch','Pandas','NumPy','Scikit-learn','R','Tableau','Looker','Power BI','dbt','Snowflake','BigQuery','Data Modelling','ETL','Statistics','Machine Learning','Deep Learning','NLP','Computer Vision','A/B Testing'],
  'Design': ['Figma','Sketch','Adobe XD','Adobe Creative Suite','InVision','Principle','Framer','User Research','Usability Testing','Design Systems','Wireframing','Prototyping','UI Design','UX Design','Interaction Design','Visual Design','Brand Design','Motion Design','Accessibility'],
  'Product': ['Product Strategy','Roadmapping','User Research','A/B Testing','Analytics','Jira','Confluence','Notion','Stakeholder Management','Agile','Scrum','OKRs','PRDs','User Stories','Competitive Analysis','Market Research','Data Analysis'],
  'Sales & BD': ['B2B Sales','B2C Sales','CRM','Salesforce','HubSpot','Pipeline Management','Account Management','Lead Generation','Cold Outreach','Negotiation','Contract Management','SaaS Sales','Enterprise Sales','Channel Partnerships','Revenue Operations','Sales Strategy','Forecasting'],
  'Marketing': ['SEO','SEM','PPC','Google Ads','Meta Ads','Content Marketing','Email Marketing','Social Media','Analytics','Google Analytics','Copywriting','Brand Strategy','PR','Campaign Management','Marketing Automation','Mailchimp','HubSpot','Growth Marketing','Community Management'],
  'Operations': ['Project Management','Process Improvement','Supply Chain','Logistics','Vendor Management','Budgeting','Reporting','Excel','Google Sheets','ERP','Lean','Six Sigma','Change Management','Stakeholder Management','Risk Management'],
  'Finance': ['Financial Modelling','FP&A','Accounting','GAAP','IFRS','Excel','Financial Analysis','Budgeting','Forecasting','Audit','Tax','Treasury','Compliance','Risk Management','SAP','NetSuite'],
  'People & HR': ['Recruitment','Talent Acquisition','Employee Relations','Performance Management','Compensation','Benefits','HRIS','Workday','Learning & Development','Employer Branding','DEI','Employment Law','Culture','Onboarding'],
  'General': ['Communication','Leadership','Team Management','Problem Solving','Presentation','Stakeholder Management','Strategic Thinking','Cross-functional','Remote Work','Mentoring']
}

const TITLE_CATEGORY_MAP = [
  { keywords: ['engineer','developer','devops','sre','architect','fullstack','frontend','backend','software','platform','infrastructure','mobile','ios','android','web'], categories: ['Engineering'] },
  { keywords: ['data','scientist','analytics','ml','machine learning','ai','bi','intelligence'], categories: ['Data & ML'] },
  { keywords: ['design','ux','ui','creative','brand','visual'], categories: ['Design'] },
  { keywords: ['product manager','product owner','product lead','product director'], categories: ['Product'] },
  { keywords: ['sales','account executive','business development','bdm','bdr','sdr','partnerships','commercial','revenue'], categories: ['Sales & BD'] },
  { keywords: ['marketing','growth','content','seo','sem','social media','brand manager','communications','pr','copywriter'], categories: ['Marketing'] },
  { keywords: ['operations','ops','logistics','supply chain','project manager','programme','procurement'], categories: ['Operations'] },
  { keywords: ['finance','accountant','controller','fp&a','treasury','audit','tax','cfo'], categories: ['Finance'] },
  { keywords: ['hr','recruiter','talent','people','culture','learning','l&d'], categories: ['People & HR'] },
]

const LOCATIONS = ['London','Manchester','Edinburgh','Bristol','Brighton','Birmingham','Leeds','Glasgow','Cardiff','Cambridge','Oxford','Remote']

export default function PostJobPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')
  const { user, profile, loading: authLoading } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')
  const [loadingJob, setLoadingJob] = useState(!!editId)

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
    if (editId) loadExistingJob()
  }, [user, profile, authLoading, editId])

  async function loadExistingJob() {
    const { data } = await supabase.from('jobs').select('*').eq('id', editId).single()
    if (data) {
      setForm({
        title: data.title,
        location: data.location,
        remote_policy: data.remote_policy,
        job_type: data.job_type,
        salary_min: String(data.salary_min),
        salary_max: String(data.salary_max),
        description: data.description,
        requirements: (data.requirements || []).join('\n'),
        tags: data.tags || [],
      })
    }
    setLoadingJob(false)
  }

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function toggleTag(tag) {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter(t => t !== tag) : [...prev.tags.slice(0, 12), tag]
    }))
  }

  // Smart tag suggestions based on job title
  const suggestedCategories = useMemo(() => {
    const title = form.title.toLowerCase()
    if (!title) return ['General']
    
    const matched = []
    for (const mapping of TITLE_CATEGORY_MAP) {
      if (mapping.keywords.some(kw => title.includes(kw))) {
        matched.push(...mapping.categories)
      }
    }
    if (matched.length === 0) matched.push('General')
    // Always include General as a fallback
    if (!matched.includes('General')) matched.push('General')
    return [...new Set(matched)]
  }, [form.title])

  const suggestedTags = useMemo(() => {
    const tags = []
    for (const cat of suggestedCategories) {
      if (TAG_CATEGORIES[cat]) tags.push(...TAG_CATEGORIES[cat])
    }
    return [...new Set(tags)]
  }, [suggestedCategories])

  function slugify(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 100)
  }

  function calcTrust() {
    let s = 0
    if (parseInt(form.salary_min) > 0) s += 30
    if (profile?.companies?.benefits?.length > 0) s += 20
    if (profile?.companies?.progression) s += 20
    if (profile?.companies?.satisfaction > 0) s += 15
    return s
  }

  async function handleSubmit() {
    setError('')
    if (!form.title.trim()) { setError('Job title is required'); return }
    if (!form.location) { setError('Location is required'); return }
    if (!form.salary_min || !form.salary_max) { setError('Salary range is required'); return }
    if (parseInt(form.salary_min) >= parseInt(form.salary_max)) { setError('Max salary must be higher than min'); return }
    if (!form.description.trim()) { setError('Description is required'); return }

    setSubmitting(true)
    try {
      const companySlug = profile?.companies?.name ? slugify(profile.companies.name) : 'unknown'
      const jobSlug = slugify(form.title + '-' + companySlug)
      const reqs = form.requirements.split('\n').map(r => r.trim()).filter(r => r.length > 0)

      const jobData = {
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
      }

      if (editId) {
        const { error: updateError } = await supabase.from('jobs').update(jobData).eq('id', editId)
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase.from('jobs').insert(jobData)
        if (insertError) throw insertError
      }
      setStep(3)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || loadingJob) return <div className="max-w-xl mx-auto px-6 py-20 text-center text-pw-muted text-sm">Loading...</div>

  if (step === 3) return (
    <div className="max-w-md mx-auto px-6 py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-pw-green flex items-center justify-center mx-auto mb-5 text-2xl text-black">✓</div>
      <h1 className="font-display text-3xl font-black tracking-tight mb-2">{editId ? 'Job updated!' : 'Job posted!'}</h1>
      <p className="text-sm text-pw-text2 mb-6">{form.title} is now live on ProofWork.</p>
      <div className="bg-pw-card border border-pw-border rounded-xl p-4 mb-6 text-left">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-mono text-pw-muted uppercase">Trust score</span>
          <span className="font-mono font-bold text-pw-green">{calcTrust()}/100</span>
        </div>
        <div className="text-xs text-pw-text2">{calcTrust() < 85 ? 'Add benefits and progression in Company Profile to increase your score.' : 'Great score! Maximum visibility.'}</div>
      </div>
      <div className="flex gap-3">
        <Link href="/dashboard/employer" className="flex-1 py-3 rounded-lg border border-pw-border text-pw-text1 font-bold text-sm text-center hover:bg-pw-card transition-colors">Dashboard</Link>
        <Link href="/jobs" className="flex-1 py-3 rounded-lg bg-pw-green text-black font-bold text-sm text-center hover:translate-y-[-1px] transition-all">View jobs</Link>
      </div>
    </div>
  )

  return (
    <div className="max-w-xl mx-auto px-6 py-6">
      <Link href="/dashboard/employer" className="text-xs text-pw-muted hover:text-pw-text2 mb-4 inline-block">← Dashboard</Link>
      <h1 className="font-display text-2xl font-black tracking-tight mb-1">{editId ? 'Edit job' : 'Post a job'}</h1>
      <p className="text-sm text-pw-text2 mb-6">Posting as <strong className="text-pw-text1">{profile?.companies?.name || 'your company'}</strong></p>

      <div className="flex gap-1 mb-6">
        {['Job details', 'Description & skills', 'Review'].map((label, i) => (
          <div key={label} className="flex-1">
            <div className={`h-[3px] rounded-full ${i <= step ? 'bg-pw-green' : 'bg-pw-border'}`} />
            <div className={`text-[9px] font-mono mt-1 uppercase tracking-wider ${i <= step ? 'text-pw-green' : 'text-pw-muted'}`}>{i < step ? '✓ ' : i === step ? '→ ' : ''}{label}</div>
          </div>
        ))}
      </div>

      {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">{error}</div>}

      {step === 0 && (
        <div className="bg-pw-card border border-pw-border rounded-xl p-5">
          <div className="text-[10px] font-mono text-pw-green uppercase tracking-widest mb-4">Job details</div>
          <div className="mb-3">
            <label className="text-xs font-semibold text-pw-text3 mb-1 block">Job title <span className="text-red-500">*</span></label>
            <input value={form.title} onChange={e => update('title', e.target.value)} placeholder="e.g. Senior Sales Manager, Product Designer, Data Engineer" className="w-full px-3 py-2.5 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1" />
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
          <div className="text-[10px] text-pw-green mb-3">Salary is mandatory on ProofWork — it's what makes candidates trust your listing.</div>
          <div className="mb-3">
            <label className="text-xs font-semibold text-pw-text3 mb-1 block">Job type</label>
            <div className="flex gap-2">
              {['Full-time', 'Part-time', 'Contract'].map(t => (
                <button key={t} type="button" onClick={() => update('job_type', t)} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${form.job_type === t ? 'bg-pw-greenDark border border-pw-green/20 text-pw-green' : 'bg-pw-bg border border-pw-border text-pw-muted'}`}>{t}</button>
              ))}
            </div>
          </div>
          <button onClick={() => { if (!form.title.trim() || !form.location || !form.salary_min || !form.salary_max) { setError('Fill in all required fields'); return } setError(''); setStep(1) }} className="w-full py-3 rounded-lg bg-pw-green text-black font-bold text-sm mt-3 hover:translate-y-[-1px] hover:shadow-lg hover:shadow-pw-green/20 transition-all">Next →</button>
        </div>
      )}

      {step === 1 && (
        <div className="bg-pw-card border border-pw-border rounded-xl p-5">
          <div className="text-[10px] font-mono text-pw-green uppercase tracking-widest mb-4">Description & skills</div>
          <div className="mb-3">
            <label className="text-xs font-semibold text-pw-text3 mb-1 block">Job description <span className="text-red-500">*</span></label>
            <textarea value={form.description} onChange={e => update('description', e.target.value)} placeholder="What does this role involve? What will they work on?" rows={6} className="w-full px-3 py-2.5 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1 resize-y" />
          </div>
          <div className="mb-4">
            <label className="text-xs font-semibold text-pw-text3 mb-1 block">Requirements <span className="text-pw-muted font-normal">one per line</span></label>
            <textarea value={form.requirements} onChange={e => update('requirements', e.target.value)} placeholder={"3+ years experience\nRelevant industry knowledge\nStrong communication skills"} rows={4} className="w-full px-3 py-2.5 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1 resize-y font-mono text-xs" />
          </div>
          <div className="mb-4">
            <label className="text-xs font-semibold text-pw-text3 mb-2 block">
              Skills & tags
              {form.title && <span className="text-pw-green font-normal ml-2">— suggestions for "{form.title}"</span>}
            </label>
            {suggestedCategories.map(cat => (
              <div key={cat} className="mb-3">
                <div className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mb-1.5">{cat}</div>
                <div className="flex flex-wrap gap-1.5">
                  {TAG_CATEGORIES[cat].map(tag => (
                    <button key={tag} type="button" onClick={() => toggleTag(tag)} className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-all ${form.tags.includes(tag) ? 'bg-pw-greenDark text-pw-green border border-pw-green/20' : 'bg-pw-bg text-pw-muted border border-pw-border hover:text-pw-text2'}`}>{tag}</button>
                  ))}
                </div>
              </div>
            ))}
            {form.tags.length > 0 && (
              <div className="mt-2 text-[10px] text-pw-muted">{form.tags.length}/12 tags selected</div>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(0)} className="flex-1 py-3 rounded-lg border border-pw-border text-pw-text1 font-bold text-sm hover:bg-pw-card transition-colors">← Back</button>
            <button onClick={() => { if (!form.description.trim()) { setError('Description is required'); return } setError(''); setStep(2) }} className="flex-1 py-3 rounded-lg bg-pw-green text-black font-bold text-sm hover:translate-y-[-1px] hover:shadow-lg hover:shadow-pw-green/20 transition-all">Review →</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <div className="bg-pw-card border border-pw-border rounded-xl p-5 mb-3">
            <div className="text-[10px] font-mono text-pw-green uppercase tracking-widest mb-4">Review</div>
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
            <p className="text-sm text-pw-text3 leading-relaxed mb-3">{form.description.substring(0, 200)}{form.description.length > 200 ? '...' : ''}</p>
            {form.tags.length > 0 && <div className="flex gap-1.5 flex-wrap mb-3">{form.tags.map(t => <span key={t} className="px-2 py-0.5 rounded bg-pw-bg text-pw-text2 text-[10px] font-mono">{t}</span>)}</div>}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-lg border border-pw-border text-pw-text1 font-bold text-sm hover:bg-pw-card transition-colors">← Edit</button>
            <button onClick={handleSubmit} disabled={submitting} className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${submitting ? 'bg-pw-border text-pw-muted' : 'bg-pw-green text-black hover:translate-y-[-1px] hover:shadow-lg hover:shadow-pw-green/20'}`}>{submitting ? 'Publishing...' : editId ? 'Update job' : 'Publish job 🎉'}</button>
          </div>
        </div>
      )}
    </div>
  )
}
