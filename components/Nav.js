'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'

export default function Nav() {
  var { user, profile, loading, signOut } = useAuth()
  var [mobileOpen, setMobileOpen] = useState(false)

  function closeMobile() { setMobileOpen(false) }

  return (
    <nav className="sticky top-0 z-50 border-b border-pw-border bg-white/90 backdrop-blur-md">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-5">
          <Link href="/" className="font-display text-[22px] font-black tracking-tight text-pw-text1" onClick={closeMobile}>
            show<span className="text-pw-green">job</span>
          </Link>
          <div className="hidden md:flex items-center gap-5">
            <div className="h-4 w-px bg-pw-border" />
            <Link href="/jobs" className="text-sm text-pw-text2 hover:text-pw-text1 transition-colors">Jobs</Link>
            <Link href="/salaries" className="text-sm text-pw-text2 hover:text-pw-text1 transition-colors">Salaries</Link>
            <Link href="/leaderboard" className="text-sm text-pw-text2 hover:text-pw-text1 transition-colors">Rankings</Link>
            {user && (
              <>
                <Link href="/candidate" className="text-sm text-pw-text2 hover:text-pw-text1 transition-colors">My CV</Link>
                <Link href="/candidate/matches" className="text-sm text-pw-text2 hover:text-pw-text1 transition-colors">Matches</Link>
              </>
            )}
            {profile?.role === 'employer' && (
              <Link href="/dashboard/employer" className="text-sm text-pw-text2 hover:text-pw-text1 transition-colors">Dashboard</Link>
            )}
            <Link href="/pricing" className="text-sm text-pw-text2 hover:text-pw-text1 transition-colors">Pricing</Link>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3">
          {loading ? (
            <div className="text-xs text-pw-muted">...</div>
          ) : user ? (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs font-semibold text-pw-text3">{profile?.full_name || user.email}</div>
                <div className="text-[10px] text-pw-muted font-mono capitalize">{profile?.role || 'candidate'}</div>
              </div>
              <button onClick={signOut} className="text-xs text-pw-muted hover:text-pw-text2 transition-colors">
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="px-3 py-1.5 rounded-md text-xs font-semibold text-pw-text2 hover:text-pw-text1 transition-colors">Log in</Link>
              <Link href="/signup" className="px-4 py-2 rounded-md bg-pw-green text-white text-xs font-bold hover:translate-y-[-1px] hover:shadow-lg hover:shadow-pw-green/20 transition-all">Sign up</Link>
            </div>
          )}
        </div>

        <button onClick={function() { setMobileOpen(!mobileOpen) }} className="md:hidden flex flex-col gap-1 p-2">
          <span className={'block w-5 h-0.5 bg-pw-text1 transition-all ' + (mobileOpen ? 'rotate-45 translate-y-[6px]' : '')} />
          <span className={'block w-5 h-0.5 bg-pw-text1 transition-all ' + (mobileOpen ? 'opacity-0' : '')} />
          <span className={'block w-5 h-0.5 bg-pw-text1 transition-all ' + (mobileOpen ? '-rotate-45 -translate-y-[6px]' : '')} />
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-pw-border bg-white px-6 py-4">
          <div className="flex flex-col gap-3">
            <Link href="/jobs" className="text-sm text-pw-text2 hover:text-pw-text1 py-1" onClick={closeMobile}>Jobs</Link>
            <Link href="/salaries" className="text-sm text-pw-text2 hover:text-pw-text1 py-1" onClick={closeMobile}>Salaries</Link>
            <Link href="/leaderboard" className="text-sm text-pw-text2 hover:text-pw-text1 py-1" onClick={closeMobile}>Rankings</Link>
            <Link href="/pricing" className="text-sm text-pw-text2 hover:text-pw-text1 py-1" onClick={closeMobile}>Pricing</Link>
            {user && (
              <>
                <div className="h-px bg-pw-border my-1" />
                <Link href="/candidate" className="text-sm text-pw-text2 hover:text-pw-text1 py-1" onClick={closeMobile}>My CV</Link>
                <Link href="/candidate/matches" className="text-sm text-pw-text2 hover:text-pw-text1 py-1" onClick={closeMobile}>My Matches</Link>
                {profile?.role === 'employer' && (
                  <Link href="/dashboard/employer" className="text-sm text-pw-text2 hover:text-pw-text1 py-1" onClick={closeMobile}>Dashboard</Link>
                )}
              </>
            )}
            <div className="h-px bg-pw-border my-1" />
            {loading ? null : user ? (
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-pw-text3">{profile?.full_name || user.email}</div>
                  <div className="text-[10px] text-pw-muted font-mono capitalize">{profile?.role || 'candidate'}</div>
                </div>
                <button onClick={function() { signOut(); closeMobile() }} className="text-xs text-pw-muted hover:text-pw-text2">Sign out</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Link href="/login" className="flex-1 py-2.5 rounded-lg border border-pw-border text-pw-text1 font-bold text-sm text-center" onClick={closeMobile}>Log in</Link>
                <Link href="/signup" className="flex-1 py-2.5 rounded-lg bg-pw-green text-white font-bold text-sm text-center" onClick={closeMobile}>Sign up</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
