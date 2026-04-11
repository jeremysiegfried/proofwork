'use client'

import { useState, useEffect, useCallback } from 'react'
import JobCard from './JobCard'
import { supabase } from '@/lib/supabase'

const REGIONS = ['All', 'London', 'Manchester', 'Edinburgh', 'Bristol', 'Brighton', 'Birmingham', 'Leeds', 'Glasgow', 'Remote']
const PAGE_SIZE = 30

export default function JobsList() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState('All')
  const [sort, setSort] = useState('trust')
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [searchTimeout, setSearchTimeout] = useState(null)

  const fetchJobs = useCallback(async (pageNum, append) => {
    if (pageNum === 0) setLoading(true)
    else setLoadingMore(true)

    let q = supabase
      .from('jobs')
      .select('*, companies!inner(*)', { count: 'exact' })
      .eq('active', true)

    // Search
    if (query.trim()) {
      q = q.or(`title.ilike.%${query}%,description.ilike.%${query}%,companies.name.ilike.%${query}%`)
    }

    // Region filter
    if (region === 'Remote') {
      q = q.ilike('remote_policy', '%Remote%')
    } else if (region !== 'All') {
      q = q.eq('location', region)
    }

    // Verified only
    if (showVerifiedOnly) {
      q = q.eq('companies.claimed', true)
    }

    // Sort
    if (sort === 'salary') {
      q = q.order('salary_min', { ascending: false })
    } else if (sort === 'recent') {
      q = q.order('created_at', { ascending: false })
    } else {
      q = q.order('trust_score', { ascending: false })
    }

    // Pagination
    const from = pageNum * PAGE_SIZE
    q = q.range(from, from + PAGE_SIZE - 1)

    const { data, error, count } = await q

    if (error) {
      console.error('Fetch error:', error)
      setLoading(false)
      setLoadingMore(false)
      return
    }

    if (append) {
      setJobs(prev => [...prev, ...(data || [])])
    } else {
      setJobs(data || [])
    }

    setTotalCount(count || 0)
    setHasMore((data || []).length === PAGE_SIZE)
    setLoading(false)
    setLoadingMore(false)
  }, [query, region, sort, showVerifiedOnly])

  // Initial load and filter changes
  useEffect(() => {
    setPage(0)
    fetchJobs(0, false)
  }, [region, sort, showVerifiedOnly])

  // Debounced search
  useEffect(() => {
    if (searchTimeout) clearTimeout(searchTimeout)
    const t = setTimeout(() => {
      setPage(0)
      fetchJobs(0, false)
    }, 300)
    setSearchTimeout(t)
    return () => clearTimeout(t)
  }, [query])

  function loadMore() {
    const nextPage = page + 1
    setPage(nextPage)
    fetchJobs(nextPage, true)
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-6">
      <h1 className="font-display text-2xl font-black tracking-tight mb-1">Open roles</h1>
      <p className="text-xs text-pw-muted font-mono mb-4">
        {totalCount.toLocaleString()} jobs{query ? ` matching "${query}"` : ''}{region !== 'All' ? ` in ${region}` : ''}
      </p>

      {/* Search */}
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search by title, company, or keyword..."
        className="w-full px-4 py-3 rounded-lg border border-pw-border bg-pw-card text-sm text-pw-text1 mb-3"
      />

      {/* Filters */}
      <div className="flex justify-between items-center mb-4 gap-3 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {REGIONS.map(r => (
            <button
              key={r}
              onClick={() => setRegion(r)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                region === r
                  ? 'border border-pw-green bg-pw-greenDark text-pw-green'
                  : 'border border-pw-border text-pw-muted hover:text-pw-text2'
              }`}
            >
              {r}
            </button>
          ))}
          <button
            onClick={() => setShowVerifiedOnly(!showVerifiedOnly)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              showVerifiedOnly
                ? 'border border-pw-green bg-pw-greenDark text-pw-green'
                : 'border border-pw-border text-pw-muted hover:text-pw-text2'
            }`}
          >
            Verified only
          </button>
        </div>

        <div className="flex gap-1">
          {[
            { key: 'trust', label: 'Trust' },
            { key: 'salary', label: 'Salary' },
            { key: 'recent', label: 'Newest' },
          ].map(s => (
            <button
              key={s.key}
              onClick={() => setSort(s.key)}
              className={`px-2.5 py-1 rounded text-[10px] font-semibold font-mono transition-all ${
                sort === s.key
                  ? 'bg-pw-card text-pw-text1'
                  : 'text-pw-muted hover:text-pw-text2'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-center py-16">
          <div className="text-pw-muted text-sm">Loading jobs...</div>
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-pw-text2 mb-2">No jobs match your search</p>
          <button
            onClick={() => { setQuery(''); setRegion('All'); setShowVerifiedOnly(false) }}
            className="text-pw-green text-sm hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div>
          <div className="flex flex-col gap-2">
            {jobs.map(job => (
              <JobCard key={job.id} job={job} company={job.companies} />
            ))}
          </div>

          {/* Load more */}
          {hasMore && (
            <div className="text-center mt-6">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className={`px-8 py-3 rounded-lg text-sm font-bold transition-all ${
                  loadingMore
                    ? 'bg-pw-border text-pw-muted'
                    : 'bg-pw-card border border-pw-border text-pw-text1 hover:border-pw-green/30 hover:text-pw-green'
                }`}
              >
                {loadingMore ? 'Loading...' : `Load more jobs (showing ${jobs.length} of ${totalCount.toLocaleString()})`}
              </button>
            </div>
          )}

          {!hasMore && jobs.length > 0 && (
            <div className="text-center mt-6 text-xs text-pw-muted font-mono">
              Showing all {jobs.length.toLocaleString()} matching jobs
            </div>
          )}
        </div>
      )}
    </div>
  )
}
