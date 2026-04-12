'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [status, setStatus] = useState('confirming')
  const [error, setError] = useState('')

  useEffect(() => {
    async function handleCallback() {
      try {
        // Supabase handles the token exchange automatically from the URL hash
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) throw error

        if (session) {
          setStatus('confirmed')
        } else {
          // Try to exchange the token from URL
          const hashParams = new URLSearchParams(window.location.hash.substring(1))
          const accessToken = hashParams.get('access_token')
          const refreshToken = hashParams.get('refresh_token')

          if (accessToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            })
            if (sessionError) throw sessionError
            setStatus('confirmed')
          } else {
            setStatus('confirmed')
          }
        }
      } catch (err) {
        console.error('Auth callback error:', err)
        setError(err.message)
        setStatus('error')
      }
    }

    handleCallback()
  }, [])

  if (status === 'confirming') return (
    <div className="max-w-sm mx-auto px-6 py-20 text-center">
      <div className="w-12 h-12 rounded-full border-2 border-pw-green border-t-transparent animate-spin mx-auto mb-4" />
      <h1 className="font-display text-xl font-bold">Confirming your email...</h1>
      <p className="text-sm text-pw-text2 mt-2">Just a moment</p>
    </div>
  )

  if (status === 'error') return (
    <div className="max-w-sm mx-auto px-6 py-20 text-center">
      <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4 text-xl text-red-400">✗</div>
      <h1 className="font-display text-xl font-bold mb-2">Something went wrong</h1>
      <p className="text-sm text-pw-text2 mb-4">{error || 'Could not confirm your email. The link may have expired.'}</p>
      <Link href="/signup" className="text-pw-green font-semibold text-sm hover:underline">Try signing up again →</Link>
    </div>
  )

  return (
    <div className="max-w-sm mx-auto px-6 py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-pw-green flex items-center justify-center mx-auto mb-5 text-2xl text-black">✓</div>
      <h1 className="font-display text-3xl font-black tracking-tight mb-2">Email confirmed!</h1>
      <p className="text-sm text-pw-text2 mb-8">Your ShowJob account is ready. You can now log in and start using the platform.</p>
      <div className="flex gap-3">
        <Link href="/login" className="flex-1 py-3 rounded-lg bg-pw-green text-white font-bold text-sm text-center hover:translate-y-[-1px] hover:shadow-lg hover:shadow-pw-green/20 transition-all">
          Log in →
        </Link>
        <Link href="/jobs" className="flex-1 py-3 rounded-lg border border-pw-border text-pw-text1 font-bold text-sm text-center hover:bg-pw-card transition-colors">
          Browse jobs
        </Link>
      </div>
    </div>
  )
}
