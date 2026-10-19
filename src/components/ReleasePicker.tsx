// "When should they hear it?" — who it's for (RecipientRow) and when (OptionList).
// Used after every recording and when changing a letter later.
import { CalendarDays, Send } from 'lucide-react'
import { useState } from 'react'
import { formatDay, todayString } from '../lib/today'
import type { FamilyMember, ReleaseChoice, ReleaseMode, ReleasePreset } from '../types'
import { OptionList, OptionRow, PillButton, PillInput } from './ui/OptionList'
import { RecipientRow } from './ui/RecipientRow'

type Props = {
  value: ReleaseChoice
  onChange: (choice: ReleaseChoice) => void
  presets: ReleasePreset[]
  members: FamilyMember[] // family members other than the storyteller
  storytellerName: string
}

const MODES: { mode: ReleaseMode; label: string; hint: string; icon: typeof Send }[] = [
  { mode: 'now', label: 'Now', hint: 'They can hear it right away, once it’s in the book.', icon: Send },
  { mode: 'date', label: 'On a special day', hint: 'Choose a date for it to be released.', icon: CalendarDays },
]

export function releaseChoiceError(choice: ReleaseChoice): string | null {
  if (choice.releaseMode === 'date' && !choice.releaseAt) return 'Choose the day it opens.'
  if (choice.releaseMode === 'date' && choice.releaseAt && choice.releaseAt < todayString()) return 'Choose a day in the future.'
  if (choice.recipients !== 'all' && choice.recipients.length === 0) return 'Choose who it’s for.'
  return null
}

// "My granddaughter" from "Granddaughter".
const myRelation = (m: FamilyMember | undefined) => {
  const r = m?.relationship?.split('·')[0]?.trim()
  return r ? `My ${r.toLowerCase()}` : undefined
}

export function ReleasePicker({ value, onChange, presets, members, storytellerName }: Props) {
  const [choosingWho, setChoosingWho] = useState(false)
  const [choosingDay, setChoosingDay] = useState(false)
  const chosen = value.recipients === 'all' ? [] : members.filter((m) => (value.recipients as string[]).includes(m.id))
  const preset = presets.find((p) => p.date === value.releaseAt)

  function toggleRecipient(id: string) {
    const current = value.recipients === 'all' ? [] : value.recipients
    onChange({ ...value, recipients: current.includes(id) ? current.filter((r) => r !== id) : [...current, id] })
  }

  // Who it's for, as one row that opens the chooser below it.
  const recipientRow = (
    <RecipientRow
      name={chosen.length === 1 ? chosen[0]!.name : ''}
      group={chosen.length !== 1}
      title={value.recipients === 'all' ? 'For the whole family' : chosen.length ? `For ${chosen.map((m) => m.name).join(', ')}` : 'Choose who it’s for'}
      subtitle={
        value.recipients === 'all'
          ? 'Everyone in your family book'
          : chosen.length === 1
            ? myRelation(chosen[0])
            : `Only they will hear it. Others see that ${storytellerName} left a letter, nothing more.`
      }
      onClick={() => setChoosingWho((v) => !v)}
      expanded={choosingWho}
    />
  )

  return (
    <div>
      {recipientRow}
      {choosingWho && (
        <OptionList label="Who is it for" className="border-b border-hairline py-2">
          <OptionRow type="check" compact selected={value.recipients === 'all'} onSelect={() => onChange({ ...value, recipients: value.recipients === 'all' ? [] : 'all' })} title="The whole family" />
          {members.map((m) => (
            <OptionRow
              key={m.id}
              type="check"
              compact
              selected={value.recipients !== 'all' && value.recipients.includes(m.id)}
              onSelect={() => toggleRecipient(m.id)}
              title={m.name}
              subtitle={m.relationship}
            />
          ))}
        </OptionList>
      )}

      <OptionList label="When should they hear it" className="mt-2">
        {MODES.map(({ mode, label, hint, icon }) => (
          <OptionRow key={mode} selected={value.releaseMode === mode} onSelect={() => onChange({ ...value, releaseMode: mode })} icon={icon} title={label} subtitle={hint}>
            {mode === 'date' && (
              <div className="space-y-2">
                <PillButton onClick={() => setChoosingDay((v) => !v)} expanded={choosingDay}>
                  {value.releaseAt ? formatDay(value.releaseAt) : 'Choose a day'}
                </PillButton>
                {choosingDay && (
                  <div className="space-y-1 rounded-[12px] bg-card p-1.5">
                    {presets.map((p) => (
                      <OptionRow
                        key={p.id}
                        compact
                        selected={value.releaseAt === p.date && preset?.id === p.id}
                        onSelect={() => {
                          // Default the recipient to the person whose day it is.
                          const recipients = p.memberId && (value.recipients === 'all' || value.recipients.length === 0) ? [p.memberId] : value.recipients
                          onChange({ ...value, releaseAt: p.date, recipients })
                          setChoosingDay(false)
                        }}
                        title={p.label.split(' — ')[0]}
                        subtitle={formatDay(p.date)}
                      />
                    ))}
                    <label className="block px-3 py-2">
                      <span className="text-meta mb-1.5 block">Pick a date</span>
                      <PillInput type="date" min={todayString()} value={value.releaseAt ?? ''} onChange={(e) => onChange({ ...value, releaseAt: e.target.value || undefined })} />
                    </label>
                  </div>
                )}
              </div>
            )}
          </OptionRow>
        ))}
      </OptionList>
    </div>
  )
}
