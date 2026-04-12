import './globals.css'
import { AuthProvider } from '@/lib/auth'
import Nav from '@/components/Nav'
import Link from 'next/link'

export var metadata = {
  title: 'ShowJob — UK Jobs with Full Transparency & Skill Verification',
  description: 'Upload your CV, get matched to jobs by fit, prove your skills with AI assessments. Every employer scored on transparency. 10,000+ UK jobs.',
  verification: {
    google: 'l5uUw6kpeSvN8gaSWZL1v4A94-wVKnb7T0RM1FgVbzA',
  },
  openGraph: {
    title: 'ShowJob — UK Jobs with Full Transparency',
    description: 'The UK\'s first skill-verified hiring platform. Every employer scored on what they disclose.',
    type: 'website',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-pw-bg text-pw-text1 font-body">
        <AuthProvider>
          <Nav />
          <main className="min-h-[60vh]">{children}</main>
          <footer className="border-t border-pw-border bg-white mt-16">
            <div className="max-w-5xl mx-auto px-6 py-10">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-8">
                <div>
                  <div className="font-display text-lg font-black tracking-tight mb-3">
                    show<span className="text-pw-green">job</span>
                  </div>
                  <p className="text-xs text-pw-muted leading-relaxed">
                    The UK's first skill-verified hiring platform. Every employer scored on transparency.
                  </p>
                </div>
                <div>
                  <div className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mb-3">For candidates</div>
                  <div className="flex flex-col gap-1.5">
                    <Link href="/jobs" className="text-xs text-pw-text2 hover:text-pw-green transition-colors">Browse jobs</Link>
                    <Link href="/candidate" className="text-xs text-pw-text2 hover:text-pw-green transition-colors">Upload CV</Link>
                    <Link href="/salaries" className="text-xs text-pw-text2 hover:text-pw-green transition-colors">Salary data</Link>
                    <Link href="/leaderboard" className="text-xs text-pw-text2 hover:text-pw-green transition-colors">Employer rankings</Link>
                    <Link href="/signup" className="text-xs text-pw-text2 hover:text-pw-green transition-colors">Create account</Link>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mb-3">For employers</div>
                  <div className="flex flex-col gap-1.5">
                    <Link href="/pricing" className="text-xs text-pw-text2 hover:text-pw-green transition-colors">Pricing</Link>
                    <Link href="/companies" className="text-xs text-pw-text2 hover:text-pw-green transition-colors">Browse companies</Link>
                    <Link href="/signup" className="text-xs text-pw-text2 hover:text-pw-green transition-colors">Claim your company</Link>
                    <Link href="/leaderboard" className="text-xs text-pw-text2 hover:text-pw-green transition-colors">Transparency rankings</Link>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mb-3">Platform</div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs text-pw-muted">10,000+ UK jobs</span>
                    <span className="text-xs text-pw-muted">4,700+ companies scored</span>
                    <span className="text-xs text-pw-muted">AI skill assessments</span>
                    <span className="text-xs text-pw-muted">Built in Liverpool 🇬🇧</span>
                  </div>
                </div>
              </div>
              <div className="border-t border-pw-border pt-4 flex justify-between items-center flex-wrap gap-2">
                <span className="text-[10px] text-pw-muted font-mono">© 2026 ShowJob. All rights reserved.</span>
                <div className="flex gap-4">
                  <Link href="/jobs" className="text-[10px] text-pw-muted font-mono hover:text-pw-green transition-colors">Jobs</Link>
                  <Link href="/companies" className="text-[10px] text-pw-muted font-mono hover:text-pw-green transition-colors">Companies</Link>
                  <Link href="/salaries" className="text-[10px] text-pw-muted font-mono hover:text-pw-green transition-colors">Salaries</Link>
                </div>
              </div>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  )
}
