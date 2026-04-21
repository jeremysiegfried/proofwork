'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'

export default function DashboardRedirect() {
  var router = useRouter()
  var { user, profile, loading } = useAuth()

  useEffect(function() {
    if (loading) return
    if (!user) { router.push('/login'); return }
    if (profile?.role === 'employer') {
      router.push('/dashboard/employer')
    } else {
      router.push('/dashboard/candidate')
    }
  }, [user, profile, loading])

  return (
    <div className="max-w-sm mx-auto px-6 py-20 text-center text-pw-muted text-sm">
      Redirecting to your dashboard...
    </div>
  )
}
