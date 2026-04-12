import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import TrustRing from '@/components/TrustRing'
import LeaderboardFilters from '@/components/LeaderboardFilters'

export const revalidate = 3600 // Refresh every hour

export var metadata = {
  title: 'Most Transparent Employers in the UK | ShowJob',
  description: 'See which UK employers are the most transparent about salary, benefits, and culture. Public rankings based on real data from 10,000+ job listings.',
  openGraph: {
    title: 'Most Transparent UK Employers — ShowJob Leaderboard',
    description: 'Which companies actually disclose salary? See the full transparency rankings.',
    type: 'website',
  },
}

export default async function LeaderboardPage() {
  // Get all companies with their job stats
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

  // Build company stats
  var companyStats = {}
  jobs.forEach(function(job) {
    if (!companyStats[job.company_id]) {
      companyStats[job.company_id] = {
        totalJobs: 0,
        totalTrust: 0,
        withSalary: 0,
        locations: new Set(),
      }
    }
    var s = companyStats[job.company_id]
    s.totalJobs++
    s.totalTrust += (job.trust_score || 0)
    if (job.salary_min > 0) s.withSalary++
    if (job.location) s.locations.add(job.location)
  })

  // Build ranked list
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
        hasProgression: c.progression && c.progression.length > 0,
        hasSatisfaction: c.satisfaction > 0,
        jobs: stats.totalJobs,
        avgTrust: Math.round(stats.totalTrust / stats.totalJobs),
        salaryPct: Math.round((stats.withSalary / stats.totalJobs) * 100),
        locations: Array.from(stats.locations),
      }
    })
    .filter(function(c) { return c !== null })
    .sort(function(a, b) {
      if (b.avgTrust !== a.avgTrust) return b.avgTrust - a.avgTrust
      return b.jobs - a.jobs
    })

  // Calculate stats
  var totalCompanies = ranked.length
  var avgScore = Math.round(ranked.reduce(function(a, c) { return a + c.avgTrust }, 0) / totalCompanies)
  var claimedCount = ranked.filter(function(c) { return c.claimed }).length
  var showSalary = ranked.filter(function(c) { return c.salaryPct > 50 }).length
  var allLocations = [...new Set(ranked.flatMap(function(c) { return c.locations }))]
    .sort()
    .filter(function(l) { return l && l.length > 0 })

  // Serialize for client component
  var rankedData = JSON.stringify(ranked)
  var locationData = JSON.stringify(allLocations)

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <p className="font-mono text-xs text-pw-green uppercase tracking-[3px] mb-3">Employer transparency rankings</p>
        <h1 className="font-display text-4xl font-black tracking-tight mb-3 text-pw-text1">
          Which employers have<br />
          <span className="text-pw-green">nothing to hide?</span>
        </h1>
        <p className="text-pw-text2 text-base max-w-lg mx-auto leading-relaxed">
          Every UK employer scored on what they disclose: salary, benefits, progression, satisfaction, and skill assessments. Data from {totalCompanies.toLocaleString()} companies.
        </p>
      </div>

      {/* Stats bar */}
      <div className="flex justify-center gap-3 mb-8 flex-wrap">
        <div className="bg-white border border-pw-border rounded-lg px-4 py-2.5 text-center">
          <div className="font-mono text-lg font-bold text-pw-text1">{totalCompanies.toLocaleString()}</div>
          <div className="text-[9px] text-pw-muted font-mono uppercase">Companies ranked</div>
        </div>
        <div className="bg-white border border-pw-border rounded-lg px-4 py-2.5 text-center">
          <div className="font-mono text-lg font-bold text-pw-text1">{avgScore}/100</div>
          <div className="text-[9px] text-pw-muted font-mono uppercase">Average score</div>
        </div>
        <div className="bg-white border border-pw-border rounded-lg px-4 py-2.5 text-center">
          <div className="font-mono text-lg font-bold text-pw-green">{claimedCount}</div>
          <div className="text-[9px] text-pw-muted font-mono uppercase">Verified</div>
        </div>
        <div className="bg-white border border-pw-border rounded-lg px-4 py-2.5 text-center">
          <div className="font-mono text-lg font-bold text-pw-text1">{showSalary}</div>
          <div className="text-[9px] text-pw-muted font-mono uppercase">Show salary</div>
        </div>
      </div>

      {/* Scoring explanation */}
      <div className="bg-white border border-pw-border rounded-xl p-4 mb-6">
        <div className="flex items-center gap-6 justify-center flex-wrap text-xs text-pw-text3">
          <span><span className="font-mono font-bold text-pw-green">30pts</span> Salary</span>
          <span><span className="font-mono font-bold text-pw-green">20pts</span> Benefits</span>
          <span><span className="font-mono font-bold text-pw-green">20pts</span> Progression</span>
          <span><span className="font-mono font-bold text-pw-green">15pts</span> Satisfaction</span>
          <span><span className="font-mono font-bold text-pw-green">15pts</span> Assessments</span>
          <span className="text-pw-muted">= 100 max</span>
        </div>
      </div>

      {/* Interactive filtered leaderboard */}
      <LeaderboardFilters data={rankedData} locations={locationData} />

      {/* SEO footer */}
      <div className="mt-12 text-center">
        <p className="text-xs text-pw-muted mb-2">
          Rankings updated hourly. Based on {jobs.length.toLocaleString()} active job listings across the UK.
        </p>
        <p className="text-xs text-pw-text2">
          <Link href="/pricing" className="text-pw-green hover:underline">Claim your company</Link> to improve your score and attract better candidates.
        </p>
      </div>
    </div>
  )
}
