import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export const revalidate = 300

async function getStats() {
  const { count: jobCount } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('active', true)
  const { count: companyCount } = await supabase.from('companies').select('*', { count: 'exact', head: true })
  const { count: claimedCount } = await supabase.from('companies').select('*', { count: 'exact', head: true }).eq('claimed', true)
  const { data: salaryData } = await supabase.from('jobs').select('salary_min').eq('active', true).gt('salary_min', 0)
  const avgSalary = salaryData?.length > 0 ? Math.round(salaryData.reduce((a, b) => a + b.salary_min, 0) / salaryData.length / 1000) : 0

  return {
    jobs: jobCount || 0,
    companies: companyCount || 0,
    claimed: claimedCount || 0,
    avgSalary: avgSalary
  }
}

export default async function Home() {
  const stats = await getStats()

  return (
    <div>
      <div className="text-center py-20 px-6 relative overflow-hidden">
        <div className="absolute top-[-30%] left-[20%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,#16A34A08_0%,transparent_70%)]" />
        <div className="relative z-10 max-w-2xl mx-auto">
          <p className="font-mono text-xs text-pw-green uppercase tracking-[3px] mb-4">UK's most transparent job platform</p>
          <h1 className="font-display text-5xl font-black tracking-tight leading-[1.05] mb-4 text-pw-text1">
            See the full picture.<br />
            <span className="text-pw-green">Before you apply.</span>
          </h1>
          <p className="text-pw-text2 text-base max-w-lg mx-auto mb-8 leading-relaxed font-light">
            Real salaries with market comparisons. Employer transparency scores.
            Skill challenges that prove ability. No more guessing.
          </p>
          <div className="flex gap-2 max-w-md mx-auto">
            <input type="text" placeholder="Job title, company, or skill..." className="flex-1 px-4 py-3.5 rounded-lg border border-pw-border bg-white text-pw-text1 text-sm font-body" />
            <Link className="px-7 py-3.5 rounded-lg bg-pw-green text-white font-extrabold text-sm hover:translate-y-[-1px] hover:shadow-lg hover:shadow-pw-green/20 transition-all whitespace-nowrap" href="/jobs">
              Search
            </Link>
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-3 px-6 mb-10 flex-wrap">
        <div className="bg-white border border-pw-border rounded-lg px-5 py-3 text-center shadow-sm">
          <div className="font-mono text-xl font-bold text-pw-text1">{stats.jobs.toLocaleString()}</div>
          <div className="text-xs text-pw-muted font-mono mt-1">JOBS INDEXED</div>
        </div>
        <div className="bg-white border border-pw-border rounded-lg px-5 py-3 text-center shadow-sm">
          <div className="font-mono text-xl font-bold text-pw-text1">{stats.companies.toLocaleString()}</div>
          <div className="text-xs text-pw-muted font-mono mt-1">COMPANIES</div>
        </div>
        <div className="bg-white border border-pw-border rounded-lg px-5 py-3 text-center shadow-sm">
          <div className="font-mono text-xl font-bold text-pw-green">{stats.claimed}</div>
          <div className="text-xs text-pw-muted font-mono mt-1">VERIFIED</div>
        </div>
        <div className="bg-white border border-pw-border rounded-lg px-5 py-3 text-center shadow-sm">
          <div className="font-mono text-xl font-bold text-pw-text1">£{stats.avgSalary}k</div>
          <div className="text-xs text-pw-muted font-mono mt-1">AVG SALARY</div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white border border-pw-border rounded-xl p-5 shadow-sm">
            <h3 className="font-display text-lg font-bold mb-2 text-pw-text1">Verified listings</h3>
            <p className="text-sm text-pw-text2 leading-relaxed">
              Employers who claim their listing share everything: salary, benefits, progression, satisfaction. High transparency score, more candidates.
            </p>
          </div>
          <div className="bg-white border border-pw-border rounded-xl p-5 shadow-sm">
            <h3 className="font-display text-lg font-bold mb-2 text-pw-text1">Unverified listings</h3>
            <p className="text-sm text-pw-text2 leading-relaxed">
              Scraped from public career pages. We auto-enrich with company data, but salary and benefits are missing. Low transparency score — you see what's hidden.
            </p>
          </div>
        </div>
        <div className="bg-white border border-pw-border rounded-xl p-6 flex gap-5 items-center shadow-sm">
          <div className="shrink-0 w-16 h-16 rounded-full border-[2.5px] border-pw-green flex items-center justify-center font-mono text-lg font-bold text-pw-green">96</div>
          <div>
            <h3 className="font-display text-lg font-bold mb-1 text-pw-text1">The score rates the employer, not you</h3>
            <p className="text-sm text-pw-text2 leading-relaxed">
              Salary (30pts), benefits (20pts), progression (20pts), satisfaction (15pts), skill challenges (15pts). Lower score = they're hiding something.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
