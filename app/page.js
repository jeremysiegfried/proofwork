import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import HomeSearch from '@/components/HomeSearch'
import TrustRing from '@/components/TrustRing'

export const revalidate = 300

async function getStats() {
  var { count: jobCount } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('active', true)
  var { count: companyCount } = await supabase.from('companies').select('*', { count: 'exact', head: true })
  var { data: salaryData } = await supabase.from('jobs').select('salary_min').eq('active', true).gt('salary_min', 0)
  var avgSalary = salaryData?.length > 0 ? Math.round(salaryData.reduce(function(a, b) { return a + b.salary_min }, 0) / salaryData.length / 1000) : 0
  var salaryPct = salaryData && jobCount ? Math.round((salaryData.length / jobCount) * 100) : 0

  // Get top companies for the leaderboard preview
  var { data: topJobs } = await supabase
    .from('jobs')
    .select('company_id, trust_score, companies(name, slug, logo_emoji, claimed)')
    .eq('active', true)
    .order('trust_score', { ascending: false })
    .limit(200)

  var companyScores = {}
  if (topJobs) {
    topJobs.forEach(function(j) {
      var cid = j.company_id
      if (!companyScores[cid]) {
        companyScores[cid] = {
          name: j.companies?.name,
          slug: j.companies?.slug,
          emoji: j.companies?.logo_emoji,
          claimed: j.companies?.claimed,
          total: 0,
          count: 0,
        }
      }
      companyScores[cid].total += j.trust_score || 0
      companyScores[cid].count++
    })
  }

  var topCompanies = Object.values(companyScores)
    .map(function(c) { return { ...c, avg: Math.round(c.total / c.count) } })
    .sort(function(a, b) { return b.avg - a.avg })
    .slice(0, 5)

  return {
    jobs: jobCount || 0,
    companies: companyCount || 0,
    avgSalary: avgSalary,
    salaryPct: salaryPct,
    salaryCount: salaryData?.length || 0,
    topCompanies: topCompanies,
  }
}

export default async function Home() {
  var stats = await getStats()

  return (
    <div>
      {/* HERO */}
      <div className="relative overflow-hidden">
        <div className="absolute top-[-30%] left-[15%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,#16A34A08_0%,transparent_70%)]" />
        <div className="absolute bottom-[-20%] right-[10%] w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,#16A34A05_0%,transparent_70%)]" />

        <div className="relative z-10 max-w-3xl mx-auto px-6 pt-16 pb-12 text-center">
          <p className="font-mono text-xs text-pw-green uppercase tracking-[3px] mb-4">UK's first skill-verified hiring platform</p>
          <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tight leading-[1.05] mb-4 text-pw-text1">
            Prove your skills.<br />
            <span className="text-pw-green">Skip the CV pile.</span>
          </h1>
          <p className="text-pw-text2 text-base max-w-lg mx-auto mb-8 leading-relaxed">
            Upload your CV. Get matched to jobs by fit, not keywords. Complete skill assessments that employers trust. Apply to companies that are transparent about salary, benefits, and culture.
          </p>

          <HomeSearch />
        </div>
      </div>

      {/* STATS BAR */}
      <div className="flex justify-center gap-3 px-6 mb-12 flex-wrap">
        <div className="bg-white border border-pw-border rounded-lg px-5 py-3 text-center shadow-sm">
          <div className="font-mono text-xl font-bold text-pw-text1">{stats.jobs.toLocaleString()}</div>
          <div className="text-[9px] text-pw-muted font-mono uppercase mt-0.5">Jobs indexed</div>
        </div>
        <div className="bg-white border border-pw-border rounded-lg px-5 py-3 text-center shadow-sm">
          <div className="font-mono text-xl font-bold text-pw-text1">{stats.companies.toLocaleString()}</div>
          <div className="text-[9px] text-pw-muted font-mono uppercase mt-0.5">Companies</div>
        </div>
        <div className="bg-white border border-pw-border rounded-lg px-5 py-3 text-center shadow-sm">
          <div className="font-mono text-xl font-bold text-pw-green">{stats.salaryPct}%</div>
          <div className="text-[9px] text-pw-muted font-mono uppercase mt-0.5">Show salary</div>
        </div>
        <div className="bg-white border border-pw-border rounded-lg px-5 py-3 text-center shadow-sm">
          <div className="font-mono text-xl font-bold text-pw-text1">£{stats.avgSalary}k</div>
          <div className="text-[9px] text-pw-muted font-mono uppercase mt-0.5">Avg salary</div>
        </div>
      </div>

      {/* HOW IT WORKS - CANDIDATES */}
      <div className="max-w-4xl mx-auto px-6 mb-16">
        <div className="text-center mb-8">
          <p className="font-mono text-[10px] text-pw-green uppercase tracking-[3px] mb-2">For job seekers</p>
          <h2 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-pw-text1">Get matched. Get verified. Get hired.</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-pw-border rounded-xl p-5 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-pw-greenDark flex items-center justify-center text-lg mb-3 border border-pw-green/20">📤</div>
            <h3 className="font-display text-base font-bold mb-1.5 text-pw-text1">Upload your CV</h3>
            <p className="text-sm text-pw-text2 leading-relaxed">
              AI extracts your skills, experience, seniority, and salary expectations. No forms to fill — just drop your PDF.
            </p>
          </div>
          <div className="bg-white border border-pw-border rounded-xl p-5 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-pw-greenDark flex items-center justify-center text-lg mb-3 border border-pw-green/20">🎯</div>
            <h3 className="font-display text-base font-bold mb-1.5 text-pw-text1">See your matches</h3>
            <p className="text-sm text-pw-text2 leading-relaxed">
              Every job scored by how well it fits YOUR profile. Salary, location, seniority — all factored in. Ranked by employer transparency.
            </p>
          </div>
          <div className="bg-white border border-pw-border rounded-xl p-5 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-pw-greenDark flex items-center justify-center text-lg mb-3 border border-pw-green/20">⚡</div>
            <h3 className="font-display text-base font-bold mb-1.5 text-pw-text1">Prove your skills</h3>
            <p className="text-sm text-pw-text2 leading-relaxed">
              Complete AI-generated skill assessments. Get a verified score that employers trust. Stand out from the CV pile.
            </p>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link href="/candidate" className="inline-block px-7 py-3 rounded-lg bg-pw-green text-white font-extrabold text-sm hover:translate-y-[-1px] hover:shadow-lg hover:shadow-pw-green/20 transition-all">
            Upload your CV →
          </Link>
        </div>
      </div>

      {/* TRANSPARENCY SCORING */}
      <div className="bg-white border-y border-pw-border py-12 mb-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-8">
            <p className="font-mono text-[10px] text-pw-green uppercase tracking-[3px] mb-2">The transparency score</p>
            <h2 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-pw-text1">We score the employer, not you</h2>
            <p className="text-sm text-pw-text2 mt-2 max-w-lg mx-auto">Every company on ShowJob gets a public transparency score. The more they disclose, the higher they rank. Lower score? They're hiding something.</p>
          </div>

          <div className="flex justify-center mb-8">
            <div className="flex gap-2 sm:gap-4 flex-wrap justify-center">
              {[
                { label: 'Salary', pts: 30, desc: 'Do they show the pay range?' },
                { label: 'Benefits', pts: 20, desc: 'What perks do they offer?' },
                { label: 'Progression', pts: 20, desc: 'How fast do people advance?' },
                { label: 'Satisfaction', pts: 15, desc: 'Are employees happy?' },
                { label: 'Assessment', pts: 15, desc: 'Do they test skills fairly?' },
              ].map(function(item) {
                return (
                  <div key={item.label} className="bg-pw-bg border border-pw-border rounded-xl p-3 sm:p-4 text-center w-[100px] sm:w-[120px]">
                    <div className="font-mono text-lg font-black text-pw-green">{item.pts}</div>
                    <div className="text-[10px] font-mono text-pw-text1 font-bold uppercase mt-0.5">{item.label}</div>
                    <div className="text-[9px] text-pw-muted mt-1 leading-snug hidden sm:block">{item.desc}</div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex justify-center gap-6 items-center flex-wrap">
            <div className="flex items-center gap-3">
              <TrustRing score={85} size={48} />
              <div>
                <div className="text-xs font-bold text-pw-text1">High score</div>
                <div className="text-[10px] text-pw-muted">Transparent, trusted</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <TrustRing score={45} size={48} />
              <div>
                <div className="text-xs font-bold text-pw-text1">Medium score</div>
                <div className="text-[10px] text-pw-muted">Partial info shared</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <TrustRing score={15} size={48} />
              <div>
                <div className="text-xs font-bold text-pw-text1">Low score</div>
                <div className="text-[10px] text-pw-muted">Hiding key data</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LEADERBOARD PREVIEW */}
      <div className="max-w-4xl mx-auto px-6 mb-16">
        <div className="text-center mb-6">
          <p className="font-mono text-[10px] text-pw-green uppercase tracking-[3px] mb-2">Transparency rankings</p>
          <h2 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-pw-text1">Most transparent employers</h2>
        </div>

        <div className="bg-white border border-pw-border rounded-xl overflow-hidden mb-4">
          {stats.topCompanies.map(function(company, i) {
            return (
              <Link key={company.slug} href={'/companies/' + company.slug}>
                <div className={'flex items-center gap-4 px-5 py-3.5 border-b border-pw-border last:border-0 hover:bg-pw-greenDark/30 transition-all cursor-pointer ' + (i < 3 ? 'bg-pw-greenDark/20' : '')}>
                  <span className={'font-mono text-sm w-8 ' + (i < 3 ? 'font-black text-pw-green' : 'text-pw-muted')}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '#' + (i + 1)}
                  </span>
                  {company.emoji && <span className="text-lg">{company.emoji}</span>}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-pw-text1">{company.name}</span>
                    {company.claimed && (
                      <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-pw-greenDark text-pw-greenText font-bold border border-pw-green/20 ml-2">✓</span>
                    )}
                    <span className="text-xs text-pw-muted ml-2">{company.count} jobs</span>
                  </div>
                  <span className="font-mono text-base font-black text-pw-green">{company.avg}</span>
                </div>
              </Link>
            )
          })}
        </div>

        <div className="text-center">
          <Link href="/leaderboard" className="inline-block px-6 py-2.5 rounded-lg border border-pw-border text-pw-text1 font-bold text-sm hover:border-pw-green/30 hover:text-pw-green transition-all">
            See full rankings ({stats.companies.toLocaleString()} companies) →
          </Link>
        </div>
      </div>

      {/* FOR EMPLOYERS */}
      <div className="bg-pw-bg border-y border-pw-border py-12 mb-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-8">
            <p className="font-mono text-[10px] text-pw-green uppercase tracking-[3px] mb-2">For employers</p>
            <h2 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-pw-text1">Stop sifting through 200 CVs</h2>
            <p className="text-sm text-pw-text2 mt-2 max-w-lg mx-auto">Get pre-screened candidates with verified skill scores. Pay less than a recruiter. Hire faster.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-white border border-pw-border rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-lg border border-red-200">📋</div>
                <h3 className="font-display text-base font-bold text-pw-text1">Traditional hiring</h3>
              </div>
              <div className="flex flex-col gap-1.5 text-xs text-pw-muted">
                <div className="flex gap-2"><span className="text-red-500">✗</span> 200+ unfiltered CVs per role</div>
                <div className="flex gap-2"><span className="text-red-500">✗</span> No skill verification</div>
                <div className="flex gap-2"><span className="text-red-500">✗</span> £5k-15k per recruiter hire</div>
                <div className="flex gap-2"><span className="text-red-500">✗</span> 42 days average time-to-hire</div>
              </div>
            </div>
            <div className="bg-white border-2 border-pw-green rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-pw-greenDark flex items-center justify-center text-lg border border-pw-green/20">⚡</div>
                <h3 className="font-display text-base font-bold text-pw-green">ShowJob hiring</h3>
              </div>
              <div className="flex flex-col gap-1.5 text-xs text-pw-text3">
                <div className="flex gap-2"><span className="text-pw-green">✓</span> Pre-screened candidates matched by fit</div>
                <div className="flex gap-2"><span className="text-pw-green">✓</span> AI skill assessments with verified scores</div>
                <div className="flex gap-2"><span className="text-pw-green">✓</span> From £99/month unlimited jobs</div>
                <div className="flex gap-2"><span className="text-pw-green">✓</span> Transparency score attracts better candidates</div>
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-3 flex-wrap">
            <Link href="/signup" className="px-7 py-3 rounded-lg bg-pw-green text-white font-extrabold text-sm hover:translate-y-[-1px] hover:shadow-lg hover:shadow-pw-green/20 transition-all">
              Claim your company (free) →
            </Link>
            <Link href="/pricing" className="px-7 py-3 rounded-lg border border-pw-border text-pw-text1 font-bold text-sm hover:border-pw-green/30 hover:text-pw-green transition-all">
              See pricing
            </Link>
          </div>
        </div>
      </div>

      {/* BOTTOM CTA */}
      <div className="max-w-3xl mx-auto px-6 pb-16 text-center">
        <h2 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-pw-text1 mb-3">
          Ready to see the full picture?
        </h2>
        <p className="text-sm text-pw-text2 mb-6 max-w-md mx-auto">
          Join thousands of candidates who apply with proof, not promises. And employers who hire on skill, not keywords.
        </p>
        <div className="flex justify-center gap-3 flex-wrap">
          <Link href="/candidate" className="px-8 py-3.5 rounded-lg bg-pw-green text-white font-extrabold text-sm hover:translate-y-[-1px] hover:shadow-lg hover:shadow-pw-green/20 transition-all">
            Upload your CV →
          </Link>
          <Link href="/jobs" className="px-8 py-3.5 rounded-lg border border-pw-border text-pw-text1 font-bold text-sm hover:border-pw-green/30 hover:text-pw-green transition-all">
            Browse all jobs
          </Link>
        </div>
      </div>
    </div>
  )
}
