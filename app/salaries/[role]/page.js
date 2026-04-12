import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import TrustRing from '@/components/TrustRing'
import { notFound } from 'next/navigation'

export const revalidate = 3600

var ROLES = {
  'software-engineer': { label: 'Software Engineer', keywords: ['software engineer', 'software developer'] },
  'data-scientist': { label: 'Data Scientist', keywords: ['data scientist'] },
  'data-engineer': { label: 'Data Engineer', keywords: ['data engineer'] },
  'data-analyst': { label: 'Data Analyst', keywords: ['data analyst'] },
  'product-manager': { label: 'Product Manager', keywords: ['product manager'] },
  'project-manager': { label: 'Project Manager', keywords: ['project manager'] },
  'frontend-developer': { label: 'Frontend Developer', keywords: ['frontend', 'front-end', 'front end'] },
  'backend-developer': { label: 'Backend Developer', keywords: ['backend', 'back-end', 'back end'] },
  'fullstack-developer': { label: 'Full Stack Developer', keywords: ['full stack', 'fullstack'] },
  'devops-engineer': { label: 'DevOps Engineer', keywords: ['devops', 'dev ops', 'site reliability'] },
  'ux-designer': { label: 'UX Designer', keywords: ['ux designer', 'ux/ui', 'user experience'] },
  'marketing-manager': { label: 'Marketing Manager', keywords: ['marketing manager'] },
  'sales-manager': { label: 'Sales Manager', keywords: ['sales manager'] },
  'account-manager': { label: 'Account Manager', keywords: ['account manager'] },
  'business-analyst': { label: 'Business Analyst', keywords: ['business analyst'] },
  'cloud-engineer': { label: 'Cloud Engineer', keywords: ['cloud engineer'] },
  'machine-learning-engineer': { label: 'ML Engineer', keywords: ['machine learning', 'ml engineer'] },
  'cybersecurity': { label: 'Cyber Security', keywords: ['cyber security', 'cybersecurity', 'security engineer'] },
  'hr-manager': { label: 'HR Manager', keywords: ['hr manager', 'human resources'] },
  'finance-manager': { label: 'Finance Manager', keywords: ['finance manager', 'financial manager'] },
  'content-manager': { label: 'Content Manager', keywords: ['content manager', 'content lead'] },
  'qa-engineer': { label: 'QA Engineer', keywords: ['qa engineer', 'quality assurance', 'test engineer'] },
  'solutions-architect': { label: 'Solutions Architect', keywords: ['solutions architect', 'architect'] },
  'scrum-master': { label: 'Scrum Master', keywords: ['scrum master', 'agile coach'] },
}

var LOCATIONS = ['London','Manchester','Edinburgh','Bristol','Birmingham','Leeds','Glasgow','Liverpool','Brighton','Remote']

export async function generateMetadata({ params }) {
  var role = ROLES[params.role]
  if (!role) return { title: 'Salary data — ShowJob' }
  return {
    title: role.label + ' Salary UK 2026 — Average Pay & Range | ShowJob',
    description: 'What does a ' + role.label + ' earn in the UK? Real salary data from job listings that actually disclose pay. See ranges by seniority and location.',
  }
}

export default async function RoleSalaryPage({ params }) {
  var role = ROLES[params.role]
  if (!role) return notFound()

  // Fetch matching jobs
  var { data: allJobs } = await supabase
    .from('jobs')
    .select('id, title, slug, salary_min, salary_max, location, remote_policy, trust_score, companies(name, slug)')
    .eq('active', true)

  if (!allJobs) allJobs = []

  var matching = allJobs.filter(function(j) {
    var title = j.title.toLowerCase()
    return role.keywords.some(function(kw) { return title.includes(kw) })
  })

  var withSalary = matching.filter(function(j) { return j.salary_min > 0 })
  var withoutSalary = matching.filter(function(j) { return j.salary_min <= 0 })

  // Overall stats
  var avgSalary = 0, minSalary = 0, maxSalary = 0, medianSalary = 0
  if (withSalary.length > 0) {
    var salaries = withSalary.map(function(j) { return (j.salary_min + j.salary_max) / 2 }).sort(function(a, b) { return a - b })
    avgSalary = Math.round(salaries.reduce(function(a, b) { return a + b }, 0) / salaries.length)
    minSalary = Math.min(...withSalary.map(function(j) { return j.salary_min }))
    maxSalary = Math.max(...withSalary.map(function(j) { return j.salary_max }))
    medianSalary = Math.round(salaries[Math.floor(salaries.length / 2)])
  }

  // By seniority
  var seniorityLevels = [
    { label: 'Junior / Graduate', test: function(t) { return /junior|graduate|intern|trainee|entry/i.test(t) } },
    { label: 'Mid-level', test: function(t) { return !/junior|graduate|senior|lead|principal|staff|head|director|intern|trainee/i.test(t) } },
    { label: 'Senior', test: function(t) { return /senior|sr\s/i.test(t) } },
    { label: 'Lead / Principal', test: function(t) { return /lead|principal|staff/i.test(t) } },
    { label: 'Director+', test: function(t) { return /director|head of|vp|chief/i.test(t) } },
  ]

  var byLevel = seniorityLevels.map(function(level) {
    var jobs = withSalary.filter(function(j) { return level.test(j.title) })
    if (jobs.length === 0) return { ...level, count: 0, avg: 0, min: 0, max: 0 }
    var avg = Math.round(jobs.reduce(function(a, j) { return a + (j.salary_min + j.salary_max) / 2 }, 0) / jobs.length)
    return {
      ...level,
      count: jobs.length,
      avg: avg,
      min: Math.min(...jobs.map(function(j) { return j.salary_min })),
      max: Math.max(...jobs.map(function(j) { return j.salary_max })),
    }
  }).filter(function(l) { return l.count > 0 })

  // By location
  var byLocation = LOCATIONS.map(function(loc) {
    var jobs
    if (loc === 'Remote') {
      jobs = withSalary.filter(function(j) { return j.remote_policy && j.remote_policy.toLowerCase().includes('remote') })
    } else {
      jobs = withSalary.filter(function(j) { return j.location === loc })
    }
    if (jobs.length === 0) return { location: loc, count: 0, avg: 0 }
    var avg = Math.round(jobs.reduce(function(a, j) { return a + (j.salary_min + j.salary_max) / 2 }, 0) / jobs.length)
    return { location: loc, slug: loc.toLowerCase(), count: jobs.length, avg: avg }
  }).filter(function(l) { return l.count > 0 }).sort(function(a, b) { return b.avg - a.avg })

  // Top paying companies
  var companyPay = {}
  withSalary.forEach(function(j) {
    var name = j.companies?.name
    var slug = j.companies?.slug
    if (!name) return
    if (!companyPay[name]) companyPay[name] = { name: name, slug: slug, total: 0, count: 0, maxPay: 0 }
    var mid = (j.salary_min + j.salary_max) / 2
    companyPay[name].total += mid
    companyPay[name].count++
    if (j.salary_max > companyPay[name].maxPay) companyPay[name].maxPay = j.salary_max
  })
  var topCompanies = Object.values(companyPay)
    .map(function(c) { return { ...c, avg: Math.round(c.total / c.count) } })
    .sort(function(a, b) { return b.avg - a.avg })
    .slice(0, 10)

  // Salary disclosure rate
  var disclosureRate = matching.length > 0 ? Math.round((withSalary.length / matching.length) * 100) : 0

  // Sample jobs to show
  var sampleJobs = withSalary
    .sort(function(a, b) { return (b.trust_score || 0) - (a.trust_score || 0) })
    .slice(0, 8)

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <Link href="/salaries" className="text-xs text-pw-muted hover:text-pw-text2 transition-colors mb-4 inline-block">← All salary data</Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight mb-2 text-pw-text1">
          {role.label} <span className="text-pw-green">salary</span> in the UK
        </h1>
        <p className="text-sm text-pw-text2">
          Based on {withSalary.length} job listing{withSalary.length !== 1 ? 's' : ''} with disclosed salaries. {disclosureRate}% of {role.label} roles show their pay.
        </p>
      </div>

      {/* Key stats */}
      {withSalary.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <div className="bg-white border border-pw-border rounded-xl p-4 text-center">
            <div className="text-[9px] font-mono text-pw-muted uppercase mb-1">Average</div>
            <div className="font-mono text-2xl font-black text-pw-green">£{Math.round(avgSalary / 1000)}k</div>
          </div>
          <div className="bg-white border border-pw-border rounded-xl p-4 text-center">
            <div className="text-[9px] font-mono text-pw-muted uppercase mb-1">Median</div>
            <div className="font-mono text-2xl font-black text-pw-text1">£{Math.round(medianSalary / 1000)}k</div>
          </div>
          <div className="bg-white border border-pw-border rounded-xl p-4 text-center">
            <div className="text-[9px] font-mono text-pw-muted uppercase mb-1">Range</div>
            <div className="font-mono text-lg font-bold text-pw-text1">£{Math.round(minSalary / 1000)}k–£{Math.round(maxSalary / 1000)}k</div>
          </div>
          <div className="bg-white border border-pw-border rounded-xl p-4 text-center">
            <div className="text-[9px] font-mono text-pw-muted uppercase mb-1">Show salary</div>
            <div className={'font-mono text-2xl font-black ' + (disclosureRate >= 50 ? 'text-pw-green' : 'text-pw-amber')}>{disclosureRate}%</div>
          </div>
        </div>
      ) : (
        <div className="bg-pw-card border border-pw-border rounded-xl p-8 text-center mb-8">
          <p className="text-sm text-pw-text2">No {role.label} roles with disclosed salaries found. {matching.length} listing{matching.length !== 1 ? 's' : ''} exist{matching.length === 1 ? 's' : ''} but {matching.length === 1 ? 'hides' : 'hide'} the salary.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-6">
        <div>
          {/* By Seniority */}
          {byLevel.length > 0 && (
            <div className="mb-8">
              <h2 className="font-display text-lg font-black tracking-tight mb-3 text-pw-text1">By seniority</h2>
              <div className="bg-white border border-pw-border rounded-xl overflow-hidden">
                {byLevel.map(function(level) {
                  var maxAvg = byLevel[0]?.avg || 1
                  var barWidth = Math.round((level.avg / maxAvg) * 100)
                  return (
                    <div key={level.label} className="px-4 py-3 border-b border-pw-border last:border-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-semibold text-pw-text1">{level.label}</span>
                        <span className="font-mono text-sm font-bold text-pw-green">£{Math.round(level.avg / 1000)}k</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-pw-border overflow-hidden">
                          <div className="h-full rounded-full bg-pw-green transition-all" style={{ width: barWidth + '%' }} />
                        </div>
                        <span className="text-[10px] font-mono text-pw-muted w-20 text-right">£{Math.round(level.min / 1000)}k–£{Math.round(level.max / 1000)}k</span>
                      </div>
                      <div className="text-[10px] text-pw-muted font-mono mt-0.5">{level.count} jobs</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* By Location */}
          {byLocation.length > 0 && (
            <div className="mb-8">
              <h2 className="font-display text-lg font-black tracking-tight mb-3 text-pw-text1">By location</h2>
              <div className="bg-white border border-pw-border rounded-xl overflow-hidden">
                {byLocation.map(function(loc) {
                  var maxAvg = byLocation[0]?.avg || 1
                  var barWidth = Math.round((loc.avg / maxAvg) * 100)
                  return (
                    <Link key={loc.location} href={'/salaries/' + params.role + '/' + loc.slug}>
                      <div className="px-4 py-3 border-b border-pw-border last:border-0 hover:bg-pw-greenDark/30 transition-all cursor-pointer">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-semibold text-pw-text1">{loc.location}</span>
                          <span className="font-mono text-sm font-bold text-pw-green">£{Math.round(loc.avg / 1000)}k</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-pw-border overflow-hidden">
                            <div className="h-full rounded-full bg-pw-green transition-all" style={{ width: barWidth + '%' }} />
                          </div>
                          <span className="text-[10px] font-mono text-pw-muted">{loc.count} jobs</span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Sample jobs */}
          {sampleJobs.length > 0 && (
            <div>
              <h2 className="font-display text-lg font-black tracking-tight mb-3 text-pw-text1">{role.label} jobs with salary</h2>
              <div className="flex flex-col gap-2">
                {sampleJobs.map(function(job) {
                  return (
                    <Link key={job.id} href={'/jobs/' + job.slug}>
                      <div className="bg-white border border-pw-border rounded-xl p-4 hover:border-pw-green/40 transition-all cursor-pointer">
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-pw-text1 truncate">{job.title}</div>
                            <div className="text-xs text-pw-muted mt-0.5">{job.companies?.name} · {job.location}</div>
                            <div className="font-mono text-sm font-bold text-pw-green mt-1">
                              £{Math.round(job.salary_min / 1000)}k–£{Math.round(job.salary_max / 1000)}k
                            </div>
                          </div>
                          <TrustRing score={job.trust_score} size={36} />
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div>
          {/* Top paying companies */}
          {topCompanies.length > 0 && (
            <div className="bg-white border border-pw-border rounded-xl p-4 mb-4">
              <div className="text-[10px] font-mono text-pw-green uppercase tracking-wider mb-3">Top paying for {role.label}</div>
              {topCompanies.map(function(c, i) {
                return (
                  <Link key={c.name} href={'/companies/' + c.slug}>
                    <div className="flex justify-between items-center py-1.5 border-b border-pw-border last:border-0 hover:text-pw-green transition-colors">
                      <span className="text-xs text-pw-text3 truncate flex-1">{c.name}</span>
                      <span className="font-mono text-xs font-bold text-pw-green ml-2">£{Math.round(c.avg / 1000)}k</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {/* Disclosure warning */}
          {disclosureRate < 50 && (
            <div className="bg-pw-amberDark border border-pw-amber/20 rounded-xl p-4 mb-4">
              <div className="text-xs text-pw-amberText leading-relaxed">
                <strong>Only {disclosureRate}% of {role.label} roles disclose salary.</strong> The data above is based on the {withSalary.length} listing{withSalary.length !== 1 ? 's' : ''} that do. Actual averages may differ.
              </div>
            </div>
          )}

          {/* Browse other locations */}
          <div className="bg-white border border-pw-border rounded-xl p-4 mb-4">
            <div className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mb-3">{role.label} by city</div>
            <div className="flex flex-col gap-1">
              {LOCATIONS.map(function(loc) {
                return (
                  <Link key={loc} href={'/salaries/' + params.role + '/' + loc.toLowerCase()}>
                    <div className="text-xs text-pw-text2 py-1 hover:text-pw-green transition-colors">{role.label} in {loc} →</div>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* CTA */}
          <div className="bg-pw-greenDark border border-pw-green/20 rounded-xl p-4">
            <div className="text-sm font-bold text-pw-green mb-1">Looking for a {role.label} role?</div>
            <p className="text-xs text-pw-text2 mb-3">Upload your CV and we'll match you to {role.label} jobs in your salary range.</p>
            <Link href="/candidate" className="block py-2 rounded-lg bg-pw-green text-white font-bold text-xs text-center hover:translate-y-[-1px] transition-all">
              Upload CV →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
