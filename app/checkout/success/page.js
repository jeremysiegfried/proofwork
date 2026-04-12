import Link from 'next/link'

export var metadata = {
  title: 'Welcome to ShowJob — Subscription Active',
}

export default function CheckoutSuccessPage() {
  return (
    <div className="max-w-md mx-auto px-6 py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-pw-green flex items-center justify-center mx-auto mb-5 text-2xl text-black">✓</div>
      <h1 className="font-display text-3xl font-black tracking-tight mb-2">You're all set!</h1>
      <p className="text-sm text-pw-text2 mb-6">
        Your subscription is active. You now have access to all premium features including unlimited job postings, applicant tracking, and analytics.
      </p>

      <div className="bg-pw-card border border-pw-border rounded-xl p-5 mb-6 text-left">
        <div className="text-[10px] font-mono text-pw-green uppercase tracking-wider mb-3">What to do next</div>
        <div className="flex flex-col gap-2.5 text-sm text-pw-text3">
          <div className="flex gap-2"><span className="text-pw-green font-bold">1.</span> Complete your company profile to boost your transparency score</div>
          <div className="flex gap-2"><span className="text-pw-green font-bold">2.</span> Post your first job or claim existing listings</div>
          <div className="flex gap-2"><span className="text-pw-green font-bold">3.</span> Enable skill assessments on your jobs for pre-screened candidates</div>
          <div className="flex gap-2"><span className="text-pw-green font-bold">4.</span> Watch applications roll in from matched candidates</div>
        </div>
      </div>

      <div className="flex gap-3">
        <Link href="/dashboard/employer" className="flex-1 py-3 rounded-lg bg-pw-green text-white font-bold text-sm text-center hover:translate-y-[-1px] hover:shadow-lg hover:shadow-pw-green/20 transition-all">
          Go to dashboard →
        </Link>
        <Link href="/dashboard/employer/post" className="flex-1 py-3 rounded-lg border border-pw-border text-pw-text1 font-bold text-sm text-center hover:bg-pw-card transition-colors">
          Post a job
        </Link>
      </div>
    </div>
  )
}
