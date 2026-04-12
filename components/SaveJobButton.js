'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export default function SaveJobButton({ jobId, size }) {
  var { user } = useAuth()
  var [saved, setSaved] = useState(false)
  var [loading, setLoading] = useState(false)

  useEffect(function() {
    if (!user || !jobId) return
    supabase
      .from('saved_jobs')
      .select('id')
      .eq('user_id', user.id)
      .eq('job_id', jobId)
      .single()
      .then(function(result) {
        if (result.data) setSaved(true)
      })
  }, [user, jobId])

  async function toggle(e) {
    e.preventDefault()
    e.stopPropagation()
    if (!user) return
    setLoading(true)

    if (saved) {
      await supabase.from('saved_jobs').delete().eq('user_id', user.id).eq('job_id', jobId)
      setSaved(false)
    } else {
      await supabase.from('saved_jobs').insert({ user_id: user.id, job_id: jobId })
      setSaved(true)
    }

    setLoading(false)
  }

  if (!user) return null

  var sizeClass = size === 'large' ? 'w-10 h-10 text-lg' : 'w-7 h-7 text-sm'

  return (
    <button onClick={toggle} disabled={loading} title={saved ? 'Unsave job' : 'Save job'}
      className={'rounded-full flex items-center justify-center border transition-all hover:scale-110 ' + sizeClass + ' ' +
        (saved ? 'bg-pw-greenDark border-pw-green/20 text-pw-green' : 'bg-white border-pw-border text-pw-muted hover:text-pw-green hover:border-pw-green/30')
      }>
      {saved ? '♥' : '♡'}
    </button>
  )
}
