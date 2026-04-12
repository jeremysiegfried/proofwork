import { supabase } from '@/lib/supabase'

export default async function sitemap() {
  var baseUrl = 'https://proofwork-nine.vercel.app'

  var { data: jobs } = await supabase
    .from('jobs')
    .select('slug, updated_at')
    .eq('active', true)

  var jobUrls = (jobs || []).map(function(job) {
    return {
      url: baseUrl + '/jobs/' + job.slug,
      lastModified: job.updated_at || new Date().toISOString(),
      changeFrequency: 'weekly',
      priority: 0.8,
    }
  })

  var { data: companies } = await supabase
    .from('companies')
    .select('slug, updated_at')

  var companyUrls = (companies || []).map(function(c) {
    return {
      url: baseUrl + '/companies/' + c.slug,
      lastModified: c.updated_at || new Date().toISOString(),
      changeFrequency: 'weekly',
      priority: 0.6,
    }
  })

  return [
    {
      url: baseUrl,
      lastModified: new Date().toISOString(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: baseUrl + '/jobs',
      lastModified: new Date().toISOString(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: baseUrl + '/leaderboard',
      lastModified: new Date().toISOString(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: baseUrl + '/pricing',
      lastModified: new Date().toISOString(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    ...jobUrls,
    ...companyUrls,
  ]
}
