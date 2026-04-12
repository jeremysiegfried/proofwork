'use client'
import { useState } from 'react'
import { useAuth } from '@/lib/auth'

export default function CheckoutButton({ plan, label, highlight }) {
  var { user, profile } = useAuth()
  var [loading, setLoading] = useState(false)

  async function handleCheckout() {
    if (!user) {
      window.location.href = '/signup'
      return
    }

    setLoading(true)
    try {
      var res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: plan,
          email: user.email,
          companyId: profile?.company_id || '',
        })
      })

      var data = await res.json()

      if (data.url) {
        window.location.href = data.url
      } else if (data.error === 'Stripe not configured') {
        alert('Payment system is being set up. Contact us to subscribe: hello@showjob.co.uk')
      } else {
        alert(data.error || 'Something went wrong')
      }
    } catch (err) {
      alert('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (plan === 'free') {
    return (
      <a href={user ? '/dashboard/employer' : '/signup'}
        className="block w-full py-3 rounded-lg font-bold text-sm text-center transition-all bg-pw-bg border border-pw-border text-pw-text1 hover:border-pw-green/30 hover:text-pw-green">
        {label || 'Get started'} →
      </a>
    )
  }

  return (
    <button
      onClick={handleCheckout}
      disabled={loading}
      className={'block w-full py-3 rounded-lg font-bold text-sm text-center transition-all ' +
        (loading ? 'bg-pw-border text-pw-muted cursor-wait' :
         highlight ? 'bg-pw-green text-white hover:translate-y-[-1px] hover:shadow-lg hover:shadow-pw-green/20' :
         'bg-pw-bg border border-pw-border text-pw-text1 hover:border-pw-green/30 hover:text-pw-green')
      }
    >
      {loading ? 'Redirecting to checkout...' : (label || 'Subscribe') + ' →'}
    </button>
  )
}
