import './globals.css'

export const metadata = {
  title: 'ProofWork — UK Jobs with Full Transparency',
  description: 'Every employer shows salary, benefits, and progression. Apply with proof of skill.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-pw-bg text-pw-text1 font-body">
        <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 border-b border-pw-border bg-pw-bg/90 backdrop-blur-md">
          <div className="flex items-center gap-5">
            <a href="/" className="font-display text-[22px] font-black tracking-tight">
              proof<span className="text-pw-green">work</span>
            </a>
            <div className="h-4 w-px bg-pw-border" />
            <a href="/jobs" className="text-sm text-pw-text2 hover:text-pw-text1 transition-colors">Jobs</a>
          </div>
          <a href="/jobs" className="px-4 py-2 rounded-md bg-pw-green text-black text-xs font-bold hover:translate-y-[-1px] hover:shadow-lg hover:shadow-pw-green/20 transition-all">
            Find work
          </a>
        </nav>
        <main>{children}</main>
        <footer className="max-w-3xl mx-auto px-6 py-8 mt-10 border-t border-pw-border flex justify-between items-center">
          <span className="font-display text-sm font-black">proof<span className="text-pw-green">work</span></span>
          <span className="text-xs text-pw-muted font-mono">Built in Liverpool</span>
        </footer>
      </body>
    </html>
  )
}
