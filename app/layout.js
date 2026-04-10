import './globals.css'
import { AuthProvider } from '@/lib/auth'
import Nav from '@/components/Nav'

export const metadata = {
  title: 'ProofWork — UK Jobs with Full Transparency',
  description: 'Every employer shows salary, benefits, and progression. Apply with proof of skill.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-pw-bg text-pw-text1 font-body">
        <AuthProvider>
          <Nav />
          <main>{children}</main>
          <footer className="max-w-3xl mx-auto px-6 py-8 mt-10 border-t border-pw-border flex justify-between items-center">
            <span className="font-display text-sm font-black">proof<span className="text-pw-green">work</span></span>
            <span className="text-xs text-pw-muted font-mono">Built in Liverpool</span>
          </footer>
        </AuthProvider>
      </body>
    </html>
  )
}
