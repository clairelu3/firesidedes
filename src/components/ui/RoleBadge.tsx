import { Sparkles } from 'lucide-react'
import type { FamilyRole } from '../../types'

const roleLabel: Record<FamilyRole, string> = {
  organizer: 'Organizer',
  storyteller: 'Storyteller',
  reader: 'Reader',
  member: 'Reader', // legacy role from before storyteller/reader existed
}

export function RoleBadge({ role }: { role: FamilyRole }) {
  const organizer = role === 'organizer'
  return (
    <span
      className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold ${
        organizer ? 'bg-ember-tint text-ember' : 'bg-field text-ink/70'
      }`}
    >
      {organizer && <Sparkles size={14} strokeWidth={2.25} aria-hidden="true" />}
      {roleLabel[role]}
    </span>
  )
}
