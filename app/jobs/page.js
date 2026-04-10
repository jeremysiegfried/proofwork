import { supabase } from '@/lib/supabase'
import JobCard from '@/components/JobCard'

export const metadata = {
  title: 'Browse Jobs — ProofWork',
  description: 'UK tech jobs with full salary transparency and employer trust scores.',
}

export const revalidate = 300 // refresh every 5 min

async function getJobs() {
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('*, companies(*)')
    .eq('active', true)
    .order('trust_score', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Error fetching jobs:', error)
    return []
  }
  return jobs || []
}

export default async function JobsPage() {
  const jobs = await getJobs()

  return (
    <div className="max-w-3xl mx-auto px-6 py-6">
      <h1 className="font-display text-2xl font-black tracking-tight mb-1">Open roles</h1>
      <p className="text-xs text-pw-muted font-mono mb-5">{jobs.length} jobs · sorted by trust score</p>

      {jobs.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-pw-text2 text-lg mb-2">No jobs yet</p>
          <p className="text-pw-muted text-sm">Run the import script to load your scraped jobs.</p>
          <code className="block mt-4 text-xs font-mono bg-pw-card border border-pw-border rounded-lg p-4 text-pw-text3">
            npm run import-jobs
          </code>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} company={job.companies} />
          ))}
        </div>
      )}
    </div>
  )
}
