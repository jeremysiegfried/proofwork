'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import JobCard from './JobCard'
import { supabase } from '@/lib/supabase'

var REGIONS = ['All','London','Manchester','Edinburgh','Bristol','Brighton','Birmingham','Leeds','Glasgow','Liverpool','Remote']

var JOB_FIELDS = [
  { label: 'All fields', value: '' },
  { label: 'Engineering', value: 'engineer,developer,devops,architect,software,frontend,backend,fullstack,sre,platform' },
  { label: 'Data & Analytics', value: 'data,analyst,scientist,machine learning,ai,bi,analytics' },
  { label: 'Design', value: 'designer,ux,ui,creative,brand design,visual' },
  { label: 'Product', value: 'product manager,product owner,product lead,product director' },
  { label: 'Sales & BD', value: 'sales,account executive,business development,bdm,bdr,sdr,commercial' },
  { label: 'Marketing', value: 'marketing,seo,content,social media,growth,copywriter,pr ,communications' },
  { label: 'Finance', value: 'finance,accountant,fp&a,auditor,treasury,financial' },
  { label: 'Operations', value: 'operations,project manager,programme,logistics,supply chain,procurement' },
  { label: 'HR & People', value: 'hr manager,recruiter,talent,people,human resources,hr business' },
  { label: 'Legal', value: 'lawyer,solicitor,paralegal,legal,compliance' },
  { label: 'Healthcare', value: 'nurse,doctor,clinical,medical,healthcare,therapist' },
  { label: 'Education', value: 'teacher,lecturer,tutor,education,training' },
  { label: 'Customer', value: 'customer success,customer service,support manager,client' },
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
  { label: '£10k+', value: 10000 },
  { label: '£20k+', value: 20000 },
  { label: '£30k+', value: 30000 },
  { label: '£40k+', value: 40000 },
  { label: '£50k+', value: 50000 },
  { label: '£60k+', value: 60000 },
  { label: '£70k+', value: 70000 },
  { label: '£80k+', value: 80000 },
  { label: '£90k+', value: 90000 },
  { label: '£100k+', value: 100000 },
  { label: '£120k+', value: 120000 },
  { label: '£150k+', value: 150000 },
]

var PAGE_SIZE = 30

// Score a job's relevance to search terms
function scoreRelevance(job, searchWords) {
  var title = (job.title || '').toLowerCase()
  var companyName = (job.companies?.name || '').toLowerCase()
  var score = 0

  // Exact full query match in title = highest score
  var fullQuery = searchWords.join(' ')
  if (title.includes(fullQuery)) score += 100

  // Each matching word in title
  for (var i = 0; i < searchWords.length; i++) {
    var word = searchWords[i].toLowerCase()
    if (title.includes(word)) {
      score += 20
      // Bonus if word appears at the start of the title
      if (title.startsWith(word)) score += 5
    }
    // Company name match (lower priority)
    if (companyName.includes(word)) score += 5
  }

  // Bonus: all search words found in title = strong match
  var allMatch = true
  for (var j = 0; j < searchWords.length; j++) {
    if (!title.includes(searchWords[j].toLowerCase())) { allMatch = false; break }
  }
  if (allMatch) score += 50

  // Small trust score bonus as tiebreaker
  score += (job.trust_score || 0) / 100

  return score
}

export default function JobsList() {
  var searchParams = useSearchParams()
  var s = useState

  // Read URL params for initial values
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
  var [jobField, setJobField] = s('')
  var [expLevel, setExpLevel] = s('')
  var [showFilters, setShowFilters] = s(initSalary > 0 || initRemote)
  var [page, setPage] = s(0)
  var [hasMore, setHasMore] = s(true)
  var [totalCount, setTotalCount] = s(0)
  var [searchTimeout, setSearchTimeout] = s(null)
  var [remoteFilter, setRemoteFilter] = s(initRemote)

  var fetchJobs = useCallback(function(pageNum, append) {
    if (pageNum === 0) setLoading(true)
    else setLoadingMore(true)

    var isSearching = query.trim().length > 0
    var searchWords = query.trim().split(/\s+/).filter(function(w) { return w.length >= 2 })

    var q = supabase
      .from('jobs')
      .select('*, companies!inner(*)', { count: 'exact' })
      .eq('active', true)

    // Search — use OR to match title OR company name, then sort by relevance client-side
    if (isSearching && searchWords.length > 0) {
      // Build OR clauses: each word can appear in title OR company name
      var orClauses = []
      for (var w = 0; w < searchWords.length; w++) {
        orClauses.push('title.ilike.%' + searchWords[w] + '%')
        orClauses.push('companies.name.ilike.%' + searchWords[w] + '%')
      }
      q = q.or(orClauses.join(','))
    }

    if (region === 'Remote') {
      q = q.ilike('remote_policy', '%Remote%')
    } else if (region !== 'All') {
      q = q.eq('location', region)
    }

    if (remoteFilter) {
      if (remoteFilter === 'Remote') q = q.ilike('remote_policy', '%Remote%')
      else if (remoteFilter === 'Hybrid') q = q.eq('remote_policy', 'Hybrid')
      else if (remoteFilter === 'On-site') q = q.eq('remote_policy', 'On-site')
    }

    if (showVerifiedOnly) {
      q = q.eq('companies.claimed', true)
    }

    if (minSalary > 0) {
      q = q.gte('salary_min', minSalary)
    }

    if (jobField) {
      var fieldKeywords = jobField.split(',')
      var fieldClauses = fieldKeywords.map(function(kw) { return 'title.ilike.%' + kw.trim() + '%' }).join(',')
      q = q.or(fieldClauses)
    }

    if (expLevel) {
      var expKeywords = expLevel.split(',')
      var expClauses = expKeywords.map(function(kw) { return 'title.ilike.%' + kw.trim() + '%' }).join(',')
      q = q.or(expClauses)
    }

    // When searching, fetch more results so we can sort by relevance client-side
    // When not searching, use the selected sort
    if (isSearching) {
      // Fetch a larger batch for relevance sorting
      q = q.order('trust_score', { ascending: false })
      var fetchSize = PAGE_SIZE * 3 // fetch more so relevance sort has good candidates
      var from = pageNum * PAGE_SIZE
      q = q.range(0, fetchSize - 1) // always fetch from 0 for relevance sorting
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

      // If searching, sort by relevance
      if (isSearching && searchWords.length > 0) {
        data = data.map(function(job) {
          return { ...job, _relevance: scoreRelevance(job, searchWords) }
        })
        data.sort(function(a, b) { return b._relevance - a._relevance })

        // Paginate the sorted results
        var start = pageNum * PAGE_SIZE
        var paged = data.slice(start, start + PAGE_SIZE)

        if (append) setJobs(function(prev) { return prev.concat(paged) })
        else setJobs(paged)
        setTotalCount(result.count || 0)
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
  }, [query, region, sort, showVerifiedOnly, minSalary, jobField, expLevel, remoteFilter])

  useEffect(function() { setPage(0); fetchJobs(0, false) }, [region, sort, showVerifiedOnly, minSalary, jobField, expLevel, remoteFilter])

  useEffect(function() {
    if (searchTimeout) clearTimeout(searchTimeout)
    var t = setTimeout(function() { setPage(0); fetchJobs(0, false) }, 400)
    setSearchTimeout(t)
    return function() { clearTimeout(t) }
  }, [query])

  function loadMore() { var np = page + 1; setPage(np); fetchJobs(np, true) }

  var activeFilterCount = (minSalary > 0 ? 1 : 0) + (jobField ? 1 : 0) + (expLevel ? 1 : 0) + (showVerifiedOnly ? 1 : 0) + (remoteFilter ? 1 : 0)

  return (
    <div className="max-w-5xl mx-auto px-6 py-6">
      <h1 className="font-display text-2xl font-black tracking-tight mb-1 text-pw-text1">Open roles</h1>
      <p className="text-xs text-pw-muted font-mono mb-4">
        {totalCount.toLocaleString()} jobs{query ? ' matching "' + query + '"' : ''}{region !== 'All' ? ' in ' + region : ''}
      </p>

      <input value={query} onChange={function(e) { setQuery(e.target.value) }}
        placeholder="Search by job title or company..."
        className="w-full px-4 py-3 rounded-lg border border-pw-border bg-white text-sm text-pw-text1 mb-3" />

      <div className="flex justify-between items-center mb-3 gap-3 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {REGIONS.map(function(r) {
            return <button key={r} onClick={function() { setRegion(r) }}
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

      {/* Active search indicator */}
      {query.trim() && (
        <div className="mb-3 text-[10px] font-mono text-pw-green">
          ↑ Sorted by relevance to "{query}"
        </div>
      )}

      <div className="mb-4">
        <button onClick={function() { setShowFilters(!showFilters) }}
          className={'text-xs font-semibold transition-all ' + (showFilters || activeFilterCount > 0 ? 'text-pw-green' : 'text-pw-muted hover:text-pw-text2')}>
          {showFilters ? '▾ ' : '▸ '}Filters{activeFilterCount > 0 ? ' (' + activeFilterCount + ' active)' : ''}
        </button>

        {showFilters && (
          <div className="mt-2 p-4 bg-white border border-pw-border rounded-xl">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mb-1 block">Min salary</label>
                <select value={minSalary} onChange={function(e) { setMinSalary(parseInt(e.target.value)) }}
                  className="w-full px-3 py-2 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1 appearance-none">
                  {SALARY_OPTIONS.map(function(o) { return <option key={o.value} value={o.value}>{o.label}</option> })}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mb-1 block">Job field</label>
                <select value={jobField} onChange={function(e) { setJobField(e.target.value) }}
                  className="w-full px-3 py-2 rounded-md border border-pw-border bg-pw-bg text-sm text-pw-text1 appearance-none">
                  {JOB_FIELDS.map(function(f) { return <option key={f.label} value={f.value}>{f.label}</option> })}
                </select>
              </div>
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
                <button onClick={function() { setMinSalary(0); setJobField(''); setExpLevel(''); setShowVerifiedOnly(false); setRemoteFilter('') }}
                  className="text-xs text-red-500 hover:underline">Clear all</button>
              )}
              {minSalary > 0 && (
                <span className="text-[10px] text-pw-muted font-mono">
                  Hiding jobs without disclosed salary
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-16"><div className="text-pw-muted text-sm">Loading jobs...</div></div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-pw-text2 mb-2">No jobs match your filters</p>
          <button onClick={function() { setQuery(''); setRegion('All'); setShowVerifiedOnly(false); setMinSalary(0); setJobField(''); setExpLevel(''); setRemoteFilter('') }}
            className="text-pw-green text-sm hover:underline">Clear all filters</button>
        </div>
      ) : (
        <div>
          <div className="flex flex-col gap-2">
            {jobs.map(function(job) { return <JobCard key={job.id} job={job} company={job.companies} /> })}
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
