'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import TrustRing from '@/components/TrustRing'

export default function CompanySettingsPage() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [form, setForm] = useState({
    benefits: '',
    progression: '',
    satisfaction: '',
    website: '',
    careers_url: '',
  })

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push('/login'); return }
    if (profile?.role !== 'employer') { router.push('/dashboard'); return }
    loadCompany()
  }, [user, profile, authLoading])

  async function loadCompany() {
    if (!profile?.company_id) { setLoading(false); return }
    const { data } = await supabase.from('companies').select('*').eq('id', profile.company_id).single()
    if (data) {
      setCompany(data)
      setForm({
        benefits: (data.benefits || []).join('\n'),
        progression: data.progression || '',
        satisfaction: data.satisfaction ? String(data.satisfaction) : '',
        website: data.website || '',
        careers_url: data.careers_url || '',
      })
    }
    setLoading(false)
  }

  function calcScore() {
    let s = 0
    const hasBenefits = form.benefits.trim().length > 0
    const hasProg = form.progression.trim().length > 0
    const hasSat = parseFloat(form.satisfaction) > 0
    if (hasBenefits) s += 20
    if (hasProg) s += 20
    if (hasSat) s += 15
    // Salary and challenge points come from individual jobs
    return s
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)

    const benefits = form.benefits.split('\n').map(b => b.trim()).filter(b => b.length > 0)
    const satisfaction = parseFloat(form.satisfaction) || 0

    const { error } = await supabase.from('companies').update({
      benefits,
      progression: form.progression.trim(),
      satisfaction: Math.min(5, Math.max(0, satisfaction)),
      website: form.website.trim(),
      careers_url: form.careers_url.trim(),
      claimed: true,
      claimed_at: company?.claimed_at || new Date().toISOString(),
    }).eq('id', profile.company_id)

    if (!error) {
      // Recalculate trust scores for all company jobs
      const { data: jobs } = await supabase.from('jobs').select('id, salary_min, has_challenge').eq('company_id', profile.company_id)
      if (jobs) {
        for (const job of jobs) {
          let trust = 0
          if (job.salary_min > 0) trust += 30
          if (benefits.length > 0) trust += 20
          if (form.progression.trim()) trust += 20
          if (satisfaction > 0) trust += 15
          if (job.has_challenge) trust += 15
          await supabase.from('jobs').update({ trust_score: trust }).eq('id', job.id)
        }
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }

    setSaving(false)
  }

  if (authLoading || loading) return <div className="max-w-xl mx-auto px-6 py-20 text-center text-pw-muted text-sm">Loading...</div>

  if (!company) return (
    <div className="max-w-md mx-auto px-6 py-20 text-center">
      <h1 className="font-display text-xl font-bold mb-2">No company linked</h1>
      <p className="text-sm text-pw-text2">Your account isn't linked to a company yet.</p>
    </div>
  )

  const currentScore = calcScore()

  return (
    <div className="max-w-xl mx-auto px-6 py-6">
      <Link href="/dashboard/employer" className="text-xs text-pw-muted hover:text-pw-text2 mb-4 inline-block">← Dashboard</Link>

      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="font-display text-2xl font-black tracking-tight">
            {company.logo_emoji} {company.name}
          </h1>
          <p className="text-sm text-pw-text2 mt-1">Add transparency data to boost your trust score and attract more candidates.</p>
        </div>
        <TrustRing score={Math.min(100, currentScore + 30)} size={56} label="potential" />
      </div>

      {saved && (
        <div className="mb-4 p-3 rounded-lg bg-pw-greenDark border border-pw-green/20 text-pw-green text-xs font-semibold">
          ✓ Saved! Trust scores updated across all your listings.
        </div>
      )}

      <div className="bg-pw-card border border-pw-border rounded-xl p-5 mb-4">
        <div className="text-[10px] font-mono text-pw-green uppercase tracking-widest mb-4">Transparency data</div>

        <div className="mb-4">
          <label className="text-xs font-semibold text-pw-text3 mb-1 flex items-center gap-2">
            Benefits <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-pw-greenDark text-pw-green">+20 pts</span>
          </label>
          <textarea value={form.benefits} onChange={e => setForm(p => ({ ...p, benefits: e.target.value }))} placeholder={"25 days holiday\nEquity / stock options\nLearning budget\nPrivate healthcare\nFlexible working"} rows={5} className="w-full px-3 py-2.5 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1 resize-y font-mono text-xs" />
          <div className="text-[10px] text-pw-muted mt-1">One benefit per line</div>
        </div>

        <div className="mb-4">
          <label className="text-xs font-semibold text-pw-text3 mb-1 flex items-center gap-2">
            Career progression <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-pw-greenDark text-pw-green">+20 pts</span>
          </label>
          <input value={form.progression} onChange={e => setForm(p => ({ ...p, progression: e.target.value }))} placeholder="e.g. Mid → Senior: ~18mo | Senior → Staff: ~24mo" className="w-full px-3 py-2.5 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1" />
          <div className="text-[10px] text-pw-muted mt-1">Average promotion timelines at your company</div>
        </div>

        <div className="mb-4">
          <label className="text-xs font-semibold text-pw-text3 mb-1 flex items-center gap-2">
            Team satisfaction <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-pw-greenDark text-pw-green">+15 pts</span>
          </label>
          <div className="flex items-center gap-3">
            <input type="number" step="0.1" min="0" max="5" value={form.satisfaction} onChange={e => setForm(p => ({ ...p, satisfaction: e.target.value }))} placeholder="e.g. 4.5" className="w-24 px-3 py-2.5 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1" />
            <span className="text-sm text-pw-muted">/ 5</span>
          </div>
          <div className="text-[10px] text-pw-muted mt-1">From internal surveys, Glassdoor, or your own assessment</div>
        </div>

        <div className="border-t border-pw-border pt-4 mt-4">
          <div className="text-[10px] font-mono text-pw-muted uppercase tracking-widest mb-3">Company links</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-pw-text3 mb-1 block">Website</label>
              <input value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))} placeholder="https://yourcompany.com" className="w-full px-3 py-2.5 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1" />
            </div>
            <div>
              <label className="text-xs font-semibold text-pw-text3 mb-1 block">Careers page</label>
              <input value={form.careers_url} onChange={e => setForm(p => ({ ...p, careers_url: e.target.value }))} placeholder="https://yourcompany.com/careers" className="w-full px-3 py-2.5 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1" />
            </div>
          </div>
        </div>
      </div>

      {/* Score preview */}
      <div className="bg-pw-card border border-pw-border rounded-xl p-4 mb-4">
        <div className="text-xs font-mono text-pw-muted uppercase tracking-wider mb-2">Score impact preview</div>
        <div className="space-y-1.5">
          {[
            { l: 'Benefits', pts: 20, has: form.benefits.trim().length > 0 },
            { l: 'Progression', pts: 20, has: form.progression.trim().length > 0 },
            { l: 'Satisfaction', pts: 15, has: parseFloat(form.satisfaction) > 0 },
            { l: 'Salary (per job)', pts: 30, has: true, note: 'Set when posting' },
            { l: 'Challenge (per job)', pts: 15, has: false, note: 'Coming soon' },
          ].map(item => (
            <div key={item.l} className="flex items-center gap-2">
              <div className="w-4 text-center text-xs">{item.has ? <span className="text-pw-green">✓</span> : <span className="text-red-500">✗</span>}</div>
              <div className="flex-1 text-xs text-pw-text3">{item.l}</div>
              <div className={`font-mono text-[10px] ${item.has ? 'text-pw-green' : 'text-pw-muted'}`}>
                {item.has ? `+${item.pts}` : `+${item.pts}`}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all ${saving ? 'bg-pw-border text-pw-muted' : 'bg-pw-green text-white hover:translate-y-[-1px] hover:shadow-lg hover:shadow-pw-green/20'}`}>
        {saving ? 'Saving...' : 'Save & update trust scores'}
      </button>
    </div>
  )
}
