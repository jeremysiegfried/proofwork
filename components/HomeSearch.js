'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function HomeSearch() {
  var [query, setQuery] = useState('')
  var [location, setLocation] = useState('')
  var router = useRouter()

  function handleSearch(e) {
    e.preventDefault()
    var params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    if (location.trim()) params.set('location', location.trim())
    var qs = params.toString()
    router.push('/jobs' + (qs ? '?' + qs : ''))
  }

  return (
    <div className="max-w-2xl mx-auto px-6">
      <form onSubmit={handleSearch}>
        <div className="bg-white border border-pw-border rounded-xl p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <label className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mb-1 block">What</label>
              <input
                type="text"
                value={query}
                onChange={function(e) { setQuery(e.target.value) }}
                placeholder="Job title, skill, or company"
                className="w-full px-4 py-3 rounded-lg border border-pw-border bg-pw-bg text-pw-text1 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mb-1 block">Where</label>
              <input
                type="text"
                value={location}
                onChange={function(e) { setLocation(e.target.value) }}
                placeholder="City, region, or postcode"
                className="w-full px-4 py-3 rounded-lg border border-pw-border bg-pw-bg text-pw-text1 text-sm"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full sm:w-auto px-8 py-3 rounded-lg bg-pw-green text-white font-extrabold text-sm hover:translate-y-[-1px] hover:shadow-lg hover:shadow-pw-green/20 transition-all whitespace-nowrap"
              >
                Find jobs
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
