'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export default function CandidateUploadPage() {
  var router = useRouter()
  var { user, profile, loading: authLoading } = useAuth()
  var fileRef = useRef(null)
  var [dragOver, setDragOver] = useState(false)
  var [file, setFile] = useState(null)
  var [fileBase64, setFileBase64] = useState('')
  var [manualText, setManualText] = useState('')
  var [parsing, setParsing] = useState(false)
  var [parsed, setParsed] = useState(null)
  var [error, setError] = useState('')
  var [existingProfile, setExistingProfile] = useState(null)
  var [loadingProfile, setLoadingProfile] = useState(true)

  useEffect(function() {
    if (authLoading) return
    if (!user) { router.push('/login'); return }
    loadExistingProfile()
  }, [user, authLoading])

  async function loadExistingProfile() {
    if (!user) return
    var { data } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()
    if (data) setExistingProfile(data)
    setLoadingProfile(false)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    var f = e.dataTransfer?.files?.[0]
    if (f) processFile(f)
  }

  function handleFileSelect(e) {
    var f = e.target.files?.[0]
    if (f) processFile(f)
  }

  async function processFile(f) {
    var ext = f.name.split('.').pop().toLowerCase()
    if (!['pdf', 'txt'].includes(ext)) {
      setError('Please upload a PDF or text file')
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('File must be under 10MB')
      return
    }
    setFile(f)
    setError('')
    setParsed(null)
    setFileBase64('')

    if (ext === 'pdf') {
      // Read as base64 to send directly to Claude
      var reader = new FileReader()
      reader.onload = function(e) {
        var base64 = e.target.result.split(',')[1]
        setFileBase64(base64)
      }
      reader.readAsDataURL(f)
    } else if (ext === 'txt') {
      var text = await f.text()
      setManualText(text)
    }
  }

  async function handleParse() {
    if (!fileBase64 && !manualText.trim()) {
      setError('Upload a PDF or paste your CV text below.')
      return
    }
    setParsing(true)
    setError('')
    try {
      var body = { userId: user.id }
      if (fileBase64) {
        body.pdfBase64 = fileBase64
      } else {
        body.cvText = manualText.trim()
      }

      var res = await fetch('/api/parse-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      var data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Parsing failed')
      setParsed(data.profile)
    } catch (err) {
      setError(err.message)
    } finally {
      setParsing(false)
    }
  }

  var hasContent = fileBase64.length > 0 || manualText.trim().length > 100

  if (authLoading || loadingProfile) {
    return <div className="max-w-2xl mx-auto px-6 py-20 text-center text-pw-muted text-sm">Loading...</div>
  }

  // Success state - profile parsed
  if (parsed) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="w-16 h-16 rounded-full bg-pw-green flex items-center justify-center mx-auto mb-5 text-2xl text-black">✓</div>
        <h1 className="font-display text-3xl font-black tracking-tight text-center mb-2">CV analysed</h1>
        <p className="text-sm text-pw-text2 text-center mb-6">Here's what we extracted from your CV.</p>

        <div className="bg-pw-card border border-pw-border rounded-xl p-5 mb-4">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="font-display text-xl font-bold">{parsed.full_name}</h2>
              <p className="text-sm text-pw-text2 mt-0.5">{parsed.location} · {parsed.seniority} · {parsed.years_experience}+ years</p>
            </div>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-pw-greenDark text-pw-greenText font-bold border border-pw-green/20">AI PARSED</span>
          </div>

          <p className="text-sm text-pw-text3 leading-relaxed mb-4">{parsed.summary}</p>

          {parsed.job_titles && parsed.job_titles.length > 0 && (
            <div className="mb-4">
              <div className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mb-2">Target roles</div>
              <div className="flex gap-1.5 flex-wrap">
                {parsed.job_titles.map(function(t) { return <span key={t} className="px-2.5 py-1 rounded-md bg-pw-greenDark text-pw-greenText text-xs font-mono border border-pw-green/20">{t}</span> })}
              </div>
            </div>
          )}

          {parsed.skills && parsed.skills.length > 0 && (
            <div className="mb-4">
              <div className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mb-2">Skills</div>
              <div className="flex gap-1.5 flex-wrap">
                {parsed.skills.map(function(s) { return <span key={s} className="px-2.5 py-1 rounded-md bg-pw-bg text-pw-text3 text-xs font-mono border border-pw-border">{s}</span> })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            {parsed.education && (
              <div>
                <div className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mb-1">Education</div>
                <div className="text-pw-text3">{parsed.education}</div>
              </div>
            )}
            {parsed.salary_min > 0 && (
              <div>
                <div className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mb-1">Salary range</div>
                <div className="text-pw-green font-mono font-bold">£{Math.round(parsed.salary_min/1000)}k–£{Math.round(parsed.salary_max/1000)}k</div>
              </div>
            )}
            {parsed.preferred_locations && parsed.preferred_locations.length > 0 && (
              <div>
                <div className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mb-1">Preferred locations</div>
                <div className="text-pw-text3">{parsed.preferred_locations.join(', ')}</div>
              </div>
            )}
            {parsed.industries && parsed.industries.length > 0 && (
              <div>
                <div className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mb-1">Industries</div>
                <div className="text-pw-text3">{parsed.industries.join(', ')}</div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <Link href="/candidate/matches" className="flex-1 py-3.5 rounded-lg bg-pw-green text-white font-extrabold text-sm text-center hover:translate-y-[-1px] hover:shadow-lg hover:shadow-pw-green/20 transition-all">
            See matching jobs →
          </Link>
          <button onClick={function() { setParsed(null); setFile(null); setFileBase64(''); setManualText('') }} className="px-6 py-3.5 rounded-lg border border-pw-border text-pw-text2 font-bold text-sm hover:text-pw-text1 transition-colors">
            Re-upload
          </button>
        </div>
      </div>
    )
  }

  // Existing profile state
  if (existingProfile && !file && !manualText) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="font-display text-2xl font-black tracking-tight mb-1">Your profile</h1>
        <p className="text-xs text-pw-muted font-mono mb-6">Last updated {new Date(existingProfile.cv_parsed_at || existingProfile.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>

        <div className="bg-pw-card border border-pw-border rounded-xl p-5 mb-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h2 className="font-display text-xl font-bold">{existingProfile.full_name}</h2>
              <p className="text-sm text-pw-text2">{existingProfile.location} · {existingProfile.seniority} · {existingProfile.years_experience}+ years</p>
            </div>
            <span className={'text-[9px] font-mono px-2 py-0.5 rounded font-bold border ' + (existingProfile.open_to_work ? 'bg-pw-greenDark text-pw-greenText border-pw-green/20' : 'bg-pw-bg text-pw-muted border-pw-border')}>
              {existingProfile.open_to_work ? '✓ OPEN TO WORK' : 'NOT LOOKING'}
            </span>
          </div>

          <p className="text-sm text-pw-text3 leading-relaxed mb-4">{existingProfile.summary}</p>

          {existingProfile.skills && existingProfile.skills.length > 0 && (
            <div className="mb-3">
              <div className="text-[10px] font-mono text-pw-muted uppercase tracking-wider mb-2">Skills</div>
              <div className="flex gap-1.5 flex-wrap">
                {existingProfile.skills.map(function(s) { return <span key={s} className="px-2.5 py-1 rounded-md bg-pw-bg text-pw-text3 text-xs font-mono border border-pw-border">{s}</span> })}
              </div>
            </div>
          )}

          {existingProfile.salary_min > 0 && (
            <div className="text-sm">
              <span className="text-pw-muted">Expected salary: </span>
              <span className="text-pw-green font-mono font-bold">£{Math.round(existingProfile.salary_min/1000)}k–£{Math.round(existingProfile.salary_max/1000)}k</span>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Link href="/candidate/matches" className="flex-1 py-3.5 rounded-lg bg-pw-green text-white font-extrabold text-sm text-center hover:translate-y-[-1px] hover:shadow-lg hover:shadow-pw-green/20 transition-all">
            View matching jobs →
          </Link>
          <button onClick={function() { setExistingProfile(null) }} className="px-6 py-3.5 rounded-lg border border-pw-border text-pw-text2 font-bold text-sm hover:text-pw-text1 transition-colors">
            Upload new CV
          </button>
        </div>
      </div>
    )
  }

  // Upload state
  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <h1 className="font-display text-3xl font-black tracking-tight mb-2">Upload your CV</h1>
      <p className="text-sm text-pw-text2 mb-6">
        Our AI will extract your skills, experience, and preferences — then match you to the best roles ranked by fit and employer transparency.
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs">{error}</div>
      )}

      {/* Drop zone */}
      <input ref={fileRef} type="file" accept=".pdf,.txt" onChange={handleFileSelect} className="hidden" />
      <div
        onDragOver={function(e) { e.preventDefault(); setDragOver(true) }}
        onDragLeave={function() { setDragOver(false) }}
        onDrop={handleDrop}
        onClick={function() { fileRef.current?.click() }}
        className={'rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-all mb-4 ' + (dragOver ? 'border-pw-green bg-pw-greenDark/50' : file ? 'border-pw-green/30 bg-pw-greenDark' : 'border-pw-border bg-pw-card hover:border-pw-green/30')}
      >
        {file ? (
          <div>
            <div className="text-2xl mb-2">📄</div>
            <div className="text-sm font-bold text-pw-green">{file.name}</div>
            <div className="text-[10px] text-pw-muted font-mono mt-1">{Math.round(file.size / 1024)} KB · {fileBase64 ? 'Ready to analyse' : 'Processing...'} · Click to change</div>
          </div>
        ) : (
          <div>
            <div className="text-3xl mb-3">📤</div>
            <div className="text-sm font-bold text-pw-text1 mb-1">Drop your CV here or click to browse</div>
            <div className="text-xs text-pw-muted">PDF or text file · Max 10MB</div>
          </div>
        )}
      </div>

      {/* Manual text input */}
      <div className="mb-4">
        <label className="text-xs font-semibold text-pw-text3 mb-2 block">Or paste your CV text here</label>
        <textarea
          value={manualText}
          onChange={function(e) { setManualText(e.target.value); setFile(null); setFileBase64('') }}
          placeholder="Paste your CV/resume text here..."
          rows={8}
          className="w-full px-4 py-3 rounded-lg border border-pw-border bg-pw-bg text-sm text-pw-text1 resize-y font-mono text-xs leading-relaxed"
        />
      </div>

      {/* Parse button */}
      <button
        onClick={handleParse}
        disabled={parsing || !hasContent}
        className={'w-full py-4 rounded-xl font-extrabold text-sm transition-all ' + (parsing ? 'bg-pw-border text-pw-muted' : hasContent ? 'bg-pw-green text-white hover:translate-y-[-1px] hover:shadow-lg hover:shadow-pw-green/20' : 'bg-pw-border text-pw-muted cursor-not-allowed')}
      >
        {parsing ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            Analysing your CV with AI...
          </span>
        ) : hasContent ? 'Analyse CV & find matches →' : 'Upload or paste your CV above'}
      </button>

      <div className="mt-4 p-3 bg-pw-bg rounded-lg border border-pw-border">
        <div className="text-xs text-pw-text2 leading-relaxed">
          <strong className="text-pw-text1">How it works:</strong> Your CV is sent to our AI which extracts your skills, experience level, salary expectations, and preferences. We then match you against 10,000+ UK jobs ranked by how well they fit your profile — with transparency scores so you know which employers are worth applying to.
        </div>
      </div>
    </div>
  )
}
