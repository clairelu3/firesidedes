// /letterbox — the storyteller's home: write a letter, tell something she's never told anyone,
// hear replies, and manage "My letters". Only she can see or change these (checked in api.ts).
import { ChevronRight, Mail, PenLine, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { decideRelease, deleteLetter, finishLetter, getReleasePresets, getViewer, listMyLetters, releaseLetterNow, type Viewer } from '../api'
import { ReleasePicker, releaseChoiceError } from '../components/ReleasePicker'
import { SequencePlayer } from '../components/SequencePlayer'
import { AppShell } from '../components/ui/AppShell'
import { AudioCard } from '../components/ui/AudioCard'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { PageHeader } from '../components/ui/PageHeader'
import { firstName, formatMemoDate, greeting } from '../lib/format'
import { openedSummary, releaseSummary } from '../lib/letterText'
import type { FamilyMember, Letter, LetterReply, ReleaseChoice, ReleasePreset } from '../types'

type Data = { letters: Letter[]; replies: LetterReply[]; members: FamilyMember[] }

const GROUPS: { key: string; title: string; test: (l: Letter) => boolean }[] = [
  { key: 'undecided', title: 'Not sent yet', test: (l) => !l.decided },
  { key: 'sealed', title: 'Sealed', test: (l) => l.decided && (l.releaseMode === 'date' || l.releaseMode === 'after') },
  { key: 'private', title: 'Only for you', test: (l) => l.decided && l.releaseMode === 'private' },
  { key: 'sent', title: 'In the family book', test: (l) => l.decided && l.releaseMode === 'now' },
]

export default function Letterbox() {
  const navigate = useNavigate()
  const [viewer, setViewer] = useState<Viewer | null>(null)
  const [data, setData] = useState<Data | null>(null)
  const [presets, setPresets] = useState<ReleasePreset[]>([])
  const [error, setError] = useState(false)

  async function load() {
    const v = await getViewer()
    setViewer(v)
    if (!v.isStoryteller) return
    const [d, p] = await Promise.all([listMyLetters(), getReleasePresets()])
    setData(d)
    setPresets(p)
  }

  useEffect(() => {
    load().catch((err) => {
      console.error(err)
      setError(true)
    })
  }, [])

  if (viewer && !viewer.isStoryteller) {
    return (
      <AppShell>
        <PageHeader title={`${viewer.storytellerName}’s letterbox`} subtitle={`Only ${viewer.storytellerName} can open her letterbox. Letters she shares are in the family book.`} />
        <Button chevron className="w-full" onClick={() => navigate('/book')}>
          Open the family book
        </Button>
      </AppShell>
    )
  }

  const name = viewer?.storytellerName ?? ''
  const titleOf = (letterId: string) => data?.letters.find((l) => l.id === letterId)?.title ?? 'a letter'

  return (
    <AppShell>
      <PageHeader
        eyebrow={name ? `${greeting()}, ${firstName(name)}` : greeting()}
        title="Who would you like to write to?"
        subtitle="Every recording is a letter. You decide who hears it, and when."
      />

      <div className="space-y-4">
        <Card>
          <h2 className="text-display text-[28px] text-ink">Write a letter</h2>
          <p className="mt-1 text-base leading-normal text-muted">Share a memory with your family.</p>
          <Button className="mt-4 w-full" onClick={() => navigate('/record')} icon={<PenLine size={22} aria-hidden="true" />}>
            Write a letter
          </Button>
        </Card>
        <Card>
          <h2 className="text-display text-[28px] text-ink">Something you’ve never told anyone</h2>
          <p className="mt-1 text-base leading-normal text-muted">It starts sealed. No one can hear it until you decide.</p>
          <Button variant="secondary" className="mt-4 w-full" onClick={() => navigate('/record?secret=1')} icon={<Mail size={22} aria-hidden="true" />}>
            Start a sealed letter
          </Button>
        </Card>
      </div>

      {error && (
        <p className="mt-6 rounded-2xl bg-ember-tint px-4 py-3 text-base text-ember-dark" role="alert">
          We couldn’t load your letters. Check your connection and refresh.
        </p>
      )}

      {data && data.replies.length > 0 && (
        <section className="mt-8">
          <h2 className="text-display text-[26px] text-ink">Replies from your family</h2>
          <div className="mt-4 space-y-3">
            {data.replies.map((r) => (
              <AudioCard key={r.id} title={`${r.memberName} replied to “${titleOf(r.letterId)}”`} audioUrl={r.audioUrl} variant="paper" />
            ))}
          </div>
        </section>
      )}

      {data && (
        <section className="mt-8">
          <h2 className="text-display text-[26px] text-ink">My letters</h2>
          <p className="mt-1 text-sm font-medium text-muted">Only you can see these. {data.letters.length} {data.letters.length === 1 ? 'letter' : 'letters'}</p>
          {data.letters.length === 0 && (
            <Card className="mt-4">
              <p className="text-center text-base text-muted">Your letters will show up here.</p>
            </Card>
          )}
          {GROUPS.map((g) => {
            const letters = data.letters.filter(g.test)
            if (!letters.length) return null
            return (
              <div key={g.key} className="mt-6">
                <p className="text-eyebrow">{g.title}</p>
                <ul className="mt-3 space-y-3">
                  {letters.map((l) => (
                    <LetterItem
                      key={l.id}
                      letter={l}
                      members={data.members}
                      presets={presets}
                      replies={data.replies.filter((r) => r.letterId === l.id)}
                      onChanged={() => load().catch((err) => console.error(err))}
                    />
                  ))}
                </ul>
              </div>
            )
          })}
        </section>
      )}
    </AppShell>
  )
}

function LetterItem({
  letter,
  members,
  presets,
  replies,
  onChanged,
}: {
  letter: Letter
  members: FamilyMember[]
  presets: ReleasePreset[]
  replies: LetterReply[]
  onChanged: () => void
}) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [choice, setChoice] = useState<ReleaseChoice>({
    releaseMode: letter.releaseMode,
    releaseAt: letter.releaseAt,
    recipients: letter.recipients,
    keeperId: letter.keeperId,
  })

  const opened = Object.keys(letter.openedAt).length > 0
  const others = members.filter((m) => m.role !== 'storyteller')
  const openedLine = openedSummary(letter, members)

  async function act(action: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      setEditing(false)
      setConfirmDelete(false)
      onChanged()
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="overflow-hidden rounded-3xl bg-paper shadow-card">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-3 p-4 text-left">
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] font-bold text-ink">
            {letter.title}
            {letter.status === 'in_progress' && <span className="ml-2 rounded-md bg-draft px-1.5 py-0.5 align-middle text-xs font-semibold text-draft-ink">In progress</span>}
          </span>
          <span className="block text-sm text-muted">{releaseSummary(letter, members)}</span>
          <span className="block text-sm text-muted">
            {formatMemoDate(letter.createdAt)}
            {letter.pieces.length > 1 && ` · ${letter.pieces.length} parts`}
            {letter.psPieces.length > 0 && ' · with a P.S.'}
            {openedLine && ` · ${openedLine}`}
          </span>
        </span>
        <ChevronRight size={20} className={`shrink-0 text-muted ${open ? 'rotate-90' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <div className="space-y-3 border-t border-line p-4">
          <SequencePlayer title="Listen again" urls={[...letter.psPieces, ...letter.pieces].map((p) => p.audioUrl)} variant="field" />

          {replies.map((r) => (
            <AudioCard key={r.id} title={`Reply from ${r.memberName}`} audioUrl={r.audioUrl} variant="field" />
          ))}

          {opened ? (
            <p className="text-[15px] text-muted">Someone has opened this letter, so it can’t be changed.</p>
          ) : editing ? (
            <div className="space-y-3">
              <ReleasePicker value={choice} onChange={setChoice} presets={presets} members={others} storytellerName="you" />
              <div className="flex gap-3">
                <Button variant="secondary" size="compact" className="flex-1" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
                <Button
                  size="compact"
                  className="flex-1"
                  disabled={busy}
                  onClick={() => {
                    const problem = releaseChoiceError(choice)
                    if (problem) setError(problem)
                    else act(() => decideRelease(letter.id, choice))
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-2">
              <Button variant="field" size="compact" onClick={() => setEditing(true)}>
                {letter.decided ? 'Change the date or recipients' : 'Choose when they hear it'}
              </Button>
              {letter.releaseMode !== 'now' && (
                <Button variant="field" size="compact" disabled={busy} onClick={() => act(() => releaseLetterNow(letter.id))}>
                  Release now
                </Button>
              )}
              {letter.status === 'in_progress' && letter.releaseMode !== 'now' && (
                <>
                  <Button variant="field" size="compact" onClick={() => navigate(`/record?add=${letter.id}`)}>
                    Add to this letter
                  </Button>
                  <Button variant="field" size="compact" disabled={busy} onClick={() => act(() => finishLetter(letter.id))}>
                    This letter is finished
                  </Button>
                </>
              )}
              {confirmDelete ? (
                <div className="rounded-2xl bg-ember-tint p-4">
                  <p className="text-base font-semibold text-ink">Delete this letter? This can’t be undone.</p>
                  <div className="mt-3 flex gap-3">
                    <Button variant="secondary" size="compact" className="flex-1" onClick={() => setConfirmDelete(false)}>
                      Keep it
                    </Button>
                    <Button size="compact" className="flex-1" disabled={busy} onClick={() => act(() => deleteLetter(letter.id))}>
                      Delete
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="ghost" size="compact" onClick={() => setConfirmDelete(true)} icon={<Trash2 size={18} aria-hidden="true" />}>
                  Delete
                </Button>
              )}
            </div>
          )}

          {error && (
            <p className="rounded-2xl bg-ember-tint px-4 py-3 text-base text-ember-dark" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </li>
  )
}
