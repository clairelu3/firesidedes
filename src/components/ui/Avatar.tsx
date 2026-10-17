import { User } from 'lucide-react'
import { initials } from '../../lib/format'

type Variant = 'ember' | 'sand' | 'tint'

const variants: Record<Variant, string> = {
  ember: 'bg-ember text-white',
  sand: 'bg-sand text-ember',
  tint: 'bg-ember-tint text-ember',
}

export function Avatar({
  name,
  size = 44,
  variant = 'ember',
  maxLetters = 2,
}: {
  name?: string | null
  size?: number
  variant?: Variant
  maxLetters?: 1 | 2
}) {
  const letters = initials(name).slice(0, maxLetters)
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-sans font-semibold ${variants[variant]}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      aria-hidden="true"
    >
      {letters || <User size={Math.round(size * 0.45)} strokeWidth={2} />}
    </span>
  )
}
