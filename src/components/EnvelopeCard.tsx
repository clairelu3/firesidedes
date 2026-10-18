// A sealed letter as the reader sees it: who it's from, who it's for, when it opens. Nothing else.
import { Mail, MailOpen } from 'lucide-react'
import { Link } from 'react-router'
import type { Envelope } from '../types'

export function EnvelopeCard({ envelope }: { envelope: Envelope }) {
  const Icon = envelope.openable ? MailOpen : Mail
  return (
    <Link
      to={`/letter/${envelope.id}`}
      className={`flex items-center gap-4 rounded-2xl p-4 ${envelope.openable ? 'bg-ember-tint ring-2 ring-ember' : 'bg-sand'} hover:opacity-90`}
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-paper text-ember">
        <Icon size={22} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[17px] font-bold text-ink">
          From {envelope.fromName} · For {envelope.forNames}
        </span>
        <span className="block text-sm text-muted">{envelope.openable ? `${envelope.fromName} left you a letter for today` : envelope.opensLabel}</span>
      </span>
    </Link>
  )
}
