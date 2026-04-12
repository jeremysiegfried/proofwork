import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import CompanyGrid from '@/components/CompanyGrid'

export const revalidate = 3600

export var metadata = {
  title: 'Browse Companies — ShowJob',
  description: 'Explore UK employers ranked by transparency. See who discloses salary, benefits, and culture data. 4,700+ companies scored.',
}

export default async function CompaniesPage() {
  var { data: companies } = await supabase
    .from('companies')
    .select('id, name, slug, claimed, employee_count, benefits, progression, satisfaction, logo_emoji')

  var { data: jobs } = await supabase
    .from('jobs')
    .select('company_id, trust_score, salary_min, location')
    .eq('active', true)

  if (!companies || !jobs) {
    return <div className="max-w-5xl mx-auto px-6 py-20 text-center text-pw-muted">Loading...</div>
  }

  var companyStats = {}
  jobs.forEach(function(job) {
    if (!companyStats[job.company_id]) {
      companyStats[job.company_id] = { totalJobs: 0, totalTrust: 0, withSalary: 0, locations: new Set() }
    }
    var s = companyStats[job.company_id]
    s.totalJobs++
    s.totalTrust += (job.trust_score || 0)
    if (job.salary_min > 0) s.withSalary++
    if (job.location) s.locations.add(job.location)
  })

  var ranked = companies
    .map(function(c) {
      var stats = companyStats[c.id]
      if (!stats || stats.totalJobs === 0) return null
      return {
        id: c.id,
        name: c.name,
        slug: c.slug,
        emoji: c.logo_emoji || '',
        claimed: c.claimed || false,
        employees: c.employee_count || '',
        hasBenefits: c.benefits && c.benefits.length > 0,
        jobs: stats.totalJobs,
        avgTrust: Math.round(stats.totalTrust / stats.totalJobs),
        salaryPct: Math.round((stats.withSalary / stats.totalJobs) * 100),
        locations: Array.from(stats.locations),
      }
    })
    .filter(function(c) { return c !== null })
    .sort(function(a, b) { return b.jobs - a.jobs })

  var totalCompanies = ranked.length
  var claimedCount = ranked.filter(function(c) { return c.claimed }).length

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="text-center mb-8">
        <p className="font-mono text-xs text-pw-green uppercase tracking-[3px] mb-3">Browse employers</p>
        <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight mb-3 text-pw-text1">
          {totalCompanies.toLocaleString()} companies.<br />
          <span className="text-pw-green">All scored on transparency.</span>
        </h1>
        <p className="text-pw-text2 text-base max-w-lg mx-auto leading-relaxed">
          Every employer rated on what they disclose. {claimedCount} verified. Search by name, filter by location, and see who's transparent.
        </p>
      </div>

      <CompanyGrid data={JSON.stringify(ranked)} />
    </div>
  )
}
