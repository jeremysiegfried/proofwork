import Link from 'next/link'
import TrustRing from './TrustRing'

export default function JobCard({ job, company }) {
  const hasSalary = job.salary_min > 0
  const claimed = company?.claimed || false

  return (
    <Link href={`/jobs/${job.slug}`}>
      <div className={`bg-pw-card border border-pw-border rounded-xl p-4 sm:p-5 cursor-pointer transition-all hover:border-pw-green/30 hover:bg-[#1e1e1b] ${claimed ? 'border-l-[3px] border-l-pw-green' : 'border-l-[3px] border-l-pw-border'}`}>
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1 min-w-0">
            {/* Title + badges */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-base sm:text-[17px] font-bold font-display tracking-tight truncate">{job.title}</span>
              {claimed ? (
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-pw-greenDark text-pw-green font-bold border border-pw-green/20">✓ VERIFIED</span>
              ) : job.source === 'adzuna' ? (
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-pw-border text-pw-muted font-semibold">via Adzuna</span>
              ) : (
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-pw-amberDark text-pw-amber font-semibold">UNCLAIMED</span>
              )}
            </div>

            {/* Company + location */}
            <div className="text-xs text-pw-text2 mb-2">
              <span className="font-semibold text-pw-text3">{company?.name || 'Unknown'}</span>
              <span className="text-pw-muted"> · {job.location} · {job.remote_policy} · {job.job_type}</span>
            </div>

            {/* Salary */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {hasSalary ? (
                <span className="font-mono text-base font-bold text-pw-green">
                  £{Math.round(job.salary_min/1000)}k–{Math.round(job.salary_max/1000)}k
                </span>
              ) : job.salary_estimated ? (
                <span className="font-mono text-sm text-pw-amber">
                  Est. {job.salary_estimated} <span className="text-pw-muted text-[10px]">(unverified)</span>
                </span>
              ) : (
                <span className="font-mono text-sm text-pw-muted">Salary not disclosed</span>
              )}
              {job.has_challenge && (
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-pw-greenDark text-pw-green font-bold border border-pw-green/20">⚡ CHALLENGE</span>
              )}
            </div>

            {/* Tags + company info */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {job.tags && job.tags.slice(0, 4).map((tag) => (
                <span key={tag} className="px-2 py-0.5 rounded bg-pw-bg text-pw-text2 text-[10px] font-mono">{tag}</span>
              ))}
              {company?.employee_count && (
                <span className="text-[10px] text-pw-muted ml-1">· {company.employee_count} employees</span>
              )}
              {company?.founded && (
                <span className="text-[10px] text-pw-muted">· est. {company.founded}</span>
              )}
            </div>
          </div>

          <TrustRing score={job.trust_score} size={48} label="trust" />
        </div>
      </div>
    </Link>
  )
}
