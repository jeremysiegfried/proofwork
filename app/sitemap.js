import { supabase } from '@/lib/supabase'

var ROLES = [
  'software-engineer','data-scientist','data-engineer','data-analyst','product-manager',
  'project-manager','frontend-developer','backend-developer','fullstack-developer',
  'devops-engineer','ux-designer','marketing-manager','sales-manager','account-manager',
  'business-analyst','cloud-engineer','machine-learning-engineer','cybersecurity',
  'hr-manager','finance-manager','content-manager','qa-engineer','solutions-architect','scrum-master'
]

var LOCATIONS = ['london','manchester','edinburgh','bristol','birmingham','leeds','glasgow','liverpool','brighton','remote']

export default async function sitemap() {
  var baseUrl = 'https://proofwork-nine.vercel.app'
  var now = new Date().toISOString()

  // Static pages
  var staticPages = [
    { url: baseUrl, changeFrequency: 'daily', priority: 1 },
    { url: baseUrl + '/jobs', changeFrequency: 'daily', priority: 0.9 },
    { url: baseUrl + '/companies', changeFrequency: 'daily', priority: 0.9 },
    { url: baseUrl + '/leaderboard', changeFrequency: 'daily', priority: 0.9 },
    { url: baseUrl + '/salaries', changeFrequency: 'weekly', priority: 0.9 },
    { url: baseUrl + '/pricing', changeFrequency: 'monthly', priority: 0.7 },
    { url: baseUrl + '/signup', changeFrequency: 'monthly', priority: 0.6 },
    { url: baseUrl + '/login', changeFrequency: 'monthly', priority: 0.5 },
  ].map(function(p) { return { ...p, lastModified: now } })

  // Salary pages (24 roles × 10 locations = 240 pages + 24 role pages)
  var salaryPages = []
  ROLES.forEach(function(role) {
    salaryPages.push({ url: baseUrl + '/salaries/' + role, lastModified: now, changeFrequency: 'weekly', priority: 0.8 })
    LOCATIONS.forEach(function(loc) {
      salaryPages.push({ url: baseUrl + '/salaries/' + role + '/' + loc, lastModified: now, changeFrequency: 'weekly', priority: 0.7 })
    })
  })

  // Job pages
  var { data: jobs } = await supabase
    .from('jobs')
    .select('slug, updated_at')
    .eq('active', true)

  var jobUrls = (jobs || []).map(function(job) {
    return { url: baseUrl + '/jobs/' + job.slug, lastModified: job.updated_at || now, changeFrequency: 'weekly', priority: 0.8 }
  })

  // Company pages
  var { data: companies } = await supabase
    .from('companies')
    .select('slug, updated_at')

  var companyUrls = (companies || []).map(function(c) {
    return { url: baseUrl + '/companies/' + c.slug, lastModified: c.updated_at || now, changeFrequency: 'weekly', priority: 0.6 }
  })

  return [...staticPages, ...salaryPages, ...jobUrls, ...companyUrls]
}
