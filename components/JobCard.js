'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import TrustRing from './TrustRing'

function getLevel(title) {
  if (!title) return null
  var t = title.toLowerCase()
  if (/\bdirector\b|\bhead of\b|\bvp\b|\bchief\b/.test(t)) return 'Director+'
  if (/\blead\b|\bprincipal\b|\bstaff\b/.test(t)) return 'Lead'
  if (/\bsenior\b|\bsr\b/.test(t)) return 'Senior'
  if (/\bmanager\b/.test(t)) return 'Manager'
  if (/\bjunior\b|\bgraduate\b|\bintern\b|\btrainee\b|\bentry/i.test(t)) return 'Junior'
  return null
}

export default function JobCard({ job, company }) {
  var router = useRouter()
  var hasSalary = job.salary_min > 0
  var claimed = company ? company.claimed : false
  var isEstimate = hasSalary && job.salary_min === job.salary_max
  var level = getLevel(job.title)

  function handleCardClick(e) {
    // Don't navigate if clicking the company link
    if (e.target.closest('[data-company-link]')) return
    router.push('/jobs/' + job.slug)
  }

  return (
    <div onClick={handleCardClick}
      className={'bg-white border border-pw-border rounded-xl p-4 sm:p-5 cursor-pointer transition-all hover:border-pw-green/40 hover:shadow-sm ' + (claimed ? 'border-l-[3px] border-l-pw-green' : '')}>
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          {/* Title */}
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className="text-[15px] font-bold font-display tracking-tight text-pw-text1">{job.title}</span>
            {claimed && (
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-pw-greenDark text-pw-greenText font-bold border border-pw-green/20">✓ VERIFIED</span>
            )}
          </div>

          {/* Info bar */}
          <div className="text-[13px] text-pw-text2 mb-2">
            {company && company.slug ? (
              <Link href={'/companies/' + company.slug} data-company-link="true"
                className="font-semibold text-pw-text3 hover:text-pw-green transition-colors"
                onClick={function(e) { e.stopPropagation() }}>
                {company.name}
              </Link>
            ) : (
              <span className="font-semibold text-pw-text3">{company ? company.name : 'Unknown'}</span>
            )}
            <span className="text-pw-muted"> · {job.location}</span>
            {job.remote_policy && job.remote_policy !== 'On-site' && (
              <span className="text-pw-muted"> · {job.remote_policy}</span>
            )}
            <span className="text-pw-muted"> · {job.job_type || 'Full-time'}</span>
          </div>

          {/* Salary */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {hasSalary && !isEstimate ? (
              <span className="font-mono text-sm font-bold text-pw-green">
                £{Math.round(job.salary_min/1000)}k–{Math.round(job.salary_max/1000)}k
              </span>
            ) : hasSalary && isEstimate ? (
              <span className="font-mono text-sm text-pw-amber">
                ~£{Math.round(job.salary_min/1000)}k <span className="text-pw-muted text-[10px]">(est.)</span>
              </span>
            ) : (
              <span className="font-mono text-xs text-pw-muted">Salary not disclosed</span>
            )}
            {level && (
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">{level}</span>
            )}
            {job.has_challenge && (
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-pw-greenDark text-pw-greenText font-bold border border-pw-green/20">⚡ CHALLENGE</span>
            )}
          </div>

          {/* Tags */}
          {job.tags && job.tags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {job.tags.slice(0, 4).map(function(tag) {
                return <span key={tag} className="px-2 py-0.5 rounded bg-pw-bg text-pw-text2 text-[10px] font-mono border border-pw-border">{tag}</span>
              })}
            </div>
          )}
        </div>
        <TrustRing score={job.trust_score} size={44} label="transparency" />
      </div>
    </div>
  )
}
