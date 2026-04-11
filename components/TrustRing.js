export default function TrustRing({ score, size = 48, label }) {
  const r = (size - 6) / 2
  const c = 2 * Math.PI * r
  const pct = Math.min(100, Math.max(0, score))
  const offset = c - (pct / 100) * c
  const color = pct >= 70 ? '#16A34A' : pct >= 40 ? '#D97706' : '#DC2626'

  return (
    <div className="flex flex-col items-center shrink-0 relative">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E8E4DE" strokeWidth="2.5" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="2.5"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" className="trust-ring" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-mono font-bold" style={{ fontSize: size * 0.3, color }}>{score}</span>
      </div>
      {label && <div className="text-[7px] font-mono text-pw-muted uppercase mt-0.5 tracking-wide">{label}</div>}
    </div>
  )
}
