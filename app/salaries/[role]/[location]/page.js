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

var LOCATION_MAP = {
  'london': 'London',
  'manchester': 'Manchester',
  'edinburgh': 'Edinburgh',
  'bristol': 'Bristol',
  'birmingham': 'Birmingham',
  'leeds': 'Leeds',
  'glasgow': 'Glasgow',
  'liverpool': 'Liverpool',
  'brighton': 'Brighton',
  'remote': 'Remote',
}

export async function generateMetadata({ params }) {
  var role = ROLES[params.role]
  var location = LOCATION_MAP[params.location]
  if (!role || !location) return { title: 'Salary data — ShowJob' }
  return {
    title: role.label + ' Salary in ' + location + ' 2026 | ShowJob',
    description: 'How much does a ' + role.label + ' earn in ' + location + '? Real salary data from UK job listings. Average pay, salary ranges by seniority, and top-paying companies.',
  }
}

export default async function RoleLocationSalaryPage({ params }) {
  var role = ROLES[params.role]
  var location = LOCATION_MAP[params.location]
  if (!role || !location) return notFound()

  var { data: allJobs } = await supabase
    .from('jobs')
    .select('id, title, slug, salary_min, salary_max, location, remote_policy, trust_score, companies(name, slug)')
    .eq('active', true)

  if (!allJobs) allJobs = []

  // Filter by role
  var roleJobs = allJobs.filter(function(j) {
    var title = j.title.toLowerCase()
    return role.keywords.some(function(kw) { return title.includes(kw) })
  })

  // Filter by location
  var matching
  if (location === 'Remote') {
    matching = roleJobs.filter(function(j) { return j.remote_policy && j.remote_policy.toLowerCase().includes('remote') })
  } else {
    matching = roleJobs.filter(function(j) { return j.location === location })
  }

  var withSalary = matching.filter(function(j) { return j.salary_min > 0 })

  // Stats
  var avgSalary = 0, minSalary = 0, maxSalary = 0
  if (withSalary.length > 0) {
    var salaries = withSalary.map(function(j) { return (j.salary_min + j.salary_max) / 2 })
    avgSalary = Math.round(salaries.reduce(function(a, b) { return a + b }, 0) / salaries.length)
    minSalary = Math.min(...withSalary.map(function(j) { return j.salary_min }))
    maxSalary = Math.max(...withSalary.map(function(j) { return j.salary_max }))
  }

  // Compare to national average
  var nationalJobs = roleJobs.filter(function(j) { return j.salary_min > 0 })
  var nationalAvg = 0
  if (nationalJobs.length > 0) {
    nationalAvg = Math.round(nationalJobs.reduce(function(a, j) { return a + (j.salary_min + j.salary_max) / 2 }, 0) / nationalJobs.length)
  }
  var vsNational = nationalAvg > 0 && avgSalary > 0 ? Math.round(((avgSalary - nationalAvg) / nationalAvg) * 100) : 0

  // By seniority
  var seniorityLevels = [
    { label: 'Junior', test: function(t) { return /junior|graduate|intern|trainee|entry/i.test(t) } },
    { label: 'Mid', test: function(t) { return !/junior|graduate|senior|lead|principal|staff|head|director|intern|trainee/i.test(t) } },
    { label: 'Senior', test: function(t) { return /senior|sr\s/i.test(t) } },
    { label: 'Lead+', test: function(t) { return /lead|principal|staff|director|head of/i.test(t) } },
  ]

  var byLevel = seniorityLevels.map(function(level) {
    var jobs = withSalary.filter(function(j) { return level.test(j.title) })
    if (jobs.length === 0) return null
    var avg = Math.round(jobs.reduce(function(a, j) { return a + (j.salary_min + j.salary_max) / 2 }, 0) / jobs.length)
    return { label: level.label, count: jobs.length, avg: avg }
  }).filter(function(l) { return l !== null })

  // All matching jobs sorted by salary
  var sortedJobs = matching.sort(function(a, b) {
    if (b.salary_max !== a.salary_max) return b.salary_max - a.salary_max
    return (b.trust_score || 0) - (a.trust_score || 0)
  })

  var disclosureRate = matching.length > 0 ? Math.round((withSalary.length / matching.length) * 100) : 0

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex gap-2 text-xs text-pw-muted mb-4">
        <Link href="/salaries" className="hover:text-pw-text2 transition-colors">Salaries</Link>
        <span>→</span>
        <Link href={'/salaries/' + params.role} className="hover:text-pw-text2 transition-colors">{role.label}</Link>
        <span>→</span>
        <span className="text-pw-text3">{location}</span>
      </div>

      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight mb-2 text-pw-text1">
          {role.label} salary in <span className="text-pw-green">{location}</span>
        </h1>
        <p className="text-sm text-pw-text2">
          {withSalary.length > 0
            ? 'Based on ' + withSalary.length + ' job' + (withSalary.length !== 1 ? 's' : '') + ' with disclosed salaries in ' + location + '.'
            : matching.length + ' ' + role.label + ' job' + (matching.length !== 1 ? 's' : '') + ' found in ' + location + ' but none disclose salary.'}
        </p>
      </div>

      {withSalary.length > 0 && (
        <>
          {/* Key stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <div className="bg-white border border-pw-border rounded-xl p-4 text-center">
              <div className="text-[9px] font-mono text-pw-muted uppercase mb-1">Average</div>
              <div className="font-mono text-2xl font-black text-pw-green">£{Math.round(avgSalary / 1000)}k</div>
            </div>
            <div className="bg-white border border-pw-border rounded-xl p-4 text-center">
              <div className="text-[9px] font-mono text-pw-muted uppercase mb-1">Range</div>
              <div className="font-mono text-lg font-bold text-pw-text1">£{Math.round(minSalary / 1000)}k–£{Math.round(maxSalary / 1000)}k</div>
            </div>
            <div className="bg-white border border-pw-border rounded-xl p-4 text-center">
              <div className="text-[9px] font-mono text-pw-muted uppercase mb-1">vs UK avg</div>
              <div className={'font-mono text-2xl font-black ' + (vsNational >= 0 ? 'text-pw-green' : 'text-red-500')}>
                {vsNational >= 0 ? '+' : ''}{vsNational}%
              </div>
            </div>
            <div className="bg-white border border-pw-border rounded-xl p-4 text-center">
              <div className="text-[9px] font-mono text-pw-muted uppercase mb-1">Show salary</div>
              <div className={'font-mono text-2xl font-black ' + (disclosureRate >= 50 ? 'text-pw-green' : 'text-pw-amber')}>{disclosureRate}%</div>
            </div>
          </div>

          {/* By seniority */}
          {byLevel.length > 0 && (
            <div className="bg-white border border-pw-border rounded-xl p-5 mb-6">
              <div className="text-[10px] font-mono text-pw-green uppercase tracking-wider mb-3">By seniority in {location}</div>
              <div className="flex gap-3 flex-wrap">
                {byLevel.map(function(level) {
                  return (
                    <div key={level.label} className="flex-1 min-w-[120px] bg-pw-bg rounded-lg p-3 border border-pw-border text-center">
                      <div className="text-xs font-semibold text-pw-text1 mb-0.5">{level.label}</div>
                      <div className="font-mono text-lg font-black text-pw-green">£{Math.round(level.avg / 1000)}k</div>
                      <div className="text-[9px] text-pw-muted font-mono">{level.count} jobs</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* All jobs */}
      <div>
        <h2 className="font-display text-lg font-black tracking-tight mb-3 text-pw-text1">
          {matching.length} {role.label} job{matching.length !== 1 ? 's' : ''} in {location}
        </h2>

        {sortedJobs.length === 0 ? (
          <div className="bg-pw-card border border-pw-border rounded-xl p-8 text-center">
            <p className="text-sm text-pw-text2 mb-3">No {role.label} jobs found in {location}.</p>
            <Link href={'/salaries/' + params.role} className="text-pw-green text-sm hover:underline">See {role.label} jobs across all UK →</Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sortedJobs.slice(0, 20).map(function(job) {
              var hasSalary = job.salary_min > 0
              var isEstimate = hasSalary && job.salary_min === job.salary_max
              return (
                <Link key={job.id} href={'/jobs/' + job.slug}>
                  <div className="bg-white border border-pw-border rounded-xl p-4 hover:border-pw-green/40 transition-all cursor-pointer">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-pw-text1 truncate">{job.title}</div>
                        <div className="text-xs text-pw-muted mt-0.5">
                          {job.companies?.name} · {job.location}
                          {job.remote_policy && job.remote_policy !== 'On-site' ? ' · ' + job.remote_policy : ''}
                        </div>
                        {hasSalary && !isEstimate ? (
                          <div className="font-mono text-sm font-bold text-pw-green mt-1">£{Math.round(job.salary_min / 1000)}k–£{Math.round(job.salary_max / 1000)}k</div>
                        ) : hasSalary && isEstimate ? (
                          <div className="font-mono text-sm text-pw-amber mt-1">~£{Math.round(job.salary_min / 1000)}k <span className="text-[10px] text-pw-muted">(est.)</span></div>
                        ) : (
                          <div className="font-mono text-xs text-pw-muted mt-1">Salary not disclosed</div>
                        )}
                      </div>
                      <TrustRing score={job.trust_score} size={36} />
                    </div>
                  </div>
                </Link>
              )
            })}
            {sortedJobs.length > 20 && (
              <div className="text-center mt-2 text-xs text-pw-muted font-mono">Showing 20 of {sortedJobs.length} jobs</div>
            )}
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="bg-pw-greenDark border border-pw-green/20 rounded-xl p-5 mt-8 text-center">
        <h3 className="font-display text-base font-bold text-pw-green mb-1">Find {role.label} jobs that match your profile</h3>
        <p className="text-sm text-pw-text2 mb-3">Upload your CV and we'll match you to {role.label} roles in {location} ranked by fit and transparency.</p>
        <Link href="/candidate" className="inline-block px-6 py-2.5 rounded-lg bg-pw-green text-white font-bold text-sm hover:translate-y-[-1px] hover:shadow-lg hover:shadow-pw-green/20 transition-all">
          Upload your CV →
        </Link>
      </div>
    </div>
  )
}
