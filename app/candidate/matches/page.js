'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import TrustRing from '@/components/TrustRing'

function scoreMatch(job, profile) {
  var score = 0
  var maxScore = 0
  var reasons = []

  // 1. Title match (30 points)
  maxScore += 30
  if (profile.job_titles && profile.job_titles.length > 0) {
    var titleLower = (job.title || '').toLowerCase()
    var bestTitleMatch = 0
    for (var i = 0; i < profile.job_titles.length; i++) {
      var targetWords = profile.job_titles[i].toLowerCase().split(/\s+/)
      var matchCount = 0
      for (var w = 0; w < targetWords.length; w++) {
        if (targetWords[w].length >= 3 && titleLower.includes(targetWords[w])) matchCount++
      }
      var pct = targetWords.length > 0 ? matchCount / targetWords.length : 0
      if (pct > bestTitleMatch) bestTitleMatch = pct
    }
    var titleScore = Math.round(bestTitleMatch * 30)
    score += titleScore
    if (titleScore >= 20) reasons.push('Strong title match')
    else if (titleScore >= 10) reasons.push('Related role')
  }

  // 2. Skills match (30 points)
  maxScore += 30
  if (profile.skills && profile.skills.length > 0) {
    var descLower = ((job.description || '') + ' ' + (job.tags || []).join(' ')).toLowerCase()
    var titleAndDesc = ((job.title || '') + ' ' + descLower).toLowerCase()
    var matchedSkills = 0
    var totalSkills = Math.min(profile.skills.length, 15) // Cap at 15 most relevant
    for (var s = 0; s < totalSkills; s++) {
      if (titleAndDesc.includes(profile.skills[s].toLowerCase())) matchedSkills++
    }
    var skillPct = totalSkills > 0 ? matchedSkills / totalSkills : 0
    var skillScore = Math.round(skillPct * 30)
    score += skillScore
    if (matchedSkills >= 5) reasons.push(matchedSkills + ' skills match')
    else if (matchedSkills >= 2) reasons.push(matchedSkills + ' skills match')
  }

  // 3. Location match (15 points)
  maxScore += 15
  if (profile.preferred_locations && profile.preferred_locations.length > 0) {
    var jobLoc = (job.location || '').toLowerCase()
    var jobRemote = (job.remote_policy || '').toLowerCase()
    var locMatch = false
    for (var l = 0; l < profile.preferred_locations.length; l++) {
      if (jobLoc.includes(profile.preferred_locations[l].toLowerCase())) { locMatch = true; break }
    }
    if (jobRemote.includes('remote')) {
      score += 15
      reasons.push('Remote')
    } else if (locMatch) {
      score += 15
      reasons.push('In your area')
    } else if (jobRemote.includes('hybrid')) {
      score += 8
    }
  } else {
    score += 8 // Give some points if no location preference
  }

  // 4. Salary match (15 points)
  maxScore += 15
  if (profile.salary_min > 0 && job.salary_min > 0) {
    var salaryOverlap = job.salary_max >= profile.salary_min && job.salary_min <= profile.salary_max
    if (salaryOverlap) {
      score += 15
      reasons.push('Salary fits')
    } else if (job.salary_max >= profile.salary_min * 0.85) {
      score += 8
      reasons.push('Salary close')
    }
  } else {
    score += 5 // Unknown salary, give partial
  }

  // 5. Seniority match (10 points)
  maxScore += 10
  var seniorityMap = { 'Junior': 1, 'Mid': 2, 'Senior': 3, 'Lead': 4, 'Director': 5, 'Executive': 6 }
  var profileLevel = seniorityMap[profile.seniority] || 2
  var titleLow = (job.title || '').toLowerCase()
  var jobLevel = 2
  if (/\bjunior\b|\bgraduate\b|\bintern\b|\btrainee\b/.test(titleLow)) jobLevel = 1
  else if (/\bsenior\b|\bsr\b/.test(titleLow)) jobLevel = 3
  else if (/\blead\b|\bprincipal\b|\bstaff\b/.test(titleLow)) jobLevel = 4
  else if (/\bdirector\b|\bhead of\b|\bvp\b/.test(titleLow)) jobLevel = 5
  else if (/\bchief\b|\bcto\b|\bcfo\b|\bceo\b/.test(titleLow)) jobLevel = 6

  var levelDiff = Math.abs(profileLevel - jobLevel)
  if (levelDiff === 0) { score += 10; reasons.push('Right level') }
  else if (levelDiff === 1) score += 6
  else if (levelDiff === 2) score += 2

  // Normalize to percentage
  var fitScore = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0
  return { score: fitScore, reasons: reasons }
}

export default function CandidateMatchesPage() {
  var router = useRouter()
  var { user, profile: authProfile, loading: authLoading } = useAuth()
  var [candidateProfile, setCandidateProfile] = useState(null)
  var [jobs, setJobs] = useState([])
  var [matches, setMatches] = useState([])
  var [loading, setLoading] = useState(true)
  var [savedJobs, setSavedJobs] = useState({})
  var [filter, setFilter] = useState('all') // all, high, saved

  useEffect(function() {
    if (authLoading) return
    if (!user) { router.push('/login'); return }
    loadData()
  }, [user, authLoading])

  async function loadData() {
    // Load candidate profile
    var { data: cp } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!cp) {
      router.push('/candidate')
      return
    }
    setCandidateProfile(cp)

    // Load saved jobs
    var { data: saved } = await supabase
      .from('saved_jobs')
      .select('job_id')
      .eq('user_id', user.id)
    var savedMap = {}
    if (saved) saved.forEach(function(s) { savedMap[s.job_id] = true })
    setSavedJobs(savedMap)

    // Load jobs - get a broad set to match against
    // Build query based on profile
    var searchTerms = []
    if (cp.job_titles) searchTerms = searchTerms.concat(cp.job_titles)
    if (cp.skills && cp.skills.length > 0) searchTerms = searchTerms.concat(cp.skills.slice(0, 5))

    // Fetch jobs in batches to score
    var allJobs = []
    var batchSize = 500
    var offset = 0
    var hasMore = true

    while (hasMore && offset < 2000) {
      var q = supabase
        .from('jobs')
        .select('id, title, slug, description, location, remote_policy, salary_min, salary_max, trust_score, tags, job_type, companies(name, claimed)')
        .eq('active', true)
        .range(offset, offset + batchSize - 1)

      var { data: batch } = await q
      if (!batch || batch.length === 0) { hasMore = false; break }
      allJobs = allJobs.concat(batch)
      offset += batchSize
      if (batch.length < batchSize) hasMore = false
    }

    // Score all jobs
    var scored = allJobs.map(function(job) {
      var match = scoreMatch(job, cp)
      return { ...job, fitScore: match.score, fitReasons: match.reasons }
    })

    // Sort by fit score (then trust score as tiebreaker)
    scored.sort(function(a, b) {
      if (b.fitScore !== a.fitScore) return b.fitScore - a.fitScore
      return (b.trust_score || 0) - (a.trust_score || 0)
    })

    setMatches(scored)
    setLoading(false)
  }

  async function toggleSave(jobId) {
    if (savedJobs[jobId]) {
      await supabase.from('saved_jobs').delete().eq('user_id', user.id).eq('job_id', jobId)
      setSavedJobs(function(prev) { var n = { ...prev }; delete n[jobId]; return n })
    } else {
      await supabase.from('saved_jobs').insert({ user_id: user.id, job_id: jobId })
      setSavedJobs(function(prev) { return { ...prev, [jobId]: true } })
    }
  }

  if (authLoading || loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20 text-center">
        <div className="w-8 h-8 rounded-full border-2 border-pw-green border-t-transparent animate-spin mx-auto mb-4" />
        <div className="text-pw-muted text-sm">Finding your best matches...</div>
      </div>
    )
  }

  var filtered = matches
  if (filter === 'high') filtered = matches.filter(function(m) { return m.fitScore >= 60 })
  else if (filter === 'saved') filtered = matches.filter(function(m) { return savedJobs[m.id] })

  var highMatches = matches.filter(function(m) { return m.fitScore >= 60 }).length
  var medMatches = matches.filter(function(m) { return m.fitScore >= 40 && m.fitScore < 60 }).length

  function getFitColor(score) {
    if (score >= 70) return 'text-pw-green'
    if (score >= 50) return 'text-pw-amber'
    return 'text-pw-muted'
  }

  function getFitBg(score) {
    if (score >= 70) return 'bg-pw-greenDark border-pw-green/20'
    if (score >= 50) return 'bg-pw-amberDark border-pw-amber/20'
    return 'bg-pw-bg border-pw-border'
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h1 className="font-display text-2xl font-black tracking-tight">Your matches</h1>
          <p className="text-xs text-pw-muted font-mono mt-1">
            {highMatches} strong · {medMatches} good · {matches.length.toLocaleString()} total
          </p>
        </div>
        <Link href="/candidate" className="px-4 py-2 rounded-lg border border-pw-border text-pw-text2 text-xs font-semibold hover:text-pw-text1 transition-all">
          Edit profile
        </Link>
      </div>

      {/* Profile summary bar */}
      {candidateProfile && (
        <div className="bg-pw-card border border-pw-border rounded-xl p-3 mb-4 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-bold">{candidateProfile.full_name}</span>
          <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-pw-greenDark text-pw-greenText border border-pw-green/20">{candidateProfile.seniority}</span>
          {candidateProfile.skills && candidateProfile.skills.slice(0, 5).map(function(s) {
            return <span key={s} className="text-[10px] font-mono px-2 py-0.5 rounded bg-pw-bg text-pw-muted border border-pw-border">{s}</span>
          })}
          {candidateProfile.skills && candidateProfile.skills.length > 5 && (
            <span className="text-[10px] text-pw-muted font-mono">+{candidateProfile.skills.length - 5} more</span>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-1.5 mb-4">
        {[
          { key: 'all', label: 'All matches' },
          { key: 'high', label: 'Strong (60%+)' },
          { key: 'saved', label: 'Saved ♥' }
        ].map(function(f) {
          return <button key={f.key} onClick={function() { setFilter(f.key) }}
            className={'px-3 py-1.5 rounded-full text-xs font-semibold transition-all ' +
              (filter === f.key ? 'border border-pw-green bg-pw-greenDark text-pw-greenText' : 'border border-pw-border text-pw-muted hover:text-pw-text2')
            }>{f.label}</button>
        })}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="bg-pw-card border border-pw-border rounded-xl p-8 text-center">
          <p className="text-sm text-pw-text2 mb-2">
            {filter === 'saved' ? 'No saved jobs yet. Click ♥ on any match to save it.' : 'No matches found for this filter.'}
          </p>
          <button onClick={function() { setFilter('all') }} className="text-pw-green text-sm hover:underline">Show all matches</button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.slice(0, 50).map(function(job) {
            var hasSalary = job.salary_min > 0
            var isEstimate = hasSalary && job.salary_min === job.salary_max
            var claimed = job.companies?.claimed

            return (
              <div key={job.id} className={'bg-white border border-pw-border rounded-xl p-4 transition-all hover:border-pw-green/40 hover:shadow-sm ' + (claimed ? 'border-l-[3px] border-l-pw-green' : '')}>
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Link href={'/jobs/' + job.slug} className="text-[15px] font-bold font-display tracking-tight text-pw-text1 hover:text-pw-green transition-colors">
                        {job.title}
                      </Link>
                      <span className={'text-[9px] font-mono px-2 py-0.5 rounded font-bold border ' + getFitBg(job.fitScore)}>
                        <span className={getFitColor(job.fitScore)}>{job.fitScore}% fit</span>
                      </span>
                      {claimed && (
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-pw-greenDark text-pw-greenText font-bold border border-pw-green/20">✓</span>
                      )}
                    </div>
                    <div className="text-[13px] text-pw-text2 mb-1.5">
                      <span className="font-semibold text-pw-text3">{job.companies?.name || 'Unknown'}</span>
                      <span className="text-pw-muted"> · {job.location}</span>
                      {job.remote_policy && job.remote_policy !== 'On-site' && (
                        <span className="text-pw-muted"> · {job.remote_policy}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {hasSalary && !isEstimate ? (
                        <span className="font-mono text-sm font-bold text-pw-green">£{Math.round(job.salary_min/1000)}k–£{Math.round(job.salary_max/1000)}k</span>
                      ) : hasSalary && isEstimate ? (
                        <span className="font-mono text-sm text-pw-amber">~£{Math.round(job.salary_min/1000)}k</span>
                      ) : null}
                      {job.fitReasons && job.fitReasons.map(function(r) {
                        return <span key={r} className="text-[9px] font-mono px-2 py-0.5 rounded bg-pw-bg text-pw-muted border border-pw-border">{r}</span>
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={function(e) { e.preventDefault(); toggleSave(job.id) }}
                      className={'text-lg transition-all hover:scale-110 ' + (savedJobs[job.id] ? 'text-red-500' : 'text-pw-border hover:text-red-300')}>
                      {savedJobs[job.id] ? '♥' : '♡'}
                    </button>
                    <TrustRing score={job.trust_score} size={40} />
                  </div>
                </div>
              </div>
            )
          })}

          {filtered.length > 50 && (
            <div className="text-center mt-4 text-xs text-pw-muted font-mono">
              Showing top 50 of {filtered.length.toLocaleString()} matches
            </div>
          )}
        </div>
      )}
    </div>
  )
}
