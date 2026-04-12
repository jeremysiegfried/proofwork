'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'

var LOCATIONS = ['All', 'London', 'Manchester', 'Edinburgh', 'Bristol', 'Birmingham', 'Leeds', 'Glasgow', 'Liverpool', 'Remote']

export default function CompanyGrid({ data }) {
  var companies = useMemo(function() { return JSON.parse(data) }, [data])
  var [search, setSearch] = useState('')
  var [location, setLocation] = useState('All')
  var [sortBy, setSortBy] = useState('jobs')
  var [showVerified, setShowVerified] = useState(false)
  var [showCount, setShowCount] = useState(48)

  var filtered = useMemo(function() {
    var result = companies

    if (search.trim()) {
      var q = search.toLowerCase()
      result = result.filter(function(c) { return c.name.toLowerCase().includes(q) })
    }

    if (location !== 'All') {
      result = result.filter(function(c) { return c.locations.includes(location) })
    }

    if (showVerified) {
      result = result.filter(function(c) { return c.claimed })
    }

    if (sortBy === 'trust') {
      result = result.slice().sort(function(a, b) { return b.avgTrust - a.avgTrust })
    } else if (sortBy === 'name') {
      result = result.slice().sort(function(a, b) { return a.name.localeCompare(b.name) })
    }
    // default 'jobs' is already sorted by job count

    return result
  }, [companies, search, location, sortBy, showVerified])

  function getScoreColor(score) {
    if (score >= 70) return 'text-pw-green'
    if (score >= 40) return 'text-pw-amber'
    return 'text-red-500'
  }

  return (
    <div>
      <input
        value={search}
        onChange={function(e) { setSearch(e.target.value) }}
        placeholder="Search companies..."
        className="w-full px-4 py-3 rounded-lg border border-pw-border bg-white text-sm text-pw-text1 mb-3"
      />

      <div className="flex justify-between items-center mb-4 gap-3 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {LOCATIONS.map(function(loc) {
            return <button key={loc} onClick={function() { setLocation(loc) }}
              className={'px-3 py-1.5 rounded-full text-xs font-semibold transition-all ' +
                (location === loc ? 'border border-pw-green bg-pw-greenDark text-pw-greenText' : 'border border-pw-border text-pw-muted hover:text-pw-text2')
              }>{loc}</button>
          })}
        </div>
        <div className="flex gap-1.5">
          {[
            { key: 'jobs', label: 'Most jobs' },
            { key: 'trust', label: 'Top rated' },
            { key: 'name', label: 'A→Z' },
          ].map(function(s) {
            return <button key={s.key} onClick={function() { setSortBy(s.key) }}
              className={'px-2.5 py-1 rounded text-[10px] font-semibold font-mono transition-all ' +
                (sortBy === s.key ? 'bg-pw-border text-pw-text1' : 'text-pw-muted hover:text-pw-text2')
              }>{s.label}</button>
          })}
          <button onClick={function() { setShowVerified(!showVerified) }}
            className={'px-2.5 py-1 rounded text-[10px] font-semibold font-mono transition-all ' +
              (showVerified ? 'bg-pw-greenDark text-pw-greenText border border-pw-green/20' : 'text-pw-muted hover:text-pw-text2')
            }>✓ Verified</button>
        </div>
      </div>

      <div className="text-xs text-pw-muted font-mono mb-3">
        {filtered.length.toLocaleString()} companies
        {location !== 'All' ? ' in ' + location : ''}
        {search ? ' matching "' + search + '"' : ''}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-pw-card border border-pw-border rounded-xl p-8 text-center">
          <p className="text-sm text-pw-text2">No companies match your search.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.slice(0, showCount).map(function(c) {
              return (
                <Link key={c.id} href={'/companies/' + c.slug}>
                  <div className="bg-white border border-pw-border rounded-xl p-4 hover:border-pw-green/40 hover:shadow-sm transition-all cursor-pointer h-full">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {c.emoji && <span className="text-lg shrink-0">{c.emoji}</span>}
                        <div className="min-w-0">
                          <div className="font-display text-sm font-bold text-pw-text1 truncate">{c.name}</div>
                          <div className="text-[10px] text-pw-muted">
                            {c.jobs} job{c.jobs !== 1 ? 's' : ''}
                            {c.employees && ' · ' + c.employees}
                          </div>
                        </div>
                      </div>
                      {c.claimed && (
                        <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-pw-greenDark text-pw-greenText font-bold border border-pw-green/20 shrink-0">✓</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-3">
                        <div>
                          <span className={'font-mono text-lg font-black ' + getScoreColor(c.avgTrust)}>{c.avgTrust}</span>
                          <span className="text-[9px] text-pw-muted font-mono ml-1">trust</span>
                        </div>
                        <div>
                          <span className={'font-mono text-sm ' + (c.salaryPct >= 50 ? 'text-pw-green font-bold' : 'text-pw-muted')}>{c.salaryPct}%</span>
                          <span className="text-[9px] text-pw-muted font-mono ml-1">salary</span>
                        </div>
                      </div>
                      <div className="text-xs text-pw-muted truncate max-w-[100px]">
                        {c.locations.slice(0, 2).join(', ')}
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>

          {filtered.length > showCount && (
            <div className="text-center mt-4">
              <button onClick={function() { setShowCount(showCount + 48) }}
                className="px-8 py-3 rounded-lg text-sm font-bold bg-white border border-pw-border text-pw-text1 hover:border-pw-green/30 hover:text-pw-green transition-all">
                Show more ({showCount} of {filtered.length.toLocaleString()})
              </button>
            </div>
          )}
        </>
      )}

      <div className="bg-pw-greenDark border border-pw-green/20 rounded-xl p-5 mt-6">
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <div>
            <h3 className="font-display text-base font-bold text-pw-green mb-1">Don't see your company?</h3>
            <p className="text-sm text-pw-text2">Claim your profile, add transparency data, and start attracting better candidates.</p>
          </div>
          <Link href="/signup" className="px-5 py-2.5 rounded-lg bg-pw-green text-white font-bold text-sm hover:translate-y-[-1px] hover:shadow-lg hover:shadow-pw-green/20 transition-all whitespace-nowrap shrink-0">
            Claim your company →
          </Link>
        </div>
      </div>
    </div>
  )
}
