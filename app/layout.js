import './globals.css'
import { AuthProvider } from '@/lib/auth'
import Nav from '@/components/Nav'

export const metadata = {
  title: 'ShowJob — UK Jobs with Full Transparency',
  description: 'Every employer gets a transparency score. Real salaries, benefits, and progression — before you apply.',
  verification: {
    google: 'l5uUw6kpeSvN8gaSWZL1v4A94-wVKnb7T0RM1FgVbzA',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-pw-bg text-pw-text1 font-body">
        <AuthProvider>
          <Nav />
          <main>{children}</main>
          <footer className="max-w-3xl mx-auto px-6 py-8 mt-10 border-t border-pw-border flex justify-between items-center">
            <span className="font-display text-sm font-black">show<span className="text-pw-green">job</span></span>
            <span className="text-xs text-pw-muted font-mono">© 2026</span>
          </footer>
        </AuthProvider>
      </body>
    </html>
  )
}
