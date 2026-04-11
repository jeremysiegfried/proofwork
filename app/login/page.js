'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else router.push('/dashboard')
  }

  return (
    <div className="max-w-sm mx-auto px-6 py-20">
      <h1 className="font-display text-3xl font-black tracking-tight text-center mb-2">Welcome back</h1>
      <p className="text-sm text-pw-text2 text-center mb-8">Log in to your ProofWork account</p>
      <form onSubmit={handleLogin}>
        <div className="bg-pw-card border border-pw-border rounded-xl p-5">
          {error && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs">{error}</div>}
          <div className="mb-3">
            <label className="text-xs font-semibold text-pw-text3 mb-1 block">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" required className="w-full px-3 py-2.5 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1" />
          </div>
          <div className="mb-4">
            <label className="text-xs font-semibold text-pw-text3 mb-1 block">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required className="w-full px-3 py-2.5 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1" />
          </div>
          <button type="submit" disabled={loading} className={`w-full py-3 rounded-lg font-bold text-sm transition-all ${loading ? 'bg-pw-border text-pw-muted' : 'bg-pw-green text-white hover:translate-y-[-1px] hover:shadow-lg hover:shadow-pw-green/20'}`}>
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </div>
      </form>
      <p className="text-center text-sm text-pw-text2 mt-6">
        Don't have an account? <Link href="/signup" className="text-pw-green font-semibold hover:underline">Sign up</Link>
      </p>
    </div>
  )
}
