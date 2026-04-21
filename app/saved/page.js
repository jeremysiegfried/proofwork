'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import JobCard from '@/components/JobCard'

export default function SavedJobsPage() {
  var router = useRouter()
  var { user, loading: authLoading } = useAuth()
  var [jobs, setJobs] = useState([])
  var [loading, setLoading] = useState(true)

  useEffect(function() {
    if (authLoading) return
    if (!user) { router.push('/login'); return }
    loadSaved()
  }, [user, authLoading])

  async function loadSaved() {
    var { data: savedEntries } = await supabase
      .from('saved_jobs')
      .select('job_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (savedEntries && savedEntries.length > 0) {
      var jobIds = savedEntries.map(function(s) { return s.job_id })
      var { data: jobData } = await supabase
        .from('jobs')
        .select('*, companies(*)')
        .in('id', jobIds)
        .eq('active', true)

      setJobs(jobData || [])
    }
    setLoading(false)
  }

  async function unsaveJob(jobId) {
    await supabase.from('saved_jobs').delete().eq('user_id', user.id).eq('job_id', jobId)
    setJobs(function(prev) { return prev.filter(function(j) { return j.id !== jobId }) })
  }

  if (authLoading || loading) {
    return <div className="max-w-4xl mx-auto px-6 py-20 text-center text-pw-muted text-sm">Loading...</div>
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="font-display text-2xl font-black tracking-tight mb-1">Saved jobs</h1>
      <p className="text-xs text-pw-muted font-mono mb-6">{jobs.length} saved</p>

      {jobs.length === 0 ? (
        <div className="bg-pw-card border border-pw-border rounded-xl p-8 text-center">
          <p className="text-sm text-pw-text2 mb-3">You haven't saved any jobs yet.</p>
          <p className="text-xs text-pw-muted mb-4">Click the heart icon on any job card to save it for later.</p>
          <Link href="/jobs" className="text-pw-green text-sm font-semibold hover:underline">Browse jobs →</Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {jobs.map(function(job) {
            return (
              <div key={job.id} className="relative">
                <JobCard job={job} company={job.companies} />
                <button onClick={function() { unsaveJob(job.id) }}
                  className="absolute top-3 right-3 w-7 h-7 rounded-full bg-pw-greenDark border border-pw-green/20 text-pw-green text-sm flex items-center justify-center hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all"
                  title="Remove from saved">
                  ♥
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
