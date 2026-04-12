import Link from 'next/link'

export const metadata = {
  title: 'Pricing — ShowJob',
  description: 'Transparent pricing for employers. Free to claim, paid to grow.',
}

function Check() {
  return <span className="text-pw-green">✓</span>
}
function Cross() {
  return <span className="text-pw-muted">—</span>
}

export default function PricingPage() {
  var tiers = [
    {
      name: 'Starter',
      price: 'Free',
      period: 'forever',
      description: 'Claim your listings and show candidates you\'re transparent.',
      cta: 'Get started',
      ctaHref: '/signup',
      highlight: false,
      features: [
        { label: 'Claim existing listings', has: true },
        { label: 'Edit salary, benefits, culture', has: true },
        { label: 'Public transparency score', has: true },
        { label: 'Company profile page', has: true },
        { label: 'Post new jobs', value: '1 active' },
        { label: 'View applicant count', has: true },
        { label: 'Applicant details & CV', has: false },
        { label: 'Applicant tracking pipeline', has: false },
        { label: 'AI skill assessments', has: false },
        { label: 'Candidate search', has: false },
        { label: 'Analytics & insights', has: false },
        { label: 'Priority placement', has: false },
      ]
    },
    {
      name: 'Growth',
      price: '£99',
      period: '/month',
      description: 'For growing teams. Post unlimited jobs, track every applicant.',
      cta: 'Start hiring',
      ctaHref: '/signup',
      highlight: true,
      features: [
        { label: 'Claim existing listings', has: true },
        { label: 'Edit salary, benefits, culture', has: true },
        { label: 'Public transparency score', has: true },
        { label: 'Company profile page', has: true },
        { label: 'Post new jobs', value: 'Unlimited' },
        { label: 'View applicant count', has: true },
        { label: 'Applicant details & CV', has: true },
        { label: 'Applicant tracking pipeline', has: true },
        { label: 'AI skill assessments', has: false },
        { label: 'Candidate search', has: false },
        { label: 'Analytics & insights', has: true },
        { label: 'Priority placement', has: false },
      ]
    },
    {
      name: 'Scale',
      price: '£499',
      period: '/month',
      description: 'For serious hiring. Pre-screened candidates with verified skill scores.',
      cta: 'Contact us',
      ctaHref: '/signup',
      highlight: false,
      features: [
        { label: 'Claim existing listings', has: true },
        { label: 'Edit salary, benefits, culture', has: true },
        { label: 'Public transparency score', has: true },
        { label: 'Company profile page', has: true },
        { label: 'Post new jobs', value: 'Unlimited' },
        { label: 'View applicant count', has: true },
        { label: 'Applicant details & CV', has: true },
        { label: 'Applicant tracking pipeline', has: true },
        { label: 'AI skill assessments', has: true },
        { label: 'Candidate search', has: true },
        { label: 'Analytics & insights', has: true },
        { label: 'Priority placement', has: true },
      ]
    }
  ]

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <p className="font-mono text-xs text-pw-green uppercase tracking-[3px] mb-3">Employer pricing</p>
        <h1 className="font-display text-4xl font-black tracking-tight mb-3 text-pw-text1">
          Hire better.<br />
          <span className="text-pw-green">Pay less than a recruiter.</span>
        </h1>
        <p className="text-pw-text2 text-base max-w-lg mx-auto leading-relaxed">
          The average UK recruiter charges £5,000–£15,000 per hire. ShowJob gives you pre-screened candidates with verified skills for a fraction of that.
        </p>
      </div>

      {/* Pricing cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
        {tiers.map(function(tier) {
          return (
            <div key={tier.name} className={'rounded-xl p-6 transition-all ' + (tier.highlight ? 'bg-white border-2 border-pw-green shadow-lg shadow-pw-green/10 relative' : 'bg-white border border-pw-border')}>
              {tier.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-pw-green text-white text-[10px] font-mono font-bold px-3 py-1 rounded-full uppercase tracking-wider">Most popular</span>
                </div>
              )}

              <div className="mb-5">
                <h2 className="font-display text-lg font-bold text-pw-text1 mb-1">{tier.name}</h2>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className={'font-display font-black tracking-tight ' + (tier.highlight ? 'text-3xl text-pw-green' : 'text-3xl text-pw-text1')}>{tier.price}</span>
                  <span className="text-sm text-pw-muted">{tier.period}</span>
                </div>
                <p className="text-sm text-pw-text2 leading-relaxed">{tier.description}</p>
              </div>

              <Link href={tier.ctaHref} className={'block w-full py-3 rounded-lg font-bold text-sm text-center transition-all mb-5 ' + (tier.highlight ? 'bg-pw-green text-white hover:translate-y-[-1px] hover:shadow-lg hover:shadow-pw-green/20' : 'bg-pw-bg border border-pw-border text-pw-text1 hover:border-pw-green/30 hover:text-pw-green')}>
                {tier.cta} →
              </Link>

              <div className="border-t border-pw-border pt-4">
                {tier.features.map(function(f) {
                  return (
                    <div key={f.label} className="flex items-center gap-2.5 py-1.5">
                      <div className="w-5 text-center text-xs shrink-0">
                        {f.value ? <span className="text-pw-green text-[10px] font-mono font-bold">{f.value === 'Unlimited' ? '∞' : f.value}</span> : f.has ? <Check /> : <Cross />}
                      </div>
                      <span className={'text-xs ' + (f.has || f.value ? 'text-pw-text3' : 'text-pw-muted')}>{f.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Cost comparison */}
      <div className="bg-white border border-pw-border rounded-xl p-6 mb-8">
        <h3 className="font-display text-lg font-bold text-pw-text1 mb-4 text-center">How ShowJob compares</h3>
        <div className="grid grid-cols-4 gap-3 text-center">
          <div></div>
          <div>
            <div className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mb-1">Recruiter</div>
            <div className="font-mono text-xl font-bold text-red-500">£8k+</div>
            <div className="text-[10px] text-pw-muted">per hire</div>
          </div>
          <div>
            <div className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mb-1">Indeed</div>
            <div className="font-mono text-xl font-bold text-pw-amber">£3k+</div>
            <div className="text-[10px] text-pw-muted">sponsored listings</div>
          </div>
          <div className="bg-pw-greenDark rounded-lg p-2 border border-pw-green/20">
            <div className="text-[10px] font-mono text-pw-green uppercase tracking-wider mb-1">ShowJob</div>
            <div className="font-mono text-xl font-bold text-pw-green">£99</div>
            <div className="text-[10px] text-pw-green">/month unlimited</div>
          </div>

          <div className="text-xs text-pw-text3 text-left py-2">CV screening</div>
          <div className="text-xs text-pw-muted py-2">Manual</div>
          <div className="text-xs text-pw-muted py-2">None</div>
          <div className="text-xs text-pw-green py-2 font-semibold bg-pw-greenDark rounded-lg">AI-powered</div>

          <div className="text-xs text-pw-text3 text-left py-2">Skill verification</div>
          <div className="text-xs text-pw-muted py-2">Interviews only</div>
          <div className="text-xs text-pw-muted py-2">None</div>
          <div className="text-xs text-pw-green py-2 font-semibold bg-pw-greenDark rounded-lg">AI assessments</div>

          <div className="text-xs text-pw-text3 text-left py-2">Candidate quality</div>
          <div className="text-xs text-pw-muted py-2">Varies</div>
          <div className="text-xs text-pw-muted py-2">Volume over quality</div>
          <div className="text-xs text-pw-green py-2 font-semibold bg-pw-greenDark rounded-lg">Pre-screened</div>

          <div className="text-xs text-pw-text3 text-left py-2">Transparency score</div>
          <div className="text-xs text-pw-muted py-2">—</div>
          <div className="text-xs text-pw-muted py-2">—</div>
          <div className="text-xs text-pw-green py-2 font-semibold bg-pw-greenDark rounded-lg">Public score</div>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-2xl mx-auto">
        <h3 className="font-display text-lg font-bold text-pw-text1 mb-4 text-center">Common questions</h3>
        <div className="flex flex-col gap-3">
          {[
            {
              q: 'What happens when I claim a listing?',
              a: 'Your scraped job listing gets a verified badge, your transparency score updates based on the data you provide, and candidates see you\'re a real employer who cares about transparency. It\'s free and takes 2 minutes.'
            },
            {
              q: 'Can I try before I pay?',
              a: 'Absolutely. The Starter plan is free forever. Claim your listings, add your company data, and see how candidates respond. Upgrade when you\'re ready to hire at scale.'
            },
            {
              q: 'What are AI skill assessments?',
              a: 'Role-specific challenges that candidates complete before their application reaches you. A developer might solve a coding task, a PM might do a case study. AI grades the submission and you see a verified skill score alongside every application — no more guessing from CVs.'
            },
            {
              q: 'How is this different from Indeed or LinkedIn?',
              a: 'They give you 200 CVs and let you figure it out. We give you 10 pre-screened candidates with verified skill scores, ranked by fit. Our transparency scores also mean candidates trust your listings more, so you get higher-quality applicants.'
            },
            {
              q: 'Can I cancel anytime?',
              a: 'Yes. No contracts, no lock-in. Cancel your subscription and you keep your claimed listings on the free plan.'
            },
          ].map(function(faq) {
            return (
              <div key={faq.q} className="bg-white border border-pw-border rounded-xl p-4">
                <h4 className="text-sm font-bold text-pw-text1 mb-1">{faq.q}</h4>
                <p className="text-xs text-pw-text2 leading-relaxed">{faq.a}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="text-center mt-12 mb-4">
        <h3 className="font-display text-2xl font-black tracking-tight text-pw-text1 mb-2">Ready to hire smarter?</h3>
        <p className="text-sm text-pw-text2 mb-5">Join employers who choose transparency over guesswork.</p>
        <Link href="/signup" className="inline-block px-8 py-3.5 rounded-lg bg-pw-green text-white font-extrabold text-sm hover:translate-y-[-1px] hover:shadow-lg hover:shadow-pw-green/20 transition-all">
          Create employer account →
        </Link>
      </div>
    </div>
  )
}
