import { supabase } from '@/lib/supabase'
import JobsList from '@/components/JobsList'

export const metadata = {
  title: 'Browse Jobs — ProofWork',
  description: 'UK tech jobs with full salary transparency and employer trust scores.',
}

export const revalidate = 300

async function getJobs() {
  const { data, error } = await supabase
    .from('jobs')
    .select('*, companies(*)')
    .eq('active', true)
    .order('trust_score', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Error fetching jobs:', error)
    return []
  }
  return data || []
}

export default async function JobsPage() {
  const jobs = await getJobs()
  return <JobsList initialJobs={jobs} />
}
