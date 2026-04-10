import { supabase } from '@/lib/supabase'
import TrustRing from '@/components/TrustRing'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const revalidate = 300

export async function generateMetadata({ params }) {
  const { data: job } = await supabase
    .from('jobs')
    .select('title, salary_min, salary_max, location, description, companies(name)')
    .eq('slug', params.slug)
    .single()

  if (!job) return { title: 'Job not found — ProofWork' }
  const salary = job.salary_min > 0 ? ` — £${Math.round(job.salary_min/1000)}k–${Math.round(job.salary_max/1000)}k` : ''
  return {
    title: `${job.title} at ${job.companies?.name}${salary} | ProofWork`,
    description: `Apply for ${job.title} at ${job.companies?.name} in ${job.location}. ${job.salary_min > 0 ? `Salary: £${Math.round(job.salary_min/1000)}k–${Math.round(job.salary_max/1000)}k. ` : ''}Full transparency: salary, benefits, and employer trust score.`,
    openGraph: {
      title: `${job.title} at ${job.companies?.name}${salary}`,
      description: job.description?.substring(0, 160),
      type: 'website',
    },
  }
}

function TrustBar({ label, earned, max, has }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <div className="w-4 text-center text-xs">{has ? <span className="text-pw-green">✓</span> : <span className="text-red-500">✗</span>}</div>
      <div className="flex-1">
        <div className="flex justify-between mb-0.5">
          <span className={`text-[11px] ${has ? 'text-pw-text3' : 'text-pw-muted'}`}>{label}</span>
          <span className={`font-mono text-[10px] ${has ? 'text-pw-green' : 'text-pw-muted'}`}>{earned}/{max}</span>
        </div>
        <div className="h-[3px] rounded-full bg-pw-border overflow-hidden">
          <div className="h-full rounded-full bg-pw-green transition-all duration-700" style={{ width: `${(earned/max)*100}%` }} />
        </div>
      </div>
    </div>
  )
}

export default async function JobDetailPage({ params }) {
  const { data: job, error } = await supabase
    .from('jobs')
    .select('*, companies(*)')
    .eq('slug', params.slug)
    .single()

  if (error || !job) return notFound()

  const company = job.companies
  const claimed = company?.claimed || false
  const hasSalary = job.salary_min > 0
  const hasBenefits = company?.benefits?.length > 0
  const hasProg = company?.progression?.length > 0
  const hasSat = company?.satisfaction > 0

  // JSON-LD for Google Jobs
  const jsonLd = {
    '@context': 'https://schema.org/',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description,
    datePosted: job.posted_at || job.created_at,
    hiringOrganization: {
      '@type': 'Organization',
      name: company?.name,
      sameAs: company?.website || undefined,
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: job.location,
        addressCountry: 'GB',
      },
    },
    employmentType: job.job_type === 'Full-time' ? 'FULL_TIME' : job.job_type === 'Part-time' ? 'PART_TIME' : 'CONTRACTOR',
  }

  if (hasSalary) {
    jsonLd.baseSalary = {
      '@type': 'MonetaryAmount',
      currency: 'GBP',
      value: {
        '@type': 'QuantitativeValue',
        minValue: job.salary_min,
        maxValue: job.salary_max,
        unitText: 'YEAR',
      },
    }
  }

  if (job.remote_policy === 'Remote') {
    jsonLd.jobLocationType = 'TELECOMMUTE'
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Link href="/jobs" className="text-xs text-pw-muted hover:text-pw-text2 transition-colors mb-4 inline-block">← All jobs</Link>

      {/* Header */}
      <div className={`bg-pw-card border border-pw-border rounded-xl p-5 sm:p-6 mb-3 ${claimed ? 'border-l-[3px] border-l-pw-green' : 'border-l-[3px] border-l-pw-amber'}`}>
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-2xl font-black font-display tracking-tight">{job.title}</h1>
              {claimed ? (
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-pw-greenDark text-pw-green font-bold border border-pw-green/20">✓ VERIFIED</span>
              ) : (
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-pw-amberDark text-pw-amber font-semibold">UNCLAIMED</span>
              )}
            </div>
            <p className="text-sm text-pw-text2">{company?.name} · {job.location} · {job.remote_policy}</p>
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              {hasSalary ? (
                <span className="font-mono text-xl font-bold text-pw-green">£{Math.round(job.salary_min/1000)}k–{Math.round(job.salary_max/1000)}k</span>
              ) : job.salary_estimated ? (
                <span className="font-mono text-base text-pw-amber">Est. {job.salary_estimated} <span className="text-pw-muted text-xs">(unverified)</span></span>
              ) : null}
              {job.has_challenge && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-pw-greenDark text-pw-green font-bold border border-pw-green/20">⚡ Skill challenge</span>
              )}
            </div>
          </div>
          <TrustRing score={job.trust_score} size={64} label="trust" />
        </div>
      </div>

      {/* Unclaimed banner */}
      {!claimed && (
        <div className="bg-pw-amberDark border border-pw-amber/20 rounded-xl p-4 mb-3">
          <p className="text-sm text-pw-amber leading-relaxed">
            <strong>This listing was indexed from {company?.name || 'the'} career page.</strong> Salary, benefits, progression, and satisfaction data are not verified. The trust score reflects what's missing.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-3">
        {/* Main content */}
        <div>
          <div className="bg-pw-card border border-pw-border rounded-xl p-5">
            <p className="text-sm text-pw-text3 leading-relaxed mb-5">{job.description}</p>

            {job.requirements?.length > 0 && (
              <div className="mb-5">
                <h3 className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mb-2">Requirements</h3>
                {job.requirements.map((req, i) => (
                  <div key={i} className="text-sm text-pw-text3 py-1 flex gap-2">
                    <span className="text-pw-green">→</span>{req}
                  </div>
                ))}
              </div>
            )}

            {job.tags?.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                {job.tags.map((tag) => (
                  <span key={tag} className="px-2.5 py-1 rounded-md bg-pw-bg border border-pw-border text-pw-text3 text-xs font-mono">{tag}</span>
                ))}
              </div>
            )}
          </div>

          {/* Benefits - claimed only */}
          {claimed && hasBenefits && (
            <div className="bg-pw-card border border-pw-border rounded-xl p-5 mt-3">
              <h3 className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mb-3">Benefits</h3>
              <div className="grid grid-cols-2 gap-2">
                {company.benefits.map((b, i) => (
                  <div key={i} className="text-xs text-pw-text3 flex gap-2"><span className="text-pw-green">✓</span>{b}</div>
                ))}
              </div>
              {hasProg && (
                <div className="mt-3 p-3 bg-pw-bg rounded-md border border-pw-border">
                  <div className="text-[9px] font-mono text-pw-muted uppercase mb-0.5">Career progression</div>
                  <div className="text-sm text-pw-text1 font-semibold">{company.progression}</div>
                </div>
              )}
            </div>
          )}

          {/* Missing data - unclaimed */}
          {!claimed && (
            <div className="bg-pw-card border border-pw-border rounded-xl p-5 mt-3">
              <h3 className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mb-2">What's missing</h3>
              {['Verified salary range','Employee benefits','Career progression','Team satisfaction','Skill challenge'].map((item) => (
                <div key={item} className="text-xs text-pw-muted py-1 flex gap-2">
                  <span className="text-red-500">✗</span>{item} — not disclosed
                </div>
              ))}
            </div>
          )}

          {/* Company info */}
          {(company?.employee_count || company?.founded) && (
            <div className="bg-pw-card border border-pw-border rounded-xl p-5 mt-3">
              <h3 className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mb-2">
                Company data <span className="text-blue-500 text-[9px]">(auto-enriched)</span>
              </h3>
              {[
                { l: 'Employees', v: company.employee_count },
                { l: 'Founded', v: company.founded },
                { l: 'Funding', v: company.funding },
                { l: 'Glassdoor', v: company.glassdoor_rating > 0 ? `${company.glassdoor_rating}/5` : 'Not found' },
              ].filter(d => d.v).map((d) => (
                <div key={d.l} className="flex justify-between py-1.5 border-b border-pw-border last:border-0">
                  <span className="text-xs text-pw-muted">{d.l}</span>
                  <span className="text-xs text-pw-text1 font-semibold">{d.v}</span>
                </div>
              ))}
              {company.tech_stack?.length > 0 && (
                <div className="mt-3">
                  <div className="text-[9px] font-mono text-pw-muted uppercase mb-2">Tech stack</div>
                  <div className="flex gap-1.5 flex-wrap">
                    {company.tech_stack.map((t) => (
                      <span key={t} className="px-2.5 py-1 rounded-md bg-pw-bg border border-pw-border text-pw-text3 text-xs font-mono">{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div>
          <div className="bg-pw-card border border-pw-border rounded-xl p-4">
            <div className="text-center mb-3">
              <TrustRing score={job.trust_score} size={80} />
              <div className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mt-2">Transparency score</div>
            </div>
            <TrustBar label="Salary" earned={hasSalary ? 30 : 0} max={30} has={hasSalary} />
            <TrustBar label="Benefits" earned={hasBenefits ? 20 : 0} max={20} has={hasBenefits} />
            <TrustBar label="Progression" earned={hasProg ? 20 : 0} max={20} has={hasProg} />
            <TrustBar label="Satisfaction" earned={hasSat ? 15 : 0} max={15} has={hasSat} />
            <TrustBar label="Challenge" earned={job.has_challenge ? 15 : 0} max={15} has={job.has_challenge} />
          </div>

          <div className="mt-3">
            {claimed ? (
              <>
                <Link href={`/jobs/${job.slug}/apply`} className="block w-full py-3.5 rounded-lg bg-pw-green text-black font-extrabold text-sm text-center hover:translate-y-[-1px] hover:shadow-lg hover:shadow-pw-green/20 transition-all">
                  Apply via ProofWork →
                </Link>
                <div className="text-[10px] text-pw-muted text-center mt-2 font-mono">
                  Application tracked · avg response 3-5 days
                </div>
              </>
            ) : (
              <>
                {job.source_url ? (
                  <a href={job.source_url} target="_blank" rel="noopener noreferrer" className="block w-full py-3.5 rounded-lg bg-pw-amber text-black font-extrabold text-sm text-center hover:translate-y-[-1px] hover:shadow-lg hover:shadow-amber-500/20 transition-all">
                    Apply on {company?.name || 'company'} site →
                  </a>
                ) : (
                  <a href={company?.careers_url || company?.website || '#'} target="_blank" rel="noopener noreferrer" className="block w-full py-3.5 rounded-lg bg-pw-amber text-black font-extrabold text-sm text-center hover:translate-y-[-1px] hover:shadow-lg hover:shadow-amber-500/20 transition-all">
                    Visit {company?.name || 'company'} careers →
                  </a>
                )}
                <div className="text-[10px] text-pw-amber text-center mt-2 font-mono">
                  Redirects to employer's site · not tracked
                </div>
                <div className="mt-3 p-3 bg-pw-card border border-pw-border rounded-lg">
                  <div className="text-xs text-pw-text2 leading-relaxed">
                    <strong className="text-pw-text1">Want to apply through ProofWork?</strong> Ask {company?.name} to <span className="text-pw-green">claim this listing</span> for tracked applications and skill challenges.
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
