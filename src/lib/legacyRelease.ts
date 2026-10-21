// Letters saved before "When I am gone" and "Only for me" were removed can still hold those
// release modes (localStorage demo data, older database rows). Read them as "Now" but not yet
// decided, so nothing reaches the family until she chooses again.
import type { Letter, ReleaseMode } from '../types'

export const RELEASE_MODES: readonly ReleaseMode[] = ['now', 'date']

export function withKnownRelease(l: Letter): Letter {
  if (RELEASE_MODES.includes(l.releaseMode)) return l
  return { ...l, releaseMode: 'now', decided: false, sealedAt: undefined }
}
