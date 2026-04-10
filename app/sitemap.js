import { supabase } from '@/lib/supabase'

export default async function sitemap() {
  const { data: jobs } = await supabase
    .from('jobs')
    .select('slug, updated_at')
    .eq('active', true)

  const jobUrls = (jobs || []).map(job => ({
    url: `https://proofwork.vercel.app/jobs/${job.slug}`,
    lastModified: job.updated_at || new Date().toISOString(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  return [
    {
      url: 'https://proofwork.vercel.app',
      lastModified: new Date().toISOString(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: 'https://proofwork.vercel.app/jobs',
      lastModified: new Date().toISOString(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    ...jobUrls,
  ]
}
