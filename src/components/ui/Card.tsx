import type { ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-3xl bg-paper p-6 shadow-card ${className}`}>{children}</section>
}

export function StepCard({
  step,
  title,
  subtitle,
  children,
}: {
  step: number
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ember-tint text-[17px] font-semibold text-ember" aria-hidden="true">
          {step}
        </span>
        <h2 className="text-display pt-0.5 text-[28px] text-ink">{title}</h2>
      </div>
      {subtitle && <p className="mt-3 text-base leading-normal text-muted">{subtitle}</p>}
      <div className="my-6 h-px bg-line" />
      {children}
    </Card>
  )
}
