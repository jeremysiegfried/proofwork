'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Suspense } from 'react'

function SignupForm() {
  var router = useRouter()
  var searchParams = useSearchParams()
  var [role, setRole] = useState('')
  var [fullName, setFullName] = useState('')
  var [email, setEmail] = useState('')
  var [password, setPassword] = useState('')
  var [companyName, setCompanyName] = useState('')
  var [error, setError] = useState('')
  var [loading, setLoading] = useState(false)
  var [success, setSuccess] = useState(false)

  var redirect = searchParams.get('redirect') || ''

  async function handleSignup(e) {
    e.preventDefault()
    if (!role) { setError('Please select whether you are a candidate or employer'); return }
    setError('')
    setLoading(true)

    try {
      var { data, error: signupError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: { data: { full_name: fullName } }
      })

      if (signupError) throw signupError

      if (data.user) {
        await supabase.from('profiles').update({ role: role, full_name: fullName }).eq('id', data.user.id)

        if (role === 'employer' && companyName.trim()) {
          var slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
          var { data: existing } = await supabase.from('companies').select('id').eq('slug', slug).single()

          if (existing) {
            await supabase.from('companies').update({ claimed: true, claimed_at: new Date().toISOString(), claimed_by: email }).eq('id', existing.id)
            await supabase.from('profiles').update({ company_id: existing.id }).eq('id', data.user.id)
          } else {
            var { data: newCo } = await supabase.from('companies').insert({
              name: companyName.trim(), slug: slug, claimed: true, claimed_at: new Date().toISOString(), claimed_by: email
            }).select().single()
            if (newCo) {
              await supabase.from('profiles').update({ company_id: newCo.id }).eq('id', data.user.id)
            }
          }
        }

        setSuccess(true)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) return (
    <div className="max-w-sm mx-auto px-6 py-20 text-center">
      <div className="w-14 h-14 rounded-full bg-pw-green flex items-center justify-center mx-auto mb-4 text-xl text-black">✓</div>
      <h1 className="font-display text-2xl font-black mb-2">Check your email</h1>
      <p className="text-sm text-pw-text2 mb-6">We sent a confirmation link to <strong className="text-pw-text1">{email}</strong>. Click it to activate your account.</p>
      <Link href={'/login' + (redirect ? '?redirect=' + redirect : '')} className="text-pw-green font-semibold text-sm hover:underline">Go to login →</Link>
    </div>
  )

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <h1 className="font-display text-3xl font-black tracking-tight text-center mb-2">Join ShowJob</h1>
      <p className="text-sm text-pw-text2 text-center mb-8">Create your account to get started</p>

      {!role ? (
        <div>
          <p className="text-xs font-mono text-pw-muted uppercase tracking-wider text-center mb-4">I am a...</p>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={function() { setRole('candidate') }} className="bg-pw-card border border-pw-border rounded-xl p-6 text-center hover:border-pw-green/40 transition-all">
              <div className="text-3xl mb-3">👤</div>
              <div className="font-bold text-sm mb-1">Candidate</div>
              <div className="text-xs text-pw-text2">Looking for work. Apply for jobs and prove your skills.</div>
            </button>
            <button onClick={function() { setRole('employer') }} className="bg-pw-card border border-pw-border rounded-xl p-6 text-center hover:border-pw-green/40 transition-all">
              <div className="text-3xl mb-3">🏢</div>
              <div className="font-bold text-sm mb-1">Employer</div>
              <div className="text-xs text-pw-text2">Hiring? Post jobs, claim listings, review candidates.</div>
            </button>
          </div>
          <p className="text-center text-sm text-pw-text2 mt-6">
            Already have an account? <Link href={'/login' + (redirect ? '?redirect=' + redirect : '')} className="text-pw-green font-semibold hover:underline">Log in</Link>
          </p>
        </div>
      ) : (
        <form onSubmit={handleSignup}>
          <div className="bg-pw-card border border-pw-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[10px] font-mono text-pw-green uppercase tracking-widest">
                {role === 'candidate' ? '👤 Candidate' : '🏢 Employer'} account
              </div>
              <button type="button" onClick={function() { setRole('') }} className="text-xs text-pw-muted hover:text-pw-text2">Change</button>
            </div>

            {error && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs">{error}</div>}

            <div className="mb-3">
              <label className="text-xs font-semibold text-pw-text3 mb-1 block">Full name</label>
              <input value={fullName} onChange={function(e) { setFullName(e.target.value) }} placeholder="Your full name" required className="w-full px-3 py-2.5 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1" />
            </div>

            <div className="mb-3">
              <label className="text-xs font-semibold text-pw-text3 mb-1 block">Email</label>
              <input type="email" value={email} onChange={function(e) { setEmail(e.target.value) }} placeholder="you@email.com" required className="w-full px-3 py-2.5 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1" />
            </div>

            <div className="mb-3">
              <label className="text-xs font-semibold text-pw-text3 mb-1 block">Password</label>
              <input type="password" value={password} onChange={function(e) { setPassword(e.target.value) }} placeholder="Min 6 characters" required minLength={6} className="w-full px-3 py-2.5 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1" />
            </div>

            {role === 'employer' && (
              <div className="mb-3">
                <label className="text-xs font-semibold text-pw-text3 mb-1 block">Company name</label>
                <input value={companyName} onChange={function(e) { setCompanyName(e.target.value) }} placeholder="e.g. Monzo, Octopus Energy" required className="w-full px-3 py-2.5 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1" />
                <div className="text-[10px] text-pw-muted mt-1">If your company already has listings, signing up will claim them automatically.</div>
              </div>
            )}

            <button type="submit" disabled={loading} className={'w-full py-3 rounded-lg font-bold text-sm transition-all mt-2 ' + (loading ? 'bg-pw-border text-pw-muted' : 'bg-pw-green text-white hover:translate-y-[-1px] hover:shadow-lg hover:shadow-pw-green/20')}>
              {loading ? 'Creating account...' : 'Create account'}
            </button>

            <p className="text-center text-[10px] text-pw-muted mt-3">
              By signing up, you agree to our <Link href="/terms" className="text-pw-green hover:underline">Terms</Link> and <Link href="/privacy" className="text-pw-green hover:underline">Privacy Policy</Link>.
            </p>
          </div>
        </form>
      )}
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto px-6 py-20 text-center text-pw-muted text-sm">Loading...</div>}>
      <SignupForm />
    </Suspense>
  )
}
