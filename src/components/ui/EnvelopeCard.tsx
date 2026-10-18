// A sealed letter as readers see it: an envelope tied with twine under a wax seal, and only
// "From Ama · For Lily · Opens June 12, 2030". Never a title or a hint of the topic.
import { Lock, LockOpen, MoreVertical } from 'lucide-react'
import { useNavigate } from 'react-router'
import type { Envelope } from '../../types'
import { useSvgId } from './Illustration'

// onOpen: the family side shows a bottom sheet; without it, the card opens the letter page.
export function EnvelopeCard({ envelope, onOpen }: { envelope: Envelope; onOpen?: () => void }) {
  const navigate = useNavigate()
  const open = onOpen ?? (() => navigate(`/letter/${envelope.id}`))
  const Icon = envelope.openable ? LockOpen : Lock
  return (
    <article className={`surface-card relative flex overflow-hidden ${envelope.openable ? 'ring-2 ring-pine/40' : ''}`}>
      <button type="button" onClick={open} className="flex min-w-0 flex-1 items-center text-left" aria-label={`Letter from ${envelope.fromName} for ${envelope.forNames}. ${envelope.opensLabel}`}>
        <EnvelopeArt className="h-[112px] w-[112px] shrink-0" />
        <span className="min-w-0 flex-1 py-4 pr-9 pl-4">
          <span className="flex items-start gap-2 font-serif text-[17px] leading-snug text-ink">
            <Icon size={17} strokeWidth={1.75} className={`mt-[3px] shrink-0 ${envelope.openable ? 'text-pine' : 'text-vermilion'}`} aria-hidden="true" />
            <span className="min-w-0">
              From {envelope.fromName} · For {envelope.forNames}
            </span>
          </span>
          <span className={`mt-1.5 block pl-[25px] font-serif text-[14px] ${envelope.openable ? 'text-pine' : 'text-muted'}`}>
            {envelope.openable ? `${envelope.fromName} left you a letter for today` : envelope.opensLabel}
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={open}
        aria-label="About this sealed letter"
        aria-haspopup={onOpen ? 'dialog' : undefined}
        className="absolute top-1/2 right-1.5 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-ink/70 hover:bg-ink/5"
      >
        <MoreVertical size={18} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </article>
  )
}

// Cream paper envelope, flap folds, twine crossing, and a wax seal with a plum blossom.
export function EnvelopeArt({ className = '' }: { className?: string }) {
  const id = useSvgId('env')
  return (
    <svg viewBox="0 0 128 118" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true">
      <defs>
        <filter id={`${id}-paper`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="2" result="n" />
          <feColorMatrix in="n" values="0 0 0 0 0.45  0 0 0 0 0.36  0 0 0 0 0.25  0 0 0 0.16 0" result="grain" />
          <feComposite in="grain" in2="SourceGraphic" operator="in" result="g" />
          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="g" />
          </feMerge>
        </filter>
        <radialGradient id={`${id}-wax`} cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#e0654a" />
          <stop offset="0.6" stopColor="#c8492f" />
          <stop offset="1" stopColor="#9c3620" />
        </radialGradient>
      </defs>
      <rect width="128" height="118" fill="#ece2cf" filter={`url(#${id}-paper)`} />
      {/* flap folds */}
      <path d="M0 0 L64 62 L128 0" fill="none" stroke="#d4c6ab" strokeWidth="1" />
      <path d="M0 118 L52 66 M128 118 L76 66" fill="none" stroke="#ddd0b7" strokeWidth="0.8" />
      {/* twine */}
      <g stroke="#b5583c" strokeLinecap="round" fill="none">
        <path d="M0 61 Q64 58 128 63" strokeWidth="1.1" />
        <path d="M0 64 Q64 61 128 66" strokeWidth="0.7" strokeOpacity="0.7" />
        <path d="M62 0 Q60 59 63 118" strokeWidth="1.1" />
        <path d="M65 0 Q63 59 66 118" strokeWidth="0.7" strokeOpacity="0.7" />
        <path d="M60 70 Q52 84 47 92 M67 70 Q74 86 80 91" strokeWidth="1" />
      </g>
      {/* wax seal: an uneven blob, a ring, a five-petal blossom */}
      <path
        d="M64 44 C72 43 79 49 80 56 C82 63 78 71 71 73 C66 75 59 75 54 72 C48 68 46 61 48 55 C50 48 56 45 64 44 Z"
        fill={`url(#${id}-wax)`}
      />
      <circle cx="64" cy="59" r="10.5" fill="none" stroke="#9c3620" strokeOpacity="0.55" strokeWidth="1" />
      <g fill="#a93b25" fillOpacity="0.75">
        {[0, 72, 144, 216, 288].map((r) => (
          <ellipse key={r} cx="64" cy="54.2" rx="2.7" ry="4" transform={`rotate(${r} 64 59)`} />
        ))}
      </g>
      <circle cx="64" cy="59" r="1.8" fill="#f2b199" />
    </svg>
  )
}
