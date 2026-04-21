'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Suspense } from 'react'

function LoginForm() {
  var router = useRouter()
  var searchParams = useSearchParams()
  var [email, setEmail] = useState('')
  var [password, setPassword] = useState('')
  var [error, setError] = useState('')
  var [loading, setLoading] = useState(false)
  var [resetSent, setResetSent] = useState(false)
  var [showReset, setShowReset] = useState(false)

  var redirect = searchParams.get('redirect') || ''

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    var { data, error: authError } = await supabase.auth.signInWithPassword({ email: email, password: password })
    if (authError) {
      setError(authError.message)
      setLoading(false)
    } else {
      // Check role and redirect appropriately
      if (redirect) {
        router.push(redirect)
      } else {
        var { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
        if (profile?.role === 'employer') {
          router.push('/dashboard/employer')
        } else {
          router.push('/dashboard/candidate')
        }
      }
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault()
    if (!email) { setError('Enter your email address first'); return }
    setError('')
    setLoading(true)
    var { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/login'
    })
    if (resetError) {
      setError(resetError.message)
    } else {
      setResetSent(true)
    }
    setLoading(false)
  }

  if (resetSent) {
    return (
      <div className="max-w-sm mx-auto px-6 py-20 text-center">
        <div className="w-14 h-14 rounded-full bg-pw-green flex items-center justify-center mx-auto mb-4 text-xl text-black">✓</div>
        <h1 className="font-display text-2xl font-black mb-2">Check your email</h1>
        <p className="text-sm text-pw-text2 mb-6">We sent a password reset link to <strong className="text-pw-text1">{email}</strong>.</p>
        <button onClick={function() { setResetSent(false); setShowReset(false) }} className="text-pw-green font-semibold text-sm hover:underline">Back to login</button>
      </div>
    )
  }

  return (
    <div className="max-w-sm mx-auto px-6 py-20">
      <h1 className="font-display text-3xl font-black tracking-tight text-center mb-2">Welcome back</h1>
      <p className="text-sm text-pw-text2 text-center mb-8">{showReset ? 'Reset your password' : 'Log in to your ShowJob account'}</p>

      {showReset ? (
        <form onSubmit={handleResetPassword}>
          <div className="bg-pw-card border border-pw-border rounded-xl p-5">
            {error && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs">{error}</div>}
            <div className="mb-4">
              <label className="text-xs font-semibold text-pw-text3 mb-1 block">Email</label>
              <input type="email" value={email} onChange={function(e) { setEmail(e.target.value) }} placeholder="you@email.com" required className="w-full px-3 py-2.5 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1" />
            </div>
            <button type="submit" disabled={loading} className={'w-full py-3 rounded-lg font-bold text-sm transition-all ' + (loading ? 'bg-pw-border text-pw-muted' : 'bg-pw-green text-white hover:translate-y-[-1px] hover:shadow-lg hover:shadow-pw-green/20')}>
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleLogin}>
          <div className="bg-pw-card border border-pw-border rounded-xl p-5">
            {error && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs">{error}</div>}
            <div className="mb-3">
              <label className="text-xs font-semibold text-pw-text3 mb-1 block">Email</label>
              <input type="email" value={email} onChange={function(e) { setEmail(e.target.value) }} placeholder="you@email.com" required className="w-full px-3 py-2.5 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1" />
            </div>
            <div className="mb-4">
              <label className="text-xs font-semibold text-pw-text3 mb-1 flex justify-between">
                <span>Password</span>
                <button type="button" onClick={function() { setShowReset(true); setError('') }} className="text-pw-green font-normal hover:underline">Forgot password?</button>
              </label>
              <input type="password" value={password} onChange={function(e) { setPassword(e.target.value) }} placeholder="••••••••" required className="w-full px-3 py-2.5 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1" />
            </div>
            <button type="submit" disabled={loading} className={'w-full py-3 rounded-lg font-bold text-sm transition-all ' + (loading ? 'bg-pw-border text-pw-muted' : 'bg-pw-green text-white hover:translate-y-[-1px] hover:shadow-lg hover:shadow-pw-green/20')}>
              {loading ? 'Logging in...' : 'Log in'}
            </button>
          </div>
        </form>
      )}

      <p className="text-center text-sm text-pw-text2 mt-6">
        {showReset ? (
          <button onClick={function() { setShowReset(false); setError('') }} className="text-pw-green font-semibold hover:underline">Back to login</button>
        ) : (
          <>Don't have an account? <Link href={'/signup' + (redirect ? '?redirect=' + redirect : '')} className="text-pw-green font-semibold hover:underline">Sign up</Link></>
        )}
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="max-w-sm mx-auto px-6 py-20 text-center text-pw-muted text-sm">Loading...</div>}>
      <LoginForm />
    </Suspense>
  )
}
