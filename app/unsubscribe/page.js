'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

function UnsubscribeForm() {
  var searchParams = useSearchParams()
  var alertId = searchParams.get('id')
  var [status, setStatus] = useState('loading')

  useEffect(function() {
    if (!alertId) { setStatus('invalid'); return }

    supabase.from('job_alerts').update({ active: false }).eq('id', alertId)
      .then(function(result) {
        if (result.error) setStatus('error')
        else setStatus('done')
      })
  }, [alertId])

  if (status === 'loading') {
    return <div className="text-sm text-pw-muted">Unsubscribing...</div>
  }

  if (status === 'invalid') {
    return (
      <div>
        <h1 className="font-display text-2xl font-black mb-2">Invalid link</h1>
        <p className="text-sm text-pw-text2">This unsubscribe link appears to be invalid.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="w-14 h-14 rounded-full bg-pw-green flex items-center justify-center mx-auto mb-4 text-xl text-black">✓</div>
      <h1 className="font-display text-2xl font-black mb-2">Unsubscribed</h1>
      <p className="text-sm text-pw-text2 mb-6">You won't receive this job alert anymore.</p>
      <Link href="/jobs" className="text-pw-green font-semibold text-sm hover:underline">Browse jobs →</Link>
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <div className="max-w-sm mx-auto px-6 py-20 text-center">
      <Suspense fallback={<div className="text-sm text-pw-muted">Loading...</div>}>
        <UnsubscribeForm />
      </Suspense>
    </div>
  )
}
