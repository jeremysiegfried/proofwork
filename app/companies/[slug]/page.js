import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import TrustRing from '@/components/TrustRing'
import { notFound } from 'next/navigation'

export const revalidate = 300

export async function generateMetadata({ params }) {
  var { data: company } = await supabase
    .from('companies')
    .select('name, claimed')
    .eq('slug', params.slug)
    .single()

  if (!company) return { title: 'Company not found — ShowJob' }
  return {
    title: company.name + ' Jobs & Transparency Score | ShowJob',
    description: 'See all ' + company.name + ' jobs with salary, benefits, and transparency data. ' + (company.claimed ? 'Verified employer.' : 'Unclaimed listing.'),
  }
}

export default async function CompanyPage({ params }) {
  var { data: company, error } = await supabase
    .from('companies')
    .select('*')
    .eq('slug', params.slug)
    .single()

  if (error || !company) return notFound()

  var { data: jobs } = await supabase
    .from('jobs')
    .select('id, title, slug, salary_min, salary_max, location, remote_policy, job_type, trust_score, has_challenge, posted_at')
    .eq('company_id', company.id)
    .eq('active', true)
    .order('trust_score', { ascending: false })

  jobs = jobs || []

  var claimed = company.claimed
  var hasBenefits = company.benefits && company.benefits.length > 0
  var hasProg = company.progression && company.progression.length > 0
  var hasSat = company.satisfaction > 0

  // Calculate average trust score
  var avgTrust = jobs.length > 0 ? Math.round(jobs.reduce(function(a, j) { return a + (j.trust_score || 0) }, 0) / jobs.length) : 0
  var jobsWithSalary = jobs.filter(function(j) { return j.salary_min > 0 }).length
  var salaryPct = jobs.length > 0 ? Math.round((jobsWithSalary / jobs.length) * 100) : 0

  return (
    <div className="max-w-4xl mx-auto px-6 py-6">
      <Link href="/jobs" className="text-xs text-pw-muted hover:text-pw-text2 transition-colors mb-4 inline-block">← All jobs</Link>

      {/* Company header */}
      <div className={'bg-pw-card border border-pw-border rounded-xl p-6 mb-4 ' + (claimed ? 'border-l-[3px] border-l-pw-green' : 'border-l-[3px] border-l-pw-amber')}>
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              {company.logo_emoji && <span className="text-3xl">{company.logo_emoji}</span>}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-display text-2xl font-black tracking-tight">{company.name}</h1>
                  {claimed ? (
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-pw-greenDark text-pw-greenText font-bold border border-pw-green/20">✓ VERIFIED EMPLOYER</span>
                  ) : (
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-pw-amberDark text-pw-amberText font-semibold">UNCLAIMED</span>
                  )}
                </div>
                <p className="text-sm text-pw-text2 mt-0.5">
                  {jobs.length} open role{jobs.length !== 1 ? 's' : ''}
                  {company.employee_count && (' · ' + company.employee_count + ' employees')}
                  {company.founded && (' · Founded ' + company.founded)}
                </p>
              </div>
            </div>

            {/* Stats row */}
            <div className="flex gap-4 mt-3 flex-wrap">
              <div className="bg-pw-bg rounded-lg px-3 py-2 border border-pw-border">
                <div className="font-mono text-lg font-bold text-pw-text1">{avgTrust}</div>
                <div className="text-[9px] font-mono text-pw-muted uppercase">Avg trust</div>
              </div>
              <div className="bg-pw-bg rounded-lg px-3 py-2 border border-pw-border">
                <div className="font-mono text-lg font-bold text-pw-text1">{jobs.length}</div>
                <div className="text-[9px] font-mono text-pw-muted uppercase">Open roles</div>
              </div>
              <div className="bg-pw-bg rounded-lg px-3 py-2 border border-pw-border">
                <div className="font-mono text-lg font-bold text-pw-text1">{salaryPct}%</div>
                <div className="text-[9px] font-mono text-pw-muted uppercase">Show salary</div>
              </div>
              {company.glassdoor_rating > 0 && (
                <div className="bg-pw-bg rounded-lg px-3 py-2 border border-pw-border">
                  <div className="font-mono text-lg font-bold text-pw-text1">{company.glassdoor_rating}/5</div>
                  <div className="text-[9px] font-mono text-pw-muted uppercase">Glassdoor</div>
                </div>
              )}
            </div>
          </div>
          <TrustRing score={avgTrust} size={72} label="transparency" />
        </div>
      </div>

      {/* Claim banner for unclaimed companies */}
      {!claimed && (
        <div className="bg-pw-amberDark border border-pw-amber/20 rounded-xl p-5 mb-4">
          <div className="flex justify-between items-center gap-4 flex-wrap">
            <div>
              <h3 className="font-display text-base font-bold text-pw-amberText mb-1">Is this your company?</h3>
              <p className="text-sm text-pw-text2 leading-relaxed">
                Claim {company.name} to verify your listings, add salary and benefits data, boost your transparency score, and attract better candidates.
              </p>
            </div>
            <Link href={'/companies/' + params.slug + '/claim'} className="px-5 py-2.5 rounded-lg bg-pw-green text-white font-bold text-sm hover:translate-y-[-1px] hover:shadow-lg hover:shadow-pw-green/20 transition-all whitespace-nowrap shrink-0">
              Claim {company.name} →
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-4">
        {/* Jobs list */}
        <div>
          <div className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mb-2">
            {jobs.length} open role{jobs.length !== 1 ? 's' : ''} at {company.name}
          </div>

          {jobs.length === 0 ? (
            <div className="bg-pw-card border border-pw-border rounded-xl p-8 text-center">
              <p className="text-sm text-pw-text2">No active jobs listed for {company.name}.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {jobs.map(function(job) {
                var hasSalary = job.salary_min > 0
                var isEstimate = hasSalary && job.salary_min === job.salary_max
                return (
                  <Link key={job.id} href={'/jobs/' + job.slug}>
                    <div className="bg-white border border-pw-border rounded-xl p-4 cursor-pointer transition-all hover:border-pw-green/40 hover:shadow-sm">
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-[15px] font-bold font-display tracking-tight text-pw-text1 mb-1">{job.title}</div>
                          <div className="text-xs text-pw-muted mb-1.5">
                            {job.location}
                            {job.remote_policy && job.remote_policy !== 'On-site' && (' · ' + job.remote_policy)}
                            {' · ' + (job.job_type || 'Full-time')}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {hasSalary && !isEstimate ? (
                              <span className="font-mono text-sm font-bold text-pw-green">£{Math.round(job.salary_min/1000)}k–£{Math.round(job.salary_max/1000)}k</span>
                            ) : hasSalary && isEstimate ? (
                              <span className="font-mono text-sm text-pw-amber">~£{Math.round(job.salary_min/1000)}k</span>
                            ) : (
                              <span className="font-mono text-xs text-pw-muted">Salary not disclosed</span>
                            )}
                            {job.has_challenge && (
                              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-pw-greenDark text-pw-greenText font-bold border border-pw-green/20">⚡ CHALLENGE</span>
                            )}
                          </div>
                        </div>
                        <TrustRing score={job.trust_score} size={40} />
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Sidebar - company info */}
        <div>
          {/* Transparency breakdown */}
          <div className="bg-pw-card border border-pw-border rounded-xl p-4 mb-3">
            <div className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mb-3">Transparency data</div>
            {[
              { label: 'Salary disclosed', has: salaryPct > 50, detail: salaryPct + '% of roles' },
              { label: 'Benefits listed', has: hasBenefits, detail: hasBenefits ? (company.benefits.length + ' benefits') : 'Not shared' },
              { label: 'Progression info', has: hasProg, detail: hasProg ? company.progression : 'Not shared' },
              { label: 'Team satisfaction', has: hasSat, detail: hasSat ? (company.satisfaction + '/5') : 'Not shared' },
            ].map(function(item) {
              return (
                <div key={item.label} className="flex items-center gap-2 py-1.5 border-b border-pw-border last:border-0">
                  <div className="w-4 text-center text-xs">{item.has ? <span className="text-pw-green">✓</span> : <span className="text-red-500">✗</span>}</div>
                  <div className="flex-1">
                    <div className={'text-xs ' + (item.has ? 'text-pw-text3' : 'text-pw-muted')}>{item.label}</div>
                    <div className={'text-[10px] font-mono ' + (item.has ? 'text-pw-green' : 'text-pw-muted')}>{item.detail}</div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Benefits */}
          {hasBenefits && (
            <div className="bg-pw-card border border-pw-border rounded-xl p-4 mb-3">
              <div className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mb-2">Benefits</div>
              {company.benefits.map(function(b, i) {
                return <div key={i} className="text-xs text-pw-text3 py-1 flex gap-2"><span className="text-pw-green">✓</span>{b}</div>
              })}
            </div>
          )}

          {/* Company details */}
          <div className="bg-pw-card border border-pw-border rounded-xl p-4 mb-3">
            <div className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mb-2">Company info</div>
            {[
              { l: 'Website', v: company.website, link: true },
              { l: 'Careers', v: company.careers_url, link: true },
              { l: 'Employees', v: company.employee_count },
              { l: 'Founded', v: company.founded },
              { l: 'Funding', v: company.funding },
            ].filter(function(d) { return d.v }).map(function(d) {
              return (
                <div key={d.l} className="flex justify-between py-1.5 border-b border-pw-border last:border-0">
                  <span className="text-xs text-pw-muted">{d.l}</span>
                  {d.link ? (
                    <a href={d.v} target="_blank" rel="noopener noreferrer" className="text-xs text-pw-green font-semibold hover:underline truncate max-w-[160px]">{d.v.replace(/^https?:\/\/(www\.)?/, '')}</a>
                  ) : (
                    <span className="text-xs text-pw-text1 font-semibold">{d.v}</span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Tech stack */}
          {company.tech_stack && company.tech_stack.length > 0 && (
            <div className="bg-pw-card border border-pw-border rounded-xl p-4 mb-3">
              <div className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mb-2">Tech stack</div>
              <div className="flex gap-1.5 flex-wrap">
                {company.tech_stack.map(function(t) {
                  return <span key={t} className="px-2.5 py-1 rounded-md bg-pw-bg border border-pw-border text-pw-text3 text-xs font-mono">{t}</span>
                })}
              </div>
            </div>
          )}

          {/* Claim CTA in sidebar */}
          {!claimed && (
            <Link href={'/companies/' + params.slug + '/claim'} className="block w-full py-3 rounded-lg bg-pw-green text-white font-bold text-sm text-center hover:translate-y-[-1px] hover:shadow-lg hover:shadow-pw-green/20 transition-all">
              Claim this company →
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
