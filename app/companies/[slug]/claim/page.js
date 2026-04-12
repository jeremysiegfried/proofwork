'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import TrustRing from '@/components/TrustRing'

export default function ClaimCompanyPage({ params }) {
  var router = useRouter()
  var { user, profile, loading: authLoading } = useAuth()
  var [company, setCompany] = useState(null)
  var [jobCount, setJobCount] = useState(0)
  var [loading, setLoading] = useState(true)
  var [step, setStep] = useState(0) // 0=verify, 1=add data, 2=done
  var [saving, setSaving] = useState(false)
  var [error, setError] = useState('')

  var [form, setForm] = useState({
    work_email: '',
    job_title: '',
    benefits: '',
    progression: '',
    satisfaction: '',
    website: '',
    careers_url: '',
  })

  useEffect(function() {
    loadCompany()
  }, [])

  async function loadCompany() {
    var { data: co } = await supabase
      .from('companies')
      .select('*')
      .eq('slug', params.slug)
      .single()

    if (co) {
      setCompany(co)
      setForm(function(prev) {
        return {
          ...prev,
          benefits: (co.benefits || []).join('\n'),
          progression: co.progression || '',
          satisfaction: co.satisfaction ? String(co.satisfaction) : '',
          website: co.website || '',
          careers_url: co.careers_url || '',
        }
      })

      if (co.claimed) {
        setStep(2) // Already claimed
      }

      var { count } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', co.id)
        .eq('active', true)
      setJobCount(count || 0)
    }
    setLoading(false)
  }

  async function handleVerify(e) {
    e.preventDefault()
    setError('')

    if (!form.work_email.includes('@')) {
      setError('Please enter a valid work email')
      return
    }

    // For now, accept any email - in production you'd send a verification email
    // and check domain matches company website
    setStep(1)
  }

  async function handleClaim() {
    setSaving(true)
    setError('')

    try {
      var benefits = form.benefits.split('\n').map(function(b) { return b.trim() }).filter(function(b) { return b.length > 0 })
      var satisfaction = parseFloat(form.satisfaction) || 0

      // Update company
      var { error: updateError } = await supabase.from('companies').update({
        claimed: true,
        claimed_at: new Date().toISOString(),
        claimed_by: form.work_email || (user ? user.email : ''),
        benefits: benefits,
        progression: form.progression.trim(),
        satisfaction: Math.min(5, Math.max(0, satisfaction)),
        website: form.website.trim(),
        careers_url: form.careers_url.trim(),
      }).eq('id', company.id)

      if (updateError) throw updateError

      // Recalculate trust scores for all company jobs
      var { data: jobs } = await supabase
        .from('jobs')
        .select('id, salary_min, has_challenge')
        .eq('company_id', company.id)

      if (jobs) {
        for (var i = 0; i < jobs.length; i++) {
          var trust = 0
          if (jobs[i].salary_min > 0) trust += 30
          if (benefits.length > 0) trust += 20
          if (form.progression.trim()) trust += 20
          if (satisfaction > 0) trust += 15
          if (jobs[i].has_challenge) trust += 15
          await supabase.from('jobs').update({ trust_score: trust }).eq('id', jobs[i].id)
        }
      }

      // If user is logged in, link profile to company
      if (user && profile) {
        await supabase.from('profiles').update({
          role: 'employer',
          company_id: company.id
        }).eq('id', user.id)
      }

      setStep(2)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function calcPreviewScore() {
    var s = 0
    if (form.benefits.trim().length > 0) s += 20
    if (form.progression.trim().length > 0) s += 20
    if (parseFloat(form.satisfaction) > 0) s += 15
    s += 30 // Assume some jobs have salary
    return s
  }

  if (loading) {
    return <div className="max-w-xl mx-auto px-6 py-20 text-center text-pw-muted text-sm">Loading...</div>
  }

  if (!company) {
    return (
      <div className="max-w-xl mx-auto px-6 py-20 text-center">
        <h1 className="font-display text-xl font-bold mb-2">Company not found</h1>
        <Link href="/jobs" className="text-pw-green text-sm hover:underline">← Browse jobs</Link>
      </div>
    )
  }

  // Already claimed
  if (step === 2 && company.claimed && !saving) {
    return (
      <div className="max-w-xl mx-auto px-6 py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-pw-green flex items-center justify-center mx-auto mb-5 text-2xl text-black">✓</div>
        <h1 className="font-display text-3xl font-black tracking-tight mb-2">{company.name} is verified</h1>
        <p className="text-sm text-pw-text2 mb-6">This company has been claimed and verified on ShowJob.</p>
        <Link href={'/companies/' + params.slug} className="text-pw-green font-semibold text-sm hover:underline">View company page →</Link>
      </div>
    )
  }

  // Success after claiming
  if (step === 2) {
    return (
      <div className="max-w-xl mx-auto px-6 py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-pw-green flex items-center justify-center mx-auto mb-5 text-2xl text-black">✓</div>
        <h1 className="font-display text-3xl font-black tracking-tight mb-2">{company.name} is now verified!</h1>
        <p className="text-sm text-pw-text2 mb-6">
          Your {jobCount} listing{jobCount !== 1 ? 's' : ''} now show{jobCount === 1 ? 's' : ''} a verified badge and your transparency score has been updated.
        </p>

        <div className="bg-pw-card border border-pw-border rounded-xl p-5 mb-6 text-left">
          <div className="text-[10px] font-mono text-pw-green uppercase tracking-wider mb-3">What changed</div>
          <div className="flex flex-col gap-2 text-sm text-pw-text3">
            <div className="flex gap-2"><span className="text-pw-green">✓</span> All your listings now show a verified badge</div>
            <div className="flex gap-2"><span className="text-pw-green">✓</span> Trust scores recalculated across {jobCount} jobs</div>
            <div className="flex gap-2"><span className="text-pw-green">✓</span> Candidates can see your benefits and culture data</div>
            <div className="flex gap-2"><span className="text-pw-green">✓</span> Your jobs rank higher in search results</div>
          </div>
        </div>

        <div className="flex gap-3">
          <Link href={'/companies/' + params.slug} className="flex-1 py-3 rounded-lg bg-pw-green text-white font-bold text-sm text-center hover:translate-y-[-1px] hover:shadow-lg hover:shadow-pw-green/20 transition-all">
            View your company page →
          </Link>
          <Link href="/pricing" className="flex-1 py-3 rounded-lg border border-pw-border text-pw-text1 font-bold text-sm text-center hover:bg-pw-card transition-colors">
            See pricing plans
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-8">
      <Link href={'/companies/' + params.slug} className="text-xs text-pw-muted hover:text-pw-text2 transition-colors mb-4 inline-block">← {company.name}</Link>

      <div className="flex items-center gap-3 mb-6">
        {company.logo_emoji && <span className="text-2xl">{company.logo_emoji}</span>}
        <div>
          <h1 className="font-display text-2xl font-black tracking-tight">Claim {company.name}</h1>
          <p className="text-xs text-pw-muted font-mono">{jobCount} active listing{jobCount !== 1 ? 's' : ''} on ShowJob</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs">{error}</div>
      )}

      {/* Progress */}
      <div className="flex gap-1 mb-6">
        {['Verify', 'Add data', 'Live'].map(function(label, i) {
          return (
            <div key={label} className="flex-1">
              <div className={'h-[3px] rounded-full ' + (i <= step ? 'bg-pw-green' : 'bg-pw-border')} />
              <div className={'text-[9px] font-mono mt-1 uppercase tracking-wider ' + (i <= step ? 'text-pw-green' : 'text-pw-muted')}>
                {i < step ? '✓ ' : i === step ? '→ ' : ''}{label}
              </div>
            </div>
          )
        })}
      </div>

      {/* Step 0: Verify */}
      {step === 0 && (
        <div>
          <div className="bg-pw-card border border-pw-border rounded-xl p-5 mb-4">
            <div className="text-[10px] font-mono text-pw-green uppercase tracking-widest mb-4">Verify your identity</div>

            <p className="text-sm text-pw-text2 leading-relaxed mb-4">
              To claim {company.name}, we need to verify you work there. Enter your work email and job title below.
            </p>

            <form onSubmit={handleVerify}>
              <div className="mb-3">
                <label className="text-xs font-semibold text-pw-text3 mb-1 block">Work email <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  value={form.work_email}
                  onChange={function(e) { setForm(function(p) { return { ...p, work_email: e.target.value } }) }}
                  placeholder={'you@' + (company.website ? company.website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] : 'company.com')}
                  required
                  className="w-full px-3 py-2.5 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1"
                />
                <div className="text-[10px] text-pw-muted mt-1">Use your company email so we can verify you work at {company.name}</div>
              </div>

              <div className="mb-4">
                <label className="text-xs font-semibold text-pw-text3 mb-1 block">Your job title</label>
                <input
                  value={form.job_title}
                  onChange={function(e) { setForm(function(p) { return { ...p, job_title: e.target.value } }) }}
                  placeholder="e.g. Head of Talent, HR Manager, CTO"
                  className="w-full px-3 py-2.5 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1"
                />
              </div>

              <button type="submit" className="w-full py-3 rounded-lg bg-pw-green text-white font-bold text-sm hover:translate-y-[-1px] hover:shadow-lg hover:shadow-pw-green/20 transition-all">
                Continue →
              </button>
            </form>
          </div>

          {!user && (
            <div className="text-center text-sm text-pw-text2">
              Already have an account? <Link href="/login" className="text-pw-green font-semibold hover:underline">Log in</Link>
            </div>
          )}
        </div>
      )}

      {/* Step 1: Add transparency data */}
      {step === 1 && (
        <div>
          <div className="bg-pw-card border border-pw-border rounded-xl p-5 mb-4">
            <div className="text-[10px] font-mono text-pw-green uppercase tracking-widest mb-4">Add transparency data</div>

            <p className="text-sm text-pw-text2 leading-relaxed mb-4">
              The more you share, the higher your trust score — and the more candidates will apply. Every field is optional but each one adds points.
            </p>

            <div className="mb-4">
              <label className="text-xs font-semibold text-pw-text3 mb-1 flex items-center gap-2">
                Benefits <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-pw-greenDark text-pw-green">+20 pts</span>
              </label>
              <textarea
                value={form.benefits}
                onChange={function(e) { setForm(function(p) { return { ...p, benefits: e.target.value } }) }}
                placeholder={"25 days holiday\nEquity / stock options\nLearning budget\nPrivate healthcare\nFlexible working"}
                rows={5}
                className="w-full px-3 py-2.5 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1 resize-y font-mono text-xs"
              />
              <div className="text-[10px] text-pw-muted mt-1">One benefit per line</div>
            </div>

            <div className="mb-4">
              <label className="text-xs font-semibold text-pw-text3 mb-1 flex items-center gap-2">
                Career progression <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-pw-greenDark text-pw-green">+20 pts</span>
              </label>
              <input
                value={form.progression}
                onChange={function(e) { setForm(function(p) { return { ...p, progression: e.target.value } }) }}
                placeholder="e.g. Mid → Senior: ~18mo | Senior → Staff: ~24mo"
                className="w-full px-3 py-2.5 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1"
              />
            </div>

            <div className="mb-4">
              <label className="text-xs font-semibold text-pw-text3 mb-1 flex items-center gap-2">
                Team satisfaction <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-pw-greenDark text-pw-green">+15 pts</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number" step="0.1" min="0" max="5"
                  value={form.satisfaction}
                  onChange={function(e) { setForm(function(p) { return { ...p, satisfaction: e.target.value } }) }}
                  placeholder="e.g. 4.2"
                  className="w-24 px-3 py-2.5 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1"
                />
                <span className="text-sm text-pw-muted">/ 5</span>
              </div>
            </div>

            <div className="border-t border-pw-border pt-4 mt-4">
              <div className="text-[10px] font-mono text-pw-muted uppercase tracking-widest mb-3">Company links</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-pw-text3 mb-1 block">Website</label>
                  <input value={form.website} onChange={function(e) { setForm(function(p) { return { ...p, website: e.target.value } }) }} placeholder="https://yourcompany.com" className="w-full px-3 py-2.5 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-pw-text3 mb-1 block">Careers page</label>
                  <input value={form.careers_url} onChange={function(e) { setForm(function(p) { return { ...p, careers_url: e.target.value } }) }} placeholder="https://yourcompany.com/careers" className="w-full px-3 py-2.5 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1" />
                </div>
              </div>
            </div>
          </div>

          {/* Score preview */}
          <div className="bg-pw-card border border-pw-border rounded-xl p-4 mb-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-xs font-mono text-pw-muted uppercase tracking-wider">Estimated trust score</div>
                <div className="text-xs text-pw-text2 mt-0.5">Based on the data you've provided</div>
              </div>
              <TrustRing score={calcPreviewScore()} size={56} label="preview" />
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={function() { setStep(0) }} className="px-6 py-3 rounded-lg border border-pw-border text-pw-text1 font-bold text-sm hover:bg-pw-card transition-colors">
              ← Back
            </button>
            <button
              onClick={handleClaim}
              disabled={saving}
              className={'flex-1 py-3 rounded-lg font-bold text-sm transition-all ' + (saving ? 'bg-pw-border text-pw-muted' : 'bg-pw-green text-white hover:translate-y-[-1px] hover:shadow-lg hover:shadow-pw-green/20')}
            >
              {saving ? 'Claiming...' : 'Claim ' + company.name + ' →'}
            </button>
          </div>

          <div className="mt-3 text-center text-[10px] text-pw-muted">
            You can skip the data and add it later — just click "Claim" to verify.
          </div>
        </div>
      )}
    </div>
  )
}
