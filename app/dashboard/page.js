'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'

export default function DashboardPage() {
  const router = useRouter()
  const { user, profile, loading } = useAuth()

  useEffect(() => {
    if (loading) return
    if (!user) { router.push('/login'); return }
    if (profile?.role === 'employer') router.push('/dashboard/employer')
    else router.push('/dashboard/candidate')
  }, [user, profile, loading, router])

  return (
    <div className="max-w-xl mx-auto px-6 py-20 text-center">
      <div className="text-pw-muted text-sm">Loading dashboard...</div>
    </div>
  )
}
