import type { ReactNode } from 'react'

export function ProgressBar({ value }: { value: number }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div className="h-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-ember transition-[width] duration-300" style={{ width: `${pct}%` }} />
    </div>
  )
}

export function PageHeader({
  eyebrow,
  counter,
  title,
  subtitle,
  progress,
}: {
  eyebrow?: string
  counter?: string
  title: ReactNode
  subtitle?: ReactNode
  progress?: number
}) {
  return (
    <header className="mb-6">
      {(eyebrow || counter) && (
        <div className="mb-3 flex items-center justify-between gap-4">
          <p className="text-eyebrow">{eyebrow}</p>
          {counter && <p className="text-sm font-medium text-muted">{counter}</p>}
        </div>
      )}
      <h1 className="text-display text-[clamp(36px,10.5vw,44px)] text-ink">{title}</h1>
      {subtitle && <p className="mt-3 text-[17px] leading-normal text-muted">{subtitle}</p>}
      {progress !== undefined && (
        <div className="mt-6">
          <ProgressBar value={progress} />
        </div>
      )}
    </header>
  )
}
