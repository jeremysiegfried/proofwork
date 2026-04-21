'use client'
import Link from 'next/link'

// Only shows assessment CTA if company is claimed and has assessment enabled
export default function AssessmentCTA({ job, company }) {
  // Don't show if company hasn't claimed their profile
  if (!company?.claimed) return null

  // Don't show if assessments aren't enabled for this job
  if (!job.has_challenge) return null

  return (
    <div className="mt-3 bg-pw-card border border-pw-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">⚡</span>
        <div className="text-sm font-bold text-pw-text1">Skill Assessment</div>
        <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-pw-greenDark text-pw-greenText border border-pw-green/20">Required by {company.name}</span>
      </div>
      <p className="text-xs text-pw-text2 leading-relaxed mb-3">
        {company.name} requires candidates to complete a skill assessment before applying. Complete the timed challenge to get a verified score.
      </p>
      <Link href={'/assessment/' + job.id} className="block w-full py-2.5 rounded-lg border-2 border-pw-green text-pw-green font-bold text-sm text-center hover:bg-pw-greenDark transition-all">
        Take assessment →
      </Link>
    </div>
  )
}
