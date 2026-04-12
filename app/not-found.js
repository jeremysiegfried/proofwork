import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="max-w-md mx-auto px-6 py-20 text-center">
      <div className="font-mono text-6xl font-black text-pw-border mb-4">404</div>
      <h1 className="font-display text-2xl font-black tracking-tight mb-2 text-pw-text1">Page not found</h1>
      <p className="text-sm text-pw-text2 mb-6">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div className="flex gap-3 justify-center flex-wrap">
        <Link href="/" className="px-6 py-2.5 rounded-lg bg-pw-green text-white font-bold text-sm hover:translate-y-[-1px] hover:shadow-lg hover:shadow-pw-green/20 transition-all">
          Go home
        </Link>
        <Link href="/jobs" className="px-6 py-2.5 rounded-lg border border-pw-border text-pw-text1 font-bold text-sm hover:border-pw-green/30 hover:text-pw-green transition-all">
          Browse jobs
        </Link>
      </div>
    </div>
  )
}
