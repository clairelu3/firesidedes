// The release decision as separate full-screen steps for the storyteller, one question each:
// when → who → (which day). Shared by recording a letter and changing one later.
import type { FamilyMember, ReleaseChoice } from '../types'
import { recipientNames } from './letterText'
import { formatDay, todayString } from './today'

export type ReleaseStep = 'when' | 'who' | 'day'

export const isSealing = (c: ReleaseChoice) => c.releaseMode === 'date'

// Steps that apply to this choice, in order: every letter picks who it's for; a sealed one also picks the day.
export function releaseSteps(choice: ReleaseChoice): ReleaseStep[] {
  return choice.releaseMode === 'date' ? ['when', 'who', 'day'] : ['when', 'who']
}

// What's missing before Continue on a step, in words; null when it's fine.
export function stepProblem(step: ReleaseStep, choice: ReleaseChoice): string | null {
  if (step === 'who' && choice.recipients !== 'all' && choice.recipients.length === 0) return 'Choose who it’s for.'
  if (step === 'day' && !choice.releaseAt) return 'Choose the day it opens.'
  if (step === 'day' && choice.releaseAt && choice.releaseAt < todayString()) return 'Choose a day in the future.'
  return null
}

// The choice read back in plain words for the confirm screen.
export function releaseSentence(choice: ReleaseChoice, members: FamilyMember[]): string {
  const names = recipientNames(choice.recipients, members)
  switch (choice.releaseMode) {
    case 'now':
      return choice.recipients === 'all'
        ? 'It goes to the family book. Your family can read it once it’s approved.'
        : `It goes to the family book, only for ${names}. They can read it once it’s approved.`
    case 'date':
      return `Sealed for ${names}. Opens ${choice.releaseAt ? formatDay(choice.releaseAt) : 'on the day you chose'}.`
  }
}

export function releaseActionLabel(choice: ReleaseChoice): string {
  return choice.releaseMode === 'now' ? 'Send to the family book' : 'Seal this letter'
}

export const STEP_TITLES: Record<ReleaseStep, { title: string; subtitle: string }> = {
  when: { title: 'When should they hear it?', subtitle: 'You can choose who can hear this memory and when to release it.' },
  who: { title: 'Who is it for?', subtitle: 'The whole family, or only the people you choose. No one else will hear it.' },
  day: { title: 'Which day?', subtitle: 'It stays sealed until this day.' },
}
