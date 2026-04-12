'use client'

export default function Error({ error, reset }) {
  return (
    <div className="max-w-md mx-auto px-6 py-20 text-center">
      <div className="font-mono text-4xl text-pw-border mb-4">⚠</div>
      <h1 className="font-display text-2xl font-black tracking-tight mb-2 text-pw-text1">Something went wrong</h1>
      <p className="text-sm text-pw-text2 mb-6">
        An unexpected error occurred. Please try again or go back to the homepage.
      </p>
      <div className="flex gap-3 justify-center flex-wrap">
        <button onClick={reset} className="px-6 py-2.5 rounded-lg bg-pw-green text-white font-bold text-sm hover:translate-y-[-1px] hover:shadow-lg hover:shadow-pw-green/20 transition-all">
          Try again
        </button>
        <a href="/" className="px-6 py-2.5 rounded-lg border border-pw-border text-pw-text1 font-bold text-sm hover:border-pw-green/30 hover:text-pw-green transition-all">
          Go home
        </a>
      </div>
    </div>
  )
}
