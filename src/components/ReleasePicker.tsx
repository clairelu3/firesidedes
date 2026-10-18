// "When should your family hear this?" Used after every recording and when changing a letter later.
import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { todayString } from '../lib/today'
import type { FamilyMember, ReleaseChoice, ReleaseMode, ReleasePreset } from '../types'

type Props = {
  value: ReleaseChoice
  onChange: (choice: ReleaseChoice) => void
  presets: ReleasePreset[]
  members: FamilyMember[] // family members other than the storyteller
  storytellerName: string
}

const MODES: { mode: ReleaseMode; label: string; hint: string }[] = [
  { mode: 'now', label: 'Now', hint: 'It goes to review, then into the family book.' },
  { mode: 'date', label: 'On a special day', hint: 'Sealed until a birthday or another day you choose.' },
  { mode: 'after', label: 'When I’m gone', hint: 'Someone you trust keeps it and opens it for the family.' },
  { mode: 'private', label: 'Only for me', hint: 'No one hears it. You can share it later.' },
]

export function releaseChoiceError(choice: ReleaseChoice): string | null {
  if (choice.releaseMode === 'date' && !choice.releaseAt) return 'Choose the day it opens.'
  if (choice.releaseMode === 'date' && choice.releaseAt && choice.releaseAt < todayString()) return 'Choose a day in the future.'
  if (choice.releaseMode === 'after' && !choice.keeperId) return 'Choose who keeps it.'
  if ((choice.releaseMode === 'date' || choice.releaseMode === 'after') && choice.recipients !== 'all' && choice.recipients.length === 0) return 'Choose who it’s for.'
  return null
}

function Option({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex w-full items-center gap-3 rounded-2xl p-4 text-left ${selected ? 'bg-ember-tint ring-2 ring-ember' : 'bg-field hover:bg-line'}`}
    >
      <span className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 ${selected ? 'border-ember bg-ember text-white' : 'border-muted/50'}`} aria-hidden="true">
        {selected && <Check size={14} strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </button>
  )
}

export function ReleasePicker({ value, onChange, presets, members, storytellerName }: Props) {
  const sealing = value.releaseMode === 'date' || value.releaseMode === 'after'
  const chosenPreset = presets.find((p) => p.date === value.releaseAt)

  function setMode(mode: ReleaseMode) {
    onChange({ ...value, releaseMode: mode })
  }

  function toggleRecipient(id: string) {
    const current = value.recipients === 'all' ? [] : value.recipients
    const next = current.includes(id) ? current.filter((r) => r !== id) : [...current, id]
    onChange({ ...value, recipients: next })
  }

  return (
    <div className="space-y-3">
      {MODES.map(({ mode, label, hint }) => (
        <div key={mode}>
          <Option selected={value.releaseMode === mode} onClick={() => setMode(mode)}>
            <span className="block text-lg font-bold text-ink">{label}</span>
            <span className="block text-[15px] leading-snug text-muted">{hint}</span>
          </Option>

          {mode === 'date' && value.releaseMode === 'date' && (
            <div className="mt-3 space-y-2 pl-4">
              {presets.map((p) => (
                <Option
                  key={p.id}
                  selected={value.releaseAt === p.date && chosenPreset?.id === p.id}
                  onClick={() =>
                    onChange({
                      ...value,
                      releaseAt: p.date,
                      // Default the recipient to the person whose day it is.
                      recipients: p.memberId && (value.recipients === 'all' || value.recipients.length === 0) ? [p.memberId] : value.recipients,
                    })
                  }
                >
                  <span className="text-base font-semibold text-ink">{p.label}</span>
                </Option>
              ))}
              <label className="block rounded-2xl bg-field p-4">
                <span className="mb-2 block text-sm font-semibold text-muted">Pick a date</span>
                <input
                  type="date"
                  min={todayString()}
                  value={value.releaseAt ?? ''}
                  onChange={(e) => onChange({ ...value, releaseAt: e.target.value || undefined })}
                  className="h-14 w-full rounded-xl bg-paper px-4 text-lg font-semibold text-ink outline-none focus-visible:ring-2 focus-visible:ring-ember/40"
                />
              </label>
            </div>
          )}

          {mode === 'after' && value.releaseMode === 'after' && (
            <div className="mt-3 space-y-2 pl-4">
              <p className="text-sm font-semibold text-muted">Who keeps it? Only they can open it for the family.</p>
              {members.map((m) => (
                <Option key={m.id} selected={value.keeperId === m.id} onClick={() => onChange({ ...value, keeperId: m.id })}>
                  <span className="text-base font-semibold text-ink">{m.name}</span>
                  {m.relationship && <span className="text-sm text-muted"> · {m.relationship}</span>}
                </Option>
              ))}
            </div>
          )}
        </div>
      ))}

      {sealing && (
        <div className="rounded-2xl border border-line p-4">
          <p className="text-lg font-bold text-ink">Who is it for?</p>
          <p className="text-[15px] text-muted">Only they will see it. Everyone else sees that {storytellerName} left a letter, nothing more.</p>
          <div className="mt-3 space-y-2">
            <Option selected={value.recipients === 'all'} onClick={() => onChange({ ...value, recipients: value.recipients === 'all' ? [] : 'all' })}>
              <span className="text-base font-semibold text-ink">The whole family</span>
            </Option>
            {members.map((m) => (
              <Option key={m.id} selected={value.recipients !== 'all' && value.recipients.includes(m.id)} onClick={() => toggleRecipient(m.id)}>
                <span className="text-base font-semibold text-ink">{m.name}</span>
                {m.relationship && <span className="text-sm text-muted"> · {m.relationship}</span>}
              </Option>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
