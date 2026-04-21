'use client'
import { useState } from 'react'

export default function JobAlertBanner({ query, region, industry, minSalary, remoteFilter }) {
  var [email, setEmail] = useState('')
  var [frequency, setFrequency] = useState('weekly')
  var [status, setStatus] = useState('') // '', 'loading', 'success', 'error'
  var [errorMsg, setErrorMsg] = useState('')
  var [dismissed, setDismissed] = useState(false)

  if (dismissed || status === 'success') {
    if (status === 'success') {
      return (
        <div className="mb-4 p-3 bg-pw-greenDark border border-pw-green/20 rounded-xl flex items-center gap-2">
          <span className="text-pw-green text-sm">✓</span>
          <span className="text-sm text-pw-greenText">Alert created! We'll email you {frequency === 'daily' ? 'daily' : 'weekly'} when new matching jobs appear.</span>
        </div>
      )
    }
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email || !email.includes('@')) { setErrorMsg('Enter a valid email'); return }
    setStatus('loading')
    setErrorMsg('')

    try {
      var res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          query: query || '',
          region: region || 'All',
          industry: industry || '',
          min_salary: minSalary || 0,
          remote_filter: remoteFilter || '',
          frequency: frequency,
        })
      })

      if (!res.ok) {
        var data = await res.json()
        throw new Error(data.error || 'Failed to create alert')
      }

      setStatus('success')
    } catch (err) {
      setErrorMsg(err.message)
      setStatus('error')
    }
  }

  var hasFilters = query || (region && region !== 'All') || industry || minSalary > 0 || remoteFilter
  var description = []
  if (query) description.push('"' + query + '"')
  if (region && region !== 'All') description.push('in ' + region)
  if (industry) description.push(industry.split(',')[0] + ' roles')
  if (remoteFilter) description.push(remoteFilter.toLowerCase())

  return (
    <div className="mb-4 p-4 bg-pw-card border border-pw-border rounded-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm">🔔</span>
            <span className="text-sm font-bold text-pw-text1">Get job alerts</span>
          </div>
          <p className="text-xs text-pw-text2 mb-3">
            {hasFilters
              ? 'Get emailed when new ' + (description.join(' ') || 'matching') + ' jobs are posted.'
              : 'Get emailed when new jobs matching your criteria are posted.'
            }
          </p>
          <form onSubmit={handleSubmit} className="flex gap-2 items-center flex-wrap">
            <input type="email" value={email} onChange={function(e) { setEmail(e.target.value) }}
              placeholder="your@email.com"
              className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-pw-border bg-pw-bg text-sm text-pw-text1" />
            <select value={frequency} onChange={function(e) { setFrequency(e.target.value) }}
              className="px-3 py-2 rounded-lg border border-pw-border bg-pw-bg text-sm text-pw-text1 appearance-none">
              <option value="weekly">Weekly</option>
              <option value="daily">Daily</option>
            </select>
            <button type="submit" disabled={status === 'loading'}
              className={'px-4 py-2 rounded-lg text-sm font-bold transition-all ' +
                (status === 'loading' ? 'bg-pw-border text-pw-muted' : 'bg-pw-green text-white hover:translate-y-[-1px]')
              }>
              {status === 'loading' ? 'Creating...' : 'Create alert'}
            </button>
          </form>
          {errorMsg && <p className="text-xs text-red-500 mt-1">{errorMsg}</p>}
        </div>
        <button onClick={function() { setDismissed(true) }} className="text-pw-muted hover:text-pw-text2 text-sm p-1">✕</button>
      </div>
    </div>
  )
}
