'use client'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'

export default function Nav() {
  const { user, profile, loading, signOut } = useAuth()

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 border-b border-pw-border bg-white/90 backdrop-blur-md">
      <div className="flex items-center gap-5">
        <Link href="/" className="font-display text-[22px] font-black tracking-tight text-pw-text1">
          proof<span className="text-pw-green">work</span>
        </Link>
        <div className="h-4 w-px bg-pw-border" />
        <Link href="/jobs" className="text-sm text-pw-text2 hover:text-pw-text1 transition-colors">Jobs</Link>
        {profile && (
          <Link href="/dashboard" className="text-sm text-pw-text2 hover:text-pw-text1 transition-colors">Dashboard</Link>
        )}
      </div>
      <div className="flex items-center gap-3">
        {loading ? (
          <div className="text-xs text-pw-muted">...</div>
        ) : user ? (
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-pw-text3">{profile?.full_name || user.email}</div>
              <div className="text-[10px] text-pw-muted font-mono capitalize">{profile?.role || 'user'}</div>
            </div>
            <Link href="/dashboard" className="px-3 py-1.5 rounded-md bg-pw-bg border border-pw-border text-xs font-semibold text-pw-text2 hover:text-pw-text1 transition-colors">
              Dashboard
            </Link>
            <button onClick={signOut} className="text-xs text-pw-muted hover:text-pw-text2 transition-colors">
              Sign out
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/login" className="px-3 py-1.5 rounded-md text-xs font-semibold text-pw-text2 hover:text-pw-text1 transition-colors">
              Log in
            </Link>
            <Link href="/signup" className="px-4 py-2 rounded-md bg-pw-green text-white text-xs font-bold hover:translate-y-[-1px] hover:shadow-lg hover:shadow-pw-green/20 transition-all">
              Sign up
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}
