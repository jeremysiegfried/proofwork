'use client'

import { useState, useMemo } from 'react'
import JobCard from './JobCard'

const REGIONS = ['All', 'London', 'Manchester', 'Edinburgh', 'Bristol', 'Brighton', 'Remote']
const SORTS = [
  { key: 'trust', label: 'Trust score' },
  { key: 'salary', label: 'Salary' },
  { key: 'recent', label: 'Newest' },
]

export default function JobsList({ initialJobs }) {
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState('All')
  const [sort, setSort] = useState('trust')
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false)

  const filtered = useMemo(() => {
    let jobs = [...initialJobs]

    // Search
    if (query) {
      const q = query.toLowerCase()
      jobs = jobs.filter(j =>
        j.title.toLowerCase().includes(q) ||
        j.companies?.name?.toLowerCase().includes(q) ||
        (j.tags || []).some(t => t.toLowerCase().includes(q))
      )
    }

    // Region
    if (region === 'Remote') {
      jobs = jobs.filter(j => j.remote_policy?.toLowerCase().includes('remote'))
    } else if (region !== 'All') {
      jobs = jobs.filter(j => j.location?.includes(region))
    }

    // Verified only
    if (showVerifiedOnly) {
      jobs = jobs.filter(j => j.companies?.claimed)
    }

    // Sort
    if (sort === 'salary') {
      jobs.sort((a, b) => b.salary_min - a.salary_min)
    } else if (sort === 'trust') {
      jobs.sort((a, b) => b.trust_score - a.trust_score)
    } else if (sort === 'recent') {
      jobs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    }

    return jobs
  }, [initialJobs, query, region, sort, showVerifiedOnly])

  const verifiedCount = initialJobs.filter(j => j.companies?.claimed).length
  const avgSalary = initialJobs.filter(j => j.salary_min > 0).length

  return (
    <div className="max-w-3xl mx-auto px-6 py-6">
      <h1 className="font-display text-2xl font-black tracking-tight mb-1">Open roles</h1>
      <p className="text-xs text-pw-muted font-mono mb-4">
        {filtered.length} jobs · {verifiedCount} verified · {avgSalary} show salary
      </p>

      {/* Search */}
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search by title, company, or skill..."
        className="w-full px-4 py-3 rounded-lg border border-pw-border bg-pw-card text-sm text-pw-text1 mb-3"
      />

      {/* Filters row */}
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
            ✓ Verified only
          </button>
        </div>

        <div className="flex gap-1">
          {SORTS.map(s => (
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
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-pw-text2 mb-2">No jobs match your search</p>
          <button onClick={() => { setQuery(''); setRegion('All'); setShowVerifiedOnly(false) }} className="text-pw-green text-sm hover:underline">
            Clear filters
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(job => (
            <JobCard key={job.id} job={job} company={job.companies} />
          ))}
        </div>
      )}
    </div>
  )
}
