import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import HomeSearch from '@/components/HomeSearch'

export const revalidate = 300

async function getStats() {
  const { count: jobCount } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('active', true)
  const { count: companyCount } = await supabase.from('companies').select('*', { count: 'exact', head: true })
  return { jobs: jobCount || 0, companies: companyCount || 0 }
}

export default async function Home() {
  const stats = await getStats()

  return (
    <div>
      {/* Hero */}
      <div className="text-center pt-16 pb-10 px-6 relative overflow-hidden">
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
        </div>
      </div>

      {/* Search & Filters — client component */}
      <HomeSearch />

      {/* Stats */}
      <div className="flex justify-center gap-3 px-6 mb-12 flex-wrap">
        <div className="bg-white border border-pw-border rounded-lg px-5 py-3 text-center shadow-sm">
          <div className="font-mono text-xl font-bold text-pw-text1">{stats.jobs.toLocaleString()}</div>
          <div className="text-xs text-pw-muted font-mono mt-1">JOBS INDEXED</div>
        </div>
        <div className="bg-white border border-pw-border rounded-lg px-5 py-3 text-center shadow-sm">
          <div className="font-mono text-xl font-bold text-pw-text1">{stats.companies.toLocaleString()}</div>
          <div className="text-xs text-pw-muted font-mono mt-1">COMPANIES</div>
        </div>
      </div>

      {/* How the score works */}
      <div className="max-w-3xl mx-auto px-6 pb-16">
        <div className="bg-white border border-pw-border rounded-xl p-6 shadow-sm">
          <div className="flex gap-6 items-start">
            <div className="shrink-0 w-20 h-20 rounded-full border-[3px] border-pw-green flex items-center justify-center font-mono text-2xl font-bold text-pw-green">96</div>
            <div className="flex-1">
              <h2 className="font-display text-xl font-black mb-2 text-pw-text1">Every employer gets a transparency score</h2>
              <p className="text-sm text-pw-text2 leading-relaxed mb-4">
                The higher the score, the more an employer has shared about the role. A score of 100 means full transparency — salary, benefits, career progression, team satisfaction, and a skill challenge are all disclosed. A low score means they're keeping things hidden.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { label: 'Salary', pts: 30, icon: '💰' },
                  { label: 'Benefits', pts: 20, icon: '🎁' },
                  { label: 'Progression', pts: 20, icon: '📈' },
                  { label: 'Satisfaction', pts: 15, icon: '😊' },
                  { label: 'Challenge', pts: 15, icon: '⚡' },
                ].map(function(item) {
                  return (
                    <div key={item.label} className="text-center p-2.5 rounded-lg bg-pw-bg border border-pw-border">
                      <div className="text-lg mb-1">{item.icon}</div>
                      <div className="text-[10px] font-mono text-pw-text3 font-semibold">{item.label}</div>
                      <div className="text-[10px] font-mono text-pw-green font-bold">{item.pts} pts</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-8">
          <Link href="/jobs" className="inline-block px-10 py-4 rounded-xl bg-pw-green text-white font-extrabold text-sm hover:translate-y-[-1px] hover:shadow-lg hover:shadow-pw-green/20 transition-all">
            Browse all jobs →
          </Link>
        </div>
      </div>
    </div>
  )
}
