'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import JobCard from './JobCard'
import { supabase } from '@/lib/supabase'

// UK city coordinates for distance calculation
var CITY_COORDS = {
  'london': { lat: 51.5074, lng: -0.1278 },
  'manchester': { lat: 53.4808, lng: -2.2426 },
  'edinburgh': { lat: 55.9533, lng: -3.1883 },
  'bristol': { lat: 51.4545, lng: -2.5879 },
  'brighton': { lat: 50.8225, lng: -0.1372 },
  'birmingham': { lat: 52.4862, lng: -1.8904 },
  'leeds': { lat: 53.8008, lng: -1.5491 },
  'glasgow': { lat: 55.8642, lng: -4.2518 },
  'liverpool': { lat: 53.4084, lng: -2.9916 },
  'newcastle': { lat: 54.9783, lng: -1.6178 },
  'sheffield': { lat: 53.3811, lng: -1.4701 },
  'nottingham': { lat: 52.9548, lng: -1.1581 },
  'cardiff': { lat: 51.4816, lng: -3.1791 },
  'belfast': { lat: 54.5973, lng: -5.9301 },
  'oxford': { lat: 51.7520, lng: -1.2577 },
  'cambridge': { lat: 52.2053, lng: 0.1218 },
  'bath': { lat: 51.3811, lng: -2.3590 },
  'york': { lat: 53.9591, lng: -1.0815 },
  'coventry': { lat: 52.4068, lng: -1.5197 },
  'reading': { lat: 51.4543, lng: -0.9781 },
  'southampton': { lat: 50.9097, lng: -1.4044 },
  'portsmouth': { lat: 50.8198, lng: -1.0880 },
  'exeter': { lat: 50.7184, lng: -3.5339 },
  'aberdeen': { lat: 57.1497, lng: -2.0943 },
  'dundee': { lat: 56.4620, lng: -2.9707 },
  'leicester': { lat: 52.6369, lng: -1.1398 },
  'stoke': { lat: 53.0027, lng: -2.1794 },
  'sunderland': { lat: 54.9069, lng: -1.3838 },
  'wolverhampton': { lat: 52.5870, lng: -2.1288 },
  'derby': { lat: 52.9225, lng: -1.4746 },
  'swansea': { lat: 51.6214, lng: -3.9436 },
  'middlesbrough': { lat: 54.5742, lng: -1.2350 },
  'milton keynes': { lat: 52.0406, lng: -0.7594 },
  'peterborough': { lat: 52.5695, lng: -0.2405 },
  'swindon': { lat: 51.5558, lng: -1.7797 },
  'warwick': { lat: 52.2820, lng: -1.5849 },
  'cheltenham': { lat: 51.8994, lng: -2.0783 },
  'guildford': { lat: 51.2362, lng: -0.5704 },
  'slough': { lat: 51.5105, lng: -0.5950 },
  'watford': { lat: 51.6565, lng: -0.3903 },
  'croydon': { lat: 51.3762, lng: -0.0982 },
  'luton': { lat: 51.8787, lng: -0.4200 },
  'ipswich': { lat: 52.0567, lng: 1.1482 },
  'norwich': { lat: 52.6309, lng: 1.2974 },
  'hull': { lat: 53.7457, lng: -0.3367 },
  'blackpool': { lat: 53.8142, lng: -3.0503 },
  'preston': { lat: 53.7632, lng: -2.7031 },
  'bolton': { lat: 53.5785, lng: -2.4299 },
  'bournemouth': { lat: 50.7192, lng: -1.8808 },
  'plymouth': { lat: 50.3755, lng: -4.1427 },
  'stockport': { lat: 53.4106, lng: -2.1575 },
  'harrow': { lat: 51.5836, lng: -0.3464 },
  'colchester': { lat: 51.8959, lng: 0.8919 },
  'basingstoke': { lat: 51.2667, lng: -1.0870 },
}

var INDUSTRIES = [
  { label: 'All industries', value: '' },
  { label: 'Technology', value: 'software,developer,engineer,devops,cloud,data,ai,machine learning,platform,fullstack,frontend,backend,sre,cyber' },
  { label: 'Finance & Banking', value: 'finance,banking,accountant,auditor,treasury,investment,trading,risk,compliance,actuarial,financial' },
  { label: 'Healthcare & Pharma', value: 'nurse,doctor,clinical,medical,healthcare,pharma,therapist,nhs,dental,surgical,hospital' },
  { label: 'Marketing & Media', value: 'marketing,seo,content,social media,copywriter,pr,communications,advertising,brand,creative,media' },
  { label: 'Sales & Retail', value: 'sales,retail,account executive,business development,bdm,bdr,sdr,commercial,store,merchandising' },
  { label: 'Education', value: 'teacher,lecturer,tutor,education,training,academic,school,university,professor' },
  { label: 'Legal', value: 'lawyer,solicitor,paralegal,legal,barrister,compliance,regulatory' },
  { label: 'Construction & Engineering', value: 'construction,civil,structural,mechanical,electrical,building,site manager,quantity surveyor,architect' },
  { label: 'Manufacturing', value: 'manufacturing,production,factory,assembly,cnc,machinist,quality,lean,six sigma' },
  { label: 'HR & Recruitment', value: 'hr,recruiter,talent,people,human resources,resourcing,l&d,learning' },
  { label: 'Logistics & Supply Chain', value: 'logistics,supply chain,warehouse,transport,shipping,procurement,distribution,fleet' },
  { label: 'Design & Creative', value: 'designer,ux,ui,graphic,creative,visual,brand design,illustration,motion' },
  { label: 'Hospitality & Catering', value: 'chef,hospitality,catering,hotel,restaurant,bar,food,kitchen,front of house' },
  { label: 'Energy & Utilities', value: 'energy,utilities,renewable,solar,wind,oil,gas,power,grid,sustainability' },
  { label: 'Defence & Aerospace', value: 'defence,defense,aerospace,military,security,clearance,mod,bae,radar' },
  { label: 'Charity & Non-profit', value: 'charity,ngo,non-profit,nonprofit,voluntary,foundation,trust,fundraising' },
  { label: 'Government & Public Sector', value: 'government,civil service,council,public sector,local authority,nhs,dwp,hmrc' },
]

var EXP_LEVELS = [
  { label: 'All levels', value: '' },
  { label: 'Junior / Graduate', value: 'junior,graduate,entry level,trainee,intern,apprentice' },
  { label: 'Senior', value: 'senior,sr ' },
  { label: 'Lead / Principal', value: 'lead,principal,staff' },
  { label: 'Manager', value: 'manager' },
  { label: 'Director+', value: 'director,head of,vp ,chief,cto,cfo,coo' },
]

var SALARY_OPTIONS = [
  { label: 'Any salary', value: 0 },
  { label: '£20k+', value: 20000 },
  { label: '£30k+', value: 30000 },
  { label: '£40k+', value: 40000 },
  { label: '£50k+', value: 50000 },
  { label: '£60k+', value: 60000 },
  { label: '£70k+', value: 70000 },
  { label: '£80k+', value: 80000 },
  { label: '£100k+', value: 100000 },
  { label: '£120k+', value: 120000 },
  { label: '£150k+', value: 150000 },
]

var DISTANCE_OPTIONS = [
  { label: 'Any distance', value: 0 },
  { label: '5 miles', value: 5 },
  { label: '10 miles', value: 10 },
  { label: '15 miles', value: 15 },
  { label: '25 miles', value: 25 },
  { label: '50 miles', value: 50 },
  { label: '100 miles', value: 100 },
]

var PAGE_SIZE = 30

function haversine(lat1, lng1, lat2, lng2) {
  var R = 3959 // miles
  var dLat = (lat2 - lat1) * Math.PI / 180
  var dLng = (lng2 - lng1) * Math.PI / 180
  var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function getCityCoords(location) {
  if (!location) return null
  var loc = location.toLowerCase().trim()
  // Direct match
  if (CITY_COORDS[loc]) return CITY_COORDS[loc]
  // Partial match
  for (var city in CITY_COORDS) {
    if (loc.includes(city) || city.includes(loc)) return CITY_COORDS[city]
  }
  return null
}

function scoreRelevance(job, searchWords) {
  var title = (job.title || '').toLowerCase()
  var companyName = (job.companies?.name || '').toLowerCase()
  var score = 0
  var fullQuery = searchWords.join(' ')
  if (title.includes(fullQuery)) score += 100
  var titleMatches = 0
  for (var i = 0; i < searchWords.length; i++) {
    var word = searchWords[i].toLowerCase()
    if (title.includes(word)) { titleMatches++; score += 20; if (title.startsWith(word)) score += 10 }
    if (companyName.includes(word)) score += 3
  }
  if (titleMatches === searchWords.length && searchWords.length > 0) score += 50
  if (titleMatches === 0) score -= 50
  score += (job.trust_score || 0) / 100
  return score
}

export default function JobsList() {
  var searchParams = useSearchParams()
  var s = useState

  var initQuery = searchParams.get('q') || ''
  var initRegion = searchParams.get('region') || 'All'
  var initSalary = parseInt(searchParams.get('salary') || '0') || 0
  var initRemote = searchParams.get('remote') || ''

  var [jobs, setJobs] = s([])
  var [loading, setLoading] = s(true)
  var [loadingMore, setLoadingMore] = s(false)
  var [query, setQuery] = s(initQuery)
  var [region, setRegion] = s(initRegion)
  var [sort, setSort] = s('trust')
  var [showVerifiedOnly, setShowVerifiedOnly] = s(false)
  var [minSalary, setMinSalary] = s(initSalary)
  var [industry, setIndustry] = s('')
  var [expLevel, setExpLevel] = s('')
  var [showFilters, setShowFilters] = s(initSalary > 0 || initRemote)
  var [page, setPage] = s(0)
  var [hasMore, setHasMore] = s(true)
  var [totalCount, setTotalCount] = s(0)
  var [searchTimeout, setSearchTimeout] = s(null)
  var [remoteFilter, setRemoteFilter] = s(initRemote)
  var [didInitialFetch, setDidInitialFetch] = s(false)
  
  // Location search
  var [postcode, setPostcode] = s('')
  var [distance, setDistance] = s(0)
  var [postcodeCoords, setPostcodeCoords] = s(null)
  var [postcodeError, setPostcodeError] = s('')
  var [postcodeLoading, setPostcodeLoading] = s(false)

  // Lookup postcode
  async function lookupPostcode(pc) {
    if (!pc || pc.trim().length < 3) { setPostcodeCoords(null); setPostcodeError(''); return }
    setPostcodeLoading(true)
    setPostcodeError('')
    try {
      var clean = pc.trim().replace(/\s+/g, '').toUpperCase()
      var res = await fetch('https://api.postcodes.io/postcodes/' + clean)
      var data = await res.json()
      if (data.result) {
        setPostcodeCoords({ lat: data.result.latitude, lng: data.result.longitude, name: data.result.admin_district || pc })
      } else {
        setPostcodeError('Postcode not found')
        setPostcodeCoords(null)
      }
    } catch (err) {
      setPostcodeError('Lookup failed')
      setPostcodeCoords(null)
    } finally {
      setPostcodeLoading(false)
    }
  }

  var fetchJobs = useCallback(function(pageNum, append) {
    if (pageNum === 0) setLoading(true)
    else setLoadingMore(true)

    var isSearching = query.trim().length > 0
    var searchWords = query.trim().split(/\s+/).filter(function(w) { return w.length >= 2 })

    var q = supabase
      .from('jobs')
      .select('*, companies!inner(*)', { count: 'exact' })
      .eq('active', true)

    if (isSearching && searchWords.length > 0) {
      var titleClauses = []
      for (var w = 0; w < searchWords.length; w++) {
        titleClauses.push('title.ilike.%' + searchWords[w] + '%')
      }
      q = q.or(titleClauses.join(','))
    }

    if (region === 'Remote') {
      q = q.ilike('remote_policy', '%Remote%')
    } else if (region !== 'All') {
      q = q.ilike('location', '%' + region + '%')
    }

    if (remoteFilter) {
      if (remoteFilter === 'Remote') q = q.ilike('remote_policy', '%Remote%')
      else if (remoteFilter === 'Hybrid') q = q.eq('remote_policy', 'Hybrid')
      else if (remoteFilter === 'On-site') q = q.eq('remote_policy', 'On-site')
    }

    if (showVerifiedOnly) q = q.eq('companies.claimed', true)
    if (minSalary > 0) q = q.gte('salary_min', minSalary)

    if (industry) {
      var indKeywords = industry.split(',')
      var indClauses = indKeywords.map(function(kw) { return 'title.ilike.%' + kw.trim() + '%' }).join(',')
      q = q.or(indClauses)
    }

    if (expLevel) {
      var expKeywords = expLevel.split(',')
      var expClauses = expKeywords.map(function(kw) { return 'title.ilike.%' + kw.trim() + '%' }).join(',')
      q = q.or(expClauses)
    }

    if (isSearching || (postcodeCoords && distance > 0)) {
      q = q.order('trust_score', { ascending: false })
      var fetchSize = PAGE_SIZE * 5
      q = q.range(0, fetchSize - 1)
    } else {
      if (sort === 'salary') q = q.order('salary_min', { ascending: false })
      else if (sort === 'recent') q = q.order('created_at', { ascending: false })
      else q = q.order('trust_score', { ascending: false })
      var from = pageNum * PAGE_SIZE
      q = q.range(from, from + PAGE_SIZE - 1)
    }

    q.then(function(result) {
      if (result.error) { setLoading(false); setLoadingMore(false); return }
      var data = result.data || []

      // Distance filtering (client-side)
      if (postcodeCoords && distance > 0) {
        data = data.filter(function(job) {
          if (job.remote_policy === 'Remote') return true
          var jobCoords = getCityCoords(job.location)
          if (!jobCoords) return true // Include if we can't determine location
          var dist = haversine(postcodeCoords.lat, postcodeCoords.lng, jobCoords.lat, jobCoords.lng)
          job._distance = Math.round(dist)
          return dist <= distance
        })
      }

      if (isSearching && searchWords.length > 0) {
        data = data.map(function(job) { return { ...job, _relevance: scoreRelevance(job, searchWords) } })
        data = data.filter(function(job) { return job._relevance > 0 })
        data.sort(function(a, b) { return b._relevance - a._relevance })
        var start = pageNum * PAGE_SIZE
        var paged = data.slice(start, start + PAGE_SIZE)
        if (append) setJobs(function(prev) { return prev.concat(paged) })
        else setJobs(paged)
        setTotalCount(data.length)
        setHasMore(start + PAGE_SIZE < data.length)
      } else if (postcodeCoords && distance > 0) {
        // Sort by distance
        data.sort(function(a, b) { return (a._distance || 999) - (b._distance || 999) })
        var start = pageNum * PAGE_SIZE
        var paged = data.slice(start, start + PAGE_SIZE)
        if (append) setJobs(function(prev) { return prev.concat(paged) })
        else setJobs(paged)
        setTotalCount(data.length)
        setHasMore(start + PAGE_SIZE < data.length)
      } else {
        if (append) setJobs(function(prev) { return prev.concat(data) })
        else setJobs(data)
        setTotalCount(result.count || 0)
        setHasMore(data.length === PAGE_SIZE)
      }

      setLoading(false)
      setLoadingMore(false)
    })
  }, [query, region, sort, showVerifiedOnly, minSalary, industry, expLevel, remoteFilter, postcodeCoords, distance])

  useEffect(function() {
    if (!didInitialFetch) { setDidInitialFetch(true); fetchJobs(0, false) }
  }, [fetchJobs, didInitialFetch])

  useEffect(function() {
    if (didInitialFetch) { setPage(0); fetchJobs(0, false) }
  }, [region, sort, showVerifiedOnly, minSalary, industry, expLevel, remoteFilter, postcodeCoords, distance])

  useEffect(function() {
    if (!didInitialFetch) return
    if (searchTimeout) clearTimeout(searchTimeout)
    var t = setTimeout(function() { setPage(0); fetchJobs(0, false) }, 400)
    setSearchTimeout(t)
    return function() { clearTimeout(t) }
  }, [query])

  function loadMore() { var np = page + 1; setPage(np); fetchJobs(np, true) }

  var activeFilterCount = (minSalary > 0 ? 1 : 0) + (industry ? 1 : 0) + (expLevel ? 1 : 0) + (showVerifiedOnly ? 1 : 0) + (remoteFilter ? 1 : 0) + (postcodeCoords && distance > 0 ? 1 : 0)

  var REGIONS = ['All','London','Manchester','Edinburgh','Bristol','Brighton','Birmingham','Leeds','Glasgow','Liverpool','Remote']

  return (
    <div className="max-w-5xl mx-auto px-6 py-6">
      <h1 className="font-display text-2xl font-black tracking-tight mb-1 text-pw-text1">Open roles</h1>
      <p className="text-xs text-pw-muted font-mono mb-4">
        {totalCount.toLocaleString()} jobs{query ? ' matching "' + query + '"' : ''}{region !== 'All' ? ' in ' + region : ''}{postcodeCoords && distance > 0 ? ' within ' + distance + ' miles of ' + postcode.toUpperCase() : ''}
      </p>

      {/* Search bar */}
      <div className="flex gap-2 mb-3">
        <input value={query} onChange={function(e) { setQuery(e.target.value) }}
          placeholder="Job title or keyword..."
          className="flex-1 px-4 py-3 rounded-lg border border-pw-border bg-white text-sm text-pw-text1" />
      </div>

      {/* Location pills */}
      <div className="flex justify-between items-center mb-3 gap-3 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {REGIONS.map(function(r) {
            return <button key={r} onClick={function() { setRegion(r); if (r !== 'All') { setPostcode(''); setPostcodeCoords(null); setDistance(0) } }}
              className={'px-3 py-1.5 rounded-full text-xs font-semibold transition-all ' +
                (region === r ? 'border border-pw-green bg-pw-greenDark text-pw-greenText' : 'border border-pw-border text-pw-muted hover:text-pw-text2')
              }>{r}</button>
          })}
        </div>
        <div className="flex gap-1">
          {[{key:'trust',label:'Score'},{key:'salary',label:'Salary'},{key:'recent',label:'Newest'}].map(function(s2) {
            return <button key={s2.key} onClick={function() { setSort(s2.key) }}
              className={'px-2.5 py-1 rounded text-[10px] font-semibold font-mono transition-all ' +
                (sort === s2.key ? 'bg-pw-border text-pw-text1' : 'text-pw-muted hover:text-pw-text2')
              }>{s2.label}</button>
          })}
        </div>
      </div>

      {query.trim() && (
        <div className="mb-3 text-[10px] font-mono text-pw-green">↑ Sorted by relevance to "{query}"</div>
      )}

      {/* Filters */}
      <div className="mb-4">
        <button onClick={function() { setShowFilters(!showFilters) }}
          className={'text-xs font-semibold transition-all ' + (showFilters || activeFilterCount > 0 ? 'text-pw-green' : 'text-pw-muted hover:text-pw-text2')}>
          {showFilters ? '▾ ' : '▸ '}Filters{activeFilterCount > 0 ? ' (' + activeFilterCount + ' active)' : ''}
        </button>

        {showFilters && (
          <div className="mt-2 p-4 bg-white border border-pw-border rounded-xl">
            {/* Postcode + Distance row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <div>
                <label className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mb-1 block">Postcode</label>
                <div className="flex gap-1">
                  <input value={postcode} onChange={function(e) { setPostcode(e.target.value) }}
                    placeholder="e.g. SW1A 1AA"
                    onKeyDown={function(e) { if (e.key === 'Enter') { e.preventDefault(); lookupPostcode(postcode) } }}
                    className="flex-1 px-3 py-2 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1" />
                  <button onClick={function() { lookupPostcode(postcode) }}
                    disabled={postcodeLoading || !postcode.trim()}
                    className={'px-2 py-2 rounded-md text-xs font-bold transition-all ' + (postcodeCoords ? 'bg-pw-greenDark text-pw-green border border-pw-green/20' : 'bg-pw-bg text-pw-muted border border-pw-border hover:text-pw-green')}>
                    {postcodeLoading ? '...' : postcodeCoords ? '✓' : '→'}
                  </button>
                </div>
                {postcodeError && <div className="text-[10px] text-red-500 mt-0.5">{postcodeError}</div>}
                {postcodeCoords && <div className="text-[10px] text-pw-green mt-0.5">{postcodeCoords.name}</div>}
              </div>
              <div>
                <label className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mb-1 block">Distance</label>
                <select value={distance} onChange={function(e) { setDistance(parseInt(e.target.value)); if (parseInt(e.target.value) > 0 && !postcodeCoords && postcode) lookupPostcode(postcode) }}
                  className="w-full px-3 py-2 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1 appearance-none">
                  {DISTANCE_OPTIONS.map(function(o) { return <option key={o.value} value={o.value}>{o.label}</option> })}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mb-1 block">Industry</label>
                <select value={industry} onChange={function(e) { setIndustry(e.target.value) }}
                  className="w-full px-3 py-2 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1 appearance-none">
                  {INDUSTRIES.map(function(f) { return <option key={f.label} value={f.value}>{f.label}</option> })}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mb-1 block">Min salary</label>
                <select value={minSalary} onChange={function(e) { setMinSalary(parseInt(e.target.value)) }}
                  className="w-full px-3 py-2 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1 appearance-none">
                  {SALARY_OPTIONS.map(function(o) { return <option key={o.value} value={o.value}>{o.label}</option> })}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mb-1 block">Experience</label>
                <select value={expLevel} onChange={function(e) { setExpLevel(e.target.value) }}
                  className="w-full px-3 py-2 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1 appearance-none">
                  {EXP_LEVELS.map(function(f) { return <option key={f.label} value={f.value}>{f.label}</option> })}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mb-1 block">Remote</label>
                <select value={remoteFilter} onChange={function(e) { setRemoteFilter(e.target.value) }}
                  className="w-full px-3 py-2 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1 appearance-none">
                  <option value="">Any</option>
                  <option value="Remote">Fully remote</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="On-site">On-site</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <button onClick={function() { setShowVerifiedOnly(!showVerifiedOnly) }}
                className={'px-3 py-1.5 rounded-md text-xs font-semibold transition-all ' +
                  (showVerifiedOnly ? 'bg-pw-greenDark text-pw-greenText border border-pw-green/20' : 'bg-pw-bg text-pw-muted border border-pw-border')
                }>✓ Verified only</button>
              {activeFilterCount > 0 && (
                <button onClick={function() { setMinSalary(0); setIndustry(''); setExpLevel(''); setShowVerifiedOnly(false); setRemoteFilter(''); setPostcode(''); setPostcodeCoords(null); setDistance(0); setPostcodeError('') }}
                  className="text-xs text-red-500 hover:underline">Clear all</button>
              )}
              {minSalary > 0 && (
                <span className="text-[10px] text-pw-muted font-mono">Hiding jobs without disclosed salary</span>
              )}
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-16"><div className="text-pw-muted text-sm">Loading jobs...</div></div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-pw-text2 mb-2">No jobs match your search</p>
          <p className="text-xs text-pw-muted mb-3">Try different keywords or broaden your filters</p>
          <button onClick={function() { setQuery(''); setRegion('All'); setShowVerifiedOnly(false); setMinSalary(0); setIndustry(''); setExpLevel(''); setRemoteFilter(''); setPostcode(''); setPostcodeCoords(null); setDistance(0) }}
            className="text-pw-green text-sm hover:underline">Clear all filters</button>
        </div>
      ) : (
        <div>
          <div className="flex flex-col gap-2">
            {jobs.map(function(job) {
              return (
                <div key={job.id} className="relative">
                  <JobCard job={job} company={job.companies} />
                  {job._distance > 0 && (
                    <div className="absolute top-3 right-14 text-[9px] font-mono px-2 py-0.5 rounded bg-pw-bg text-pw-muted border border-pw-border">
                      {job._distance} mi
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {hasMore && (
            <div className="text-center mt-6">
              <button onClick={loadMore} disabled={loadingMore}
                className={'px-8 py-3 rounded-lg text-sm font-bold transition-all ' +
                  (loadingMore ? 'bg-pw-border text-pw-muted' : 'bg-white border border-pw-border text-pw-text1 hover:border-pw-green/30 hover:text-pw-green')
                }>{loadingMore ? 'Loading...' : 'Load more (' + jobs.length + ' of ' + totalCount.toLocaleString() + ')'}</button>
            </div>
          )}
          {!hasMore && jobs.length > 0 && (
            <div className="text-center mt-6 text-xs text-pw-muted font-mono">All {jobs.length.toLocaleString()} matching jobs shown</div>
          )}
        </div>
      )}
    </div>
  )
}
