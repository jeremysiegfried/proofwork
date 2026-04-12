import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export const revalidate = 3600

export var metadata = {
  title: 'UK Salary Data by Role & Location | ShowJob',
  description: 'Real salary data from 10,000+ UK job listings. See average pay by role and city, based on disclosed salaries — not estimates.',
}

var ROLES = [
  { slug: 'software-engineer', label: 'Software Engineer', keywords: ['software engineer', 'software developer'] },
  { slug: 'data-scientist', label: 'Data Scientist', keywords: ['data scientist'] },
  { slug: 'data-engineer', label: 'Data Engineer', keywords: ['data engineer'] },
  { slug: 'data-analyst', label: 'Data Analyst', keywords: ['data analyst'] },
  { slug: 'product-manager', label: 'Product Manager', keywords: ['product manager'] },
  { slug: 'project-manager', label: 'Project Manager', keywords: ['project manager'] },
  { slug: 'frontend-developer', label: 'Frontend Developer', keywords: ['frontend', 'front-end', 'front end'] },
  { slug: 'backend-developer', label: 'Backend Developer', keywords: ['backend', 'back-end', 'back end'] },
  { slug: 'fullstack-developer', label: 'Full Stack Developer', keywords: ['full stack', 'fullstack'] },
  { slug: 'devops-engineer', label: 'DevOps Engineer', keywords: ['devops', 'dev ops', 'site reliability'] },
  { slug: 'ux-designer', label: 'UX Designer', keywords: ['ux designer', 'ux/ui', 'user experience'] },
  { slug: 'marketing-manager', label: 'Marketing Manager', keywords: ['marketing manager'] },
  { slug: 'sales-manager', label: 'Sales Manager', keywords: ['sales manager'] },
  { slug: 'account-manager', label: 'Account Manager', keywords: ['account manager'] },
  { slug: 'business-analyst', label: 'Business Analyst', keywords: ['business analyst'] },
  { slug: 'cloud-engineer', label: 'Cloud Engineer', keywords: ['cloud engineer'] },
  { slug: 'machine-learning-engineer', label: 'ML Engineer', keywords: ['machine learning', 'ml engineer'] },
  { slug: 'cybersecurity', label: 'Cyber Security', keywords: ['cyber security', 'cybersecurity', 'security engineer'] },
  { slug: 'hr-manager', label: 'HR Manager', keywords: ['hr manager', 'human resources'] },
  { slug: 'finance-manager', label: 'Finance Manager', keywords: ['finance manager', 'financial manager'] },
  { slug: 'content-manager', label: 'Content Manager', keywords: ['content manager', 'content lead'] },
  { slug: 'qa-engineer', label: 'QA Engineer', keywords: ['qa engineer', 'quality assurance', 'test engineer'] },
  { slug: 'solutions-architect', label: 'Solutions Architect', keywords: ['solutions architect', 'architect'] },
  { slug: 'scrum-master', label: 'Scrum Master', keywords: ['scrum master', 'agile coach'] },
]

var LOCATIONS = [
  { slug: 'london', label: 'London' },
  { slug: 'manchester', label: 'Manchester' },
  { slug: 'edinburgh', label: 'Edinburgh' },
  { slug: 'bristol', label: 'Bristol' },
  { slug: 'birmingham', label: 'Birmingham' },
  { slug: 'leeds', label: 'Leeds' },
  { slug: 'glasgow', label: 'Glasgow' },
  { slug: 'liverpool', label: 'Liverpool' },
  { slug: 'brighton', label: 'Brighton' },
  { slug: 'remote', label: 'Remote' },
]

export default async function SalariesPage() {
  // Fetch all jobs with salary data
  var { data: jobs } = await supabase
    .from('jobs')
    .select('title, salary_min, salary_max, location, remote_policy')
    .eq('active', true)
    .gt('salary_min', 0)

  if (!jobs) jobs = []

  // Aggregate by role
  var roleStats = ROLES.map(function(role) {
    var matching = jobs.filter(function(j) {
      var title = j.title.toLowerCase()
      return role.keywords.some(function(kw) { return title.includes(kw) })
    })

    if (matching.length === 0) return { ...role, count: 0, avg: 0, min: 0, max: 0 }

    var salaries = matching.map(function(j) { return (j.salary_min + j.salary_max) / 2 })
    var avg = Math.round(salaries.reduce(function(a, b) { return a + b }, 0) / salaries.length)
    var min = Math.min(...matching.map(function(j) { return j.salary_min }))
    var max = Math.max(...matching.map(function(j) { return j.salary_max }))

    return { ...role, count: matching.length, avg: avg, min: min, max: max }
  }).filter(function(r) { return r.count > 0 }).sort(function(a, b) { return b.avg - a.avg })

  // Aggregate by location
  var locationStats = LOCATIONS.map(function(loc) {
    var matching
    if (loc.slug === 'remote') {
      matching = jobs.filter(function(j) { return j.remote_policy && j.remote_policy.toLowerCase().includes('remote') })
    } else {
      matching = jobs.filter(function(j) { return j.location && j.location.toLowerCase() === loc.label.toLowerCase() })
    }

    if (matching.length === 0) return { ...loc, count: 0, avg: 0 }

    var avg = Math.round(matching.reduce(function(a, j) { return a + (j.salary_min + j.salary_max) / 2 }, 0) / matching.length)
    return { ...loc, count: matching.length, avg: avg }
  }).filter(function(l) { return l.count > 0 }).sort(function(a, b) { return b.avg - a.avg })

  var totalWithSalary = jobs.length

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="text-center mb-10">
        <p className="font-mono text-xs text-pw-green uppercase tracking-[3px] mb-3">Salary intelligence</p>
        <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight mb-3 text-pw-text1">
          UK salary data.<br />
          <span className="text-pw-green">From real job listings.</span>
        </h1>
        <p className="text-pw-text2 text-base max-w-lg mx-auto leading-relaxed">
          Aggregated from {totalWithSalary.toLocaleString()} UK job listings that actually disclose their salary. Not estimates — real data from real employers.
        </p>
      </div>

      {/* By Role */}
      <div className="mb-12">
        <h2 className="font-display text-xl font-black tracking-tight mb-1 text-pw-text1">By role</h2>
        <p className="text-xs text-pw-muted font-mono mb-4">{roleStats.length} roles with salary data</p>

        <div className="bg-white border border-pw-border rounded-xl overflow-hidden">
          <div className="grid grid-cols-[1fr_80px_100px_100px_60px] gap-2 px-4 py-2.5 border-b border-pw-border bg-pw-bg hidden sm:grid">
            <div className="text-[9px] font-mono text-pw-muted uppercase">Role</div>
            <div className="text-[9px] font-mono text-pw-muted uppercase text-center">Jobs</div>
            <div className="text-[9px] font-mono text-pw-muted uppercase text-center">Avg salary</div>
            <div className="text-[9px] font-mono text-pw-muted uppercase text-center">Range</div>
            <div></div>
          </div>

          {roleStats.map(function(role) {
            return (
              <Link key={role.slug} href={'/salaries/' + role.slug}>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_80px_100px_100px_60px] gap-1 sm:gap-2 px-4 py-3 border-b border-pw-border last:border-0 hover:bg-pw-greenDark/30 transition-all cursor-pointer items-center">
                  <div className="font-semibold text-sm text-pw-text1">{role.label}</div>
                  <div className="text-xs font-mono text-pw-muted sm:text-center">{role.count} jobs</div>
                  <div className="font-mono text-sm font-bold text-pw-green sm:text-center">£{Math.round(role.avg / 1000)}k</div>
                  <div className="text-xs font-mono text-pw-muted sm:text-center">£{Math.round(role.min / 1000)}k–£{Math.round(role.max / 1000)}k</div>
                  <div className="text-xs text-pw-green font-semibold sm:text-right hidden sm:block">→</div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* By Location */}
      <div className="mb-12">
        <h2 className="font-display text-xl font-black tracking-tight mb-1 text-pw-text1">By location</h2>
        <p className="text-xs text-pw-muted font-mono mb-4">Average salary across all roles</p>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {locationStats.map(function(loc) {
            var maxAvg = locationStats[0]?.avg || 1
            var barWidth = Math.round((loc.avg / maxAvg) * 100)

            return (
              <div key={loc.slug} className="bg-white border border-pw-border rounded-xl p-4 hover:border-pw-green/30 transition-all">
                <div className="text-sm font-bold text-pw-text1 mb-1">{loc.label}</div>
                <div className="font-mono text-lg font-black text-pw-green">£{Math.round(loc.avg / 1000)}k</div>
                <div className="text-[10px] text-pw-muted font-mono">{loc.count} jobs</div>
                <div className="mt-2 h-1.5 rounded-full bg-pw-border overflow-hidden">
                  <div className="h-full rounded-full bg-pw-green" style={{ width: barWidth + '%' }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Browse all combinations */}
      <div className="mb-8">
        <h2 className="font-display text-xl font-black tracking-tight mb-1 text-pw-text1">Browse by role + location</h2>
        <p className="text-xs text-pw-muted font-mono mb-4">Click any combination for detailed salary data</p>

        <div className="bg-white border border-pw-border rounded-xl p-4">
          <div className="flex flex-wrap gap-1.5">
            {roleStats.slice(0, 12).map(function(role) {
              return LOCATIONS.slice(0, 6).map(function(loc) {
                return (
                  <Link key={role.slug + '-' + loc.slug} href={'/salaries/' + role.slug + '/' + loc.slug}
                    className="px-2.5 py-1 rounded-md bg-pw-bg border border-pw-border text-[10px] font-mono text-pw-text2 hover:border-pw-green/30 hover:text-pw-green transition-all">
                    {role.label} in {loc.label}
                  </Link>
                )
              })
            })}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-pw-greenDark border border-pw-green/20 rounded-xl p-5 text-center">
        <h3 className="font-display text-base font-bold text-pw-green mb-1">Know what you're worth</h3>
        <p className="text-sm text-pw-text2 mb-3">Upload your CV and we'll match you to roles in your salary range with transparent employers.</p>
        <Link href="/candidate" className="inline-block px-6 py-2.5 rounded-lg bg-pw-green text-white font-bold text-sm hover:translate-y-[-1px] hover:shadow-lg hover:shadow-pw-green/20 transition-all">
          Upload your CV →
        </Link>
      </div>
    </div>
  )
}
