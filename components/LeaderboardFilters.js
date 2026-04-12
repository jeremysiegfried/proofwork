'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import TrustRing from './TrustRing'

export default function LeaderboardFilters({ data, locations }) {
  var companies = useMemo(function() { return JSON.parse(data) }, [data])
  var allLocations = useMemo(function() { return JSON.parse(locations) }, [locations])

  var [locationFilter, setLocationFilter] = useState('All')
  var [sizeFilter, setSizeFilter] = useState('all')
  var [showClaimed, setShowClaimed] = useState(false)
  var [searchQuery, setSearchQuery] = useState('')
  var [showCount, setShowCount] = useState(50)

  var filtered = useMemo(function() {
    var result = companies

    // Location filter
    if (locationFilter !== 'All') {
      result = result.filter(function(c) {
        return c.locations.includes(locationFilter)
      })
    }

    // Size filter
    if (sizeFilter === 'large') {
      result = result.filter(function(c) { return c.jobs >= 5 })
    } else if (sizeFilter === 'medium') {
      result = result.filter(function(c) { return c.jobs >= 2 && c.jobs < 5 })
    } else if (sizeFilter === 'small') {
      result = result.filter(function(c) { return c.jobs === 1 })
    }

    // Claimed filter
    if (showClaimed) {
      result = result.filter(function(c) { return c.claimed })
    }

    // Search
    if (searchQuery.trim()) {
      var q = searchQuery.toLowerCase()
      result = result.filter(function(c) { return c.name.toLowerCase().includes(q) })
    }

    return result
  }, [companies, locationFilter, sizeFilter, showClaimed, searchQuery])

  // Top locations for quick filters
  var topLocations = ['All', 'London', 'Manchester', 'Edinburgh', 'Bristol', 'Birmingham', 'Leeds', 'Glasgow', 'Liverpool', 'Remote']

  function getScoreColor(score) {
    if (score >= 70) return 'text-pw-green'
    if (score >= 40) return 'text-pw-amber'
    return 'text-red-500'
  }

  function getRankBadge(rank) {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return ''
  }

  return (
    <div>
      {/* Search */}
      <input
        value={searchQuery}
        onChange={function(e) { setSearchQuery(e.target.value) }}
        placeholder="Search companies..."
        className="w-full px-4 py-3 rounded-lg border border-pw-border bg-white text-sm text-pw-text1 mb-3"
      />

      {/* Filters */}
      <div className="flex justify-between items-center mb-3 gap-3 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {topLocations.map(function(loc) {
            return <button key={loc} onClick={function() { setLocationFilter(loc) }}
              className={'px-3 py-1.5 rounded-full text-xs font-semibold transition-all ' +
                (locationFilter === loc ? 'border border-pw-green bg-pw-greenDark text-pw-greenText' : 'border border-pw-border text-pw-muted hover:text-pw-text2')
              }>{loc}</button>
          })}
        </div>
        <div className="flex gap-1.5">
          {[
            { key: 'all', label: 'All sizes' },
            { key: 'large', label: '5+ jobs' },
            { key: 'medium', label: '2-4 jobs' },
          ].map(function(s) {
            return <button key={s.key} onClick={function() { setSizeFilter(s.key) }}
              className={'px-2.5 py-1 rounded text-[10px] font-semibold font-mono transition-all ' +
                (sizeFilter === s.key ? 'bg-pw-border text-pw-text1' : 'text-pw-muted hover:text-pw-text2')
              }>{s.label}</button>
          })}
          <button onClick={function() { setShowClaimed(!showClaimed) }}
            className={'px-2.5 py-1 rounded text-[10px] font-semibold font-mono transition-all ' +
              (showClaimed ? 'bg-pw-greenDark text-pw-greenText border border-pw-green/20' : 'text-pw-muted hover:text-pw-text2')
            }>✓ Verified</button>
        </div>
      </div>

      <div className="text-xs text-pw-muted font-mono mb-3">
        {filtered.length.toLocaleString()} companies{locationFilter !== 'All' ? ' in ' + locationFilter : ''}{searchQuery ? ' matching "' + searchQuery + '"' : ''}
      </div>

      {/* Table */}
      <div className="bg-white border border-pw-border rounded-xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[50px_1fr_80px_80px_80px_60px] gap-2 px-4 py-2.5 border-b border-pw-border bg-pw-bg">
          <div className="text-[9px] font-mono text-pw-muted uppercase">#</div>
          <div className="text-[9px] font-mono text-pw-muted uppercase">Company</div>
          <div className="text-[9px] font-mono text-pw-muted uppercase text-center">Score</div>
          <div className="text-[9px] font-mono text-pw-muted uppercase text-center">Jobs</div>
          <div className="text-[9px] font-mono text-pw-muted uppercase text-center">Salary %</div>
          <div className="text-[9px] font-mono text-pw-muted uppercase text-center">Status</div>
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-pw-muted">No companies match your filters</div>
        ) : (
          filtered.slice(0, showCount).map(function(company, index) {
            var rank = index + 1
            var medal = getRankBadge(rank)
            var isTop3 = rank <= 3

            return (
              <Link key={company.id} href={'/companies/' + company.slug}>
                <div className={'grid grid-cols-[50px_1fr_80px_80px_80px_60px] gap-2 px-4 py-3 items-center border-b border-pw-border last:border-0 transition-all hover:bg-pw-greenDark/30 cursor-pointer ' + (isTop3 ? 'bg-pw-greenDark/20' : '')}>
                  {/* Rank */}
                  <div className={'font-mono text-sm ' + (isTop3 ? 'font-black text-pw-green' : 'text-pw-muted')}>
                    {medal || rank}
                  </div>

                  {/* Company */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {company.emoji && <span className="text-sm">{company.emoji}</span>}
                      <span className={'text-sm font-semibold truncate ' + (isTop3 ? 'text-pw-text1' : 'text-pw-text3')}>
                        {company.name}
                      </span>
                      {company.claimed && (
                        <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-pw-greenDark text-pw-greenText font-bold border border-pw-green/20 shrink-0">✓</span>
                      )}
                    </div>
                    <div className="text-[10px] text-pw-muted mt-0.5">
                      {company.locations.slice(0, 3).join(', ')}
                      {company.employees && (' · ' + company.employees)}
                    </div>
                  </div>

                  {/* Trust score */}
                  <div className="text-center">
                    <span className={'font-mono text-base font-black ' + getScoreColor(company.avgTrust)}>
                      {company.avgTrust}
                    </span>
                  </div>

                  {/* Jobs */}
                  <div className="text-center font-mono text-sm text-pw-text1">{company.jobs}</div>

                  {/* Salary % */}
                  <div className="text-center">
                    <span className={'font-mono text-sm ' + (company.salaryPct >= 80 ? 'text-pw-green font-bold' : company.salaryPct >= 50 ? 'text-pw-amber' : 'text-pw-muted')}>
                      {company.salaryPct}%
                    </span>
                  </div>

                  {/* Transparency data */}
                  <div className="flex gap-0.5 justify-center">
                    <span className={'text-[10px] ' + (company.hasBenefits ? 'text-pw-green' : 'text-pw-border')} title="Benefits">B</span>
                    <span className={'text-[10px] ' + (company.hasProgression ? 'text-pw-green' : 'text-pw-border')} title="Progression">P</span>
                    <span className={'text-[10px] ' + (company.hasSatisfaction ? 'text-pw-green' : 'text-pw-border')} title="Satisfaction">S</span>
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </div>

      {/* Load more */}
      {filtered.length > showCount && (
        <div className="text-center mt-4">
          <button onClick={function() { setShowCount(showCount + 50) }}
            className="px-8 py-3 rounded-lg text-sm font-bold bg-white border border-pw-border text-pw-text1 hover:border-pw-green/30 hover:text-pw-green transition-all">
            Show more ({showCount} of {filtered.length.toLocaleString()})
          </button>
        </div>
      )}

      {/* Claim CTA */}
      <div className="bg-pw-greenDark border border-pw-green/20 rounded-xl p-5 mt-6">
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <div>
            <h3 className="font-display text-base font-bold text-pw-green mb-1">Want to improve your ranking?</h3>
            <p className="text-sm text-pw-text2">Claim your company, add salary and benefits data, and watch your score rise. It's free to start.</p>
          </div>
          <Link href="/signup" className="px-5 py-2.5 rounded-lg bg-pw-green text-white font-bold text-sm hover:translate-y-[-1px] hover:shadow-lg hover:shadow-pw-green/20 transition-all whitespace-nowrap shrink-0">
            Claim your company →
          </Link>
        </div>
      </div>
    </div>
  )
}
