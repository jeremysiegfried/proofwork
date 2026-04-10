export default function TrustRing({ score, size = 48, label }) {
  const s = size
  const r = s / 2 - 3
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - score / 100)
  const color = score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <div className="shrink-0">
      <div className="relative" style={{ width: s, height: s }}>
        <svg width={s} height={s} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={s/2} cy={s/2} r={r} fill="none" stroke="#2a2a25" strokeWidth="2.5" />
          <circle
            cx={s/2} cy={s/2} r={r} fill="none" stroke={color} strokeWidth="2.5"
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            className="trust-ring"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center font-mono font-bold"
          style={{ fontSize: s * 0.3, color }}>
          {score}
        </div>
      </div>
      {label && (
        <div className="text-center mt-0.5 text-[8px] font-mono text-pw-muted uppercase tracking-wider">
          {label}
        </div>
      )}
    </div>
  )
}
