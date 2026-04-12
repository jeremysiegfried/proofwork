'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

var REGIONS = ['London','Manchester','Edinburgh','Bristol','Brighton','Birmingham','Leeds','Glasgow','Liverpool','Remote']

var SALARY_OPTIONS = [
  { label: 'Any salary', value: '' },
  { label: '£20k+', value: '20000' },
  { label: '£30k+', value: '30000' },
  { label: '£40k+', value: '40000' },
  { label: '£50k+', value: '50000' },
  { label: '£60k+', value: '60000' },
  { label: '£80k+', value: '80000' },
  { label: '£100k+', value: '100000' },
]

export default function HomeSearch() {
  var [query, setQuery] = useState('')
  var [region, setRegion] = useState('')
  var [remote, setRemote] = useState('')
  var [salary, setSalary] = useState('')
  var router = useRouter()

  function handleSearch(e) {
    e.preventDefault()
    var params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    if (region) params.set('region', region)
    if (remote) params.set('remote', remote)
    if (salary) params.set('salary', salary)
    var qs = params.toString()
    router.push('/jobs' + (qs ? '?' + qs : ''))
  }

  return (
    <div className="max-w-2xl mx-auto px-6 mb-10">
      <form onSubmit={handleSearch}>
        <div className="bg-white border border-pw-border rounded-xl p-5 shadow-sm">
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={query}
              onChange={function(e) { setQuery(e.target.value) }}
              placeholder="Job title, company, or skill..."
              className="flex-1 px-4 py-3.5 rounded-lg border border-pw-border bg-pw-bg text-pw-text1 text-sm font-body"
            />
            <button
              type="submit"
              className="px-7 py-3.5 rounded-lg bg-pw-green text-white font-extrabold text-sm hover:translate-y-[-1px] hover:shadow-lg hover:shadow-pw-green/20 transition-all whitespace-nowrap"
            >
              Search
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mb-1 block">Location</label>
              <select value={region} onChange={function(e) { setRegion(e.target.value) }}
                className="w-full px-3 py-2 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1 appearance-none">
                <option value="">All locations</option>
                {REGIONS.map(function(r) { return <option key={r} value={r}>{r}</option> })}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mb-1 block">Remote</label>
              <select value={remote} onChange={function(e) { setRemote(e.target.value) }}
                className="w-full px-3 py-2 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1 appearance-none">
                <option value="">Any</option>
                <option value="Remote">Fully remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="On-site">On-site</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mb-1 block">Min salary</label>
              <select value={salary} onChange={function(e) { setSalary(e.target.value) }}
                className="w-full px-3 py-2 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1 appearance-none">
                {SALARY_OPTIONS.map(function(o) { return <option key={o.value} value={o.value}>{o.label}</option> })}
              </select>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
