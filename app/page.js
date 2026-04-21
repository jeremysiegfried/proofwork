import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import HomeSearch from '@/components/HomeSearch'

export const revalidate = 300

async function getStats() {
  var { count: jobCount } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('active', true)
  var { count: companyCount } = await supabase.from('companies').select('*', { count: 'exact', head: true })
  var { data: salaryData } = await supabase.from('jobs').select('salary_min').eq('active', true).gt('salary_min', 0)
  var salaryPct = salaryData && jobCount ? Math.round((salaryData.length / jobCount) * 100) : 0

  return {
    jobs: jobCount || 0,
    companies: companyCount || 0,
    salaryPct: salaryPct,
  }
}

export default async function Home() {
  var stats = await getStats()

  return (
    <div>
      {/* HERO */}
      <div className="max-w-3xl mx-auto px-6 pt-20 pb-8 text-center">
        <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tight leading-[1.05] mb-4 text-pw-text1">
          Find your next role.<br />
          <span className="text-pw-green">Know what to expect.</span>
        </h1>
        <p className="text-pw-text2 text-base max-w-md mx-auto mb-8 leading-relaxed">
          {stats.jobs.toLocaleString()} UK jobs from {stats.companies.toLocaleString()} companies. {stats.salaryPct}% show salary upfront.
        </p>
      </div>

      {/* SEARCH */}
      <HomeSearch />

      {/* QUICK LINKS */}
      <div className="max-w-2xl mx-auto px-6 mt-6 mb-16">
        <div className="flex flex-wrap gap-2 justify-center">
          {['Software Engineer', 'Data Analyst', 'Product Manager', 'Marketing', 'Sales', 'Finance', 'Remote'].map(function(term) {
            return (
              <Link key={term} href={'/jobs?q=' + encodeURIComponent(term)}
                className="px-3 py-1.5 rounded-full text-xs border border-pw-border text-pw-text2 hover:border-pw-green/40 hover:text-pw-green transition-all">
                {term}
              </Link>
            )
          })}
        </div>
      </div>

      {/* VALUE PROPS - minimal */}
      <div className="max-w-4xl mx-auto px-6 mb-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center p-5">
            <div className="text-2xl mb-2">💷</div>
            <h3 className="font-display text-sm font-bold mb-1 text-pw-text1">Salary transparency</h3>
            <p className="text-xs text-pw-text2">97% of our listings show the actual salary range. No more guessing.</p>
          </div>
          <div className="text-center p-5">
            <div className="text-2xl mb-2">⚡</div>
            <h3 className="font-display text-sm font-bold mb-1 text-pw-text1">Skill assessments</h3>
            <p className="text-xs text-pw-text2">Prove your skills with timed challenges. Stand out from other applicants.</p>
          </div>
          <div className="text-center p-5">
            <div className="text-2xl mb-2">🏆</div>
            <h3 className="font-display text-sm font-bold mb-1 text-pw-text1">Employer scores</h3>
            <p className="text-xs text-pw-text2">See which companies are transparent about pay, benefits, and hiring.</p>
          </div>
        </div>
      </div>

      {/* BOTTOM CTA */}
      <div className="max-w-2xl mx-auto px-6 pb-16 text-center">
        <div className="bg-pw-card border border-pw-border rounded-xl p-8">
          <h2 className="font-display text-xl font-black mb-2 text-pw-text1">Hiring?</h2>
          <p className="text-sm text-pw-text2 mb-4">Claim your company profile. Show candidates why you're a great place to work.</p>
          <Link href="/pricing" className="inline-block px-6 py-3 rounded-lg bg-pw-green text-white font-bold text-sm hover:translate-y-[-1px] transition-all">
            See plans →
          </Link>
        </div>
      </div>
    </div>
  )
}
