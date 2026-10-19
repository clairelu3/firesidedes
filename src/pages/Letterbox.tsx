// /letterbox — the storyteller's home: record a letter, hear replies, and manage her letters. Only she can see or change these (checked in api.ts).
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { decideRelease, deleteLetter, finishLetter, getMyName, getReleasePresets, getViewer, listMyLetters, releaseLetterNow, type Viewer } from '../api'
import { ReleasePicker, releaseChoiceError } from '../components/ReleasePicker'
import { AppShell } from '../components/ui/AppShell'
import { AudioCard } from '../components/ui/AudioCard'
import { Avatar } from '../components/ui/Avatar'
import { PrimaryButton, SecondaryButton } from '../components/ui/Button'
import type { MenuItem } from '../components/ui/CardMenu'
import { Card } from '../components/ui/Card'
import { Notice } from '../components/ui/Notice'
import { PageHeader } from '../components/ui/PageHeader'
import { RecordButton } from '../components/ui/RecordButton'
import { SectionHeader } from '../components/ui/SectionHeader'
import { formatMemoDate } from '../lib/format'
import { openedSummary, releaseSummary } from '../lib/letterText'
import type { FamilyMember, Letter, LetterReply, ReleaseChoice, ReleasePreset } from '../types'

type Data = { letters: Letter[]; replies: LetterReply[]; members: FamilyMember[] }

const RECENT = 3

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
  const [showAll, setShowAll] = useState(false)
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
        <PrimaryButton onClick={() => navigate('/book')}>Open the family book</PrimaryButton>
      </AppShell>
    )
  }

  const titleOf = (letterId: string) => data?.letters.find((l) => l.id === letterId)?.title ?? 'a letter'
  const letters = data?.letters ?? []

  return (
    <AppShell hero="hero-grandma">
      <PageHeader title="What do you remember?" subtitle="A place, a person, a taste, a moment. Your voice keeps it alive." />

      <RecordButton onClick={() => navigate('/record?start=1')} />

      {error && (
        <Notice tone="error" className="mt-6">
          We couldn’t load your letters. Check your connection and refresh.
        </Notice>
      )}

      {data && data.replies.length > 0 && (
        <section className="mt-8">
          <SectionHeader title="Replies from your family" />
          <div className="space-y-4">
            {data.replies.map((r) => (
              <AudioCard key={r.id} title={`From ${r.memberName}`} meta={`About “${titleOf(r.letterId)}”`} audioUrl={r.audioUrl} thumb={<Avatar name={r.memberName} size={96} />} />
            ))}
          </div>
        </section>
      )}

      {data && (
        <section className="mt-8">
          <SectionHeader
            title={showAll ? 'My letters' : 'Recent'}
            action={letters.length > RECENT || showAll ? { label: showAll ? 'Show less' : 'See all', onClick: () => setShowAll((s) => !s) } : undefined}
          />
          {letters.length === 0 && (
            <Card className="text-center">
              <p className="text-body text-muted">Your letters will show up here. Only you can see them.</p>
            </Card>
          )}
          {showAll ? (
            GROUPS.map((g) => {
              const inGroup = letters.filter(g.test)
              if (!inGroup.length) return null
              return (
                <div key={g.key} className="mt-5 first:mt-0">
                  <p className="text-eyebrow mb-3">{g.title}</p>
                  <div className="space-y-4">
                    {inGroup.map((l) => (
                      <LetterItem key={l.id} letter={l} members={data.members} presets={presets} onChanged={() => load().catch((err) => console.error(err))} />
                    ))}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="space-y-4">
              {letters.slice(0, RECENT).map((l) => (
                <LetterItem key={l.id} letter={l} members={data.members} presets={presets} onChanged={() => load().catch((err) => console.error(err))} />
              ))}
            </div>
          )}
          {letters.length > 0 && <p className="text-meta mt-4 text-center">Only you can see these letters.</p>}
        </section>
      )}
    </AppShell>
  )
}

function LetterItem({
  letter,
  members,
  presets,
  onChanged,
}: {
  letter: Letter
  members: FamilyMember[]
  presets: ReleasePreset[]
  onChanged: () => void
}) {
  const navigate = useNavigate()
  const [panel, setPanel] = useState<'none' | 'edit' | 'delete'>('none')
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

  async function act(action: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      setPanel('none')
      onChanged()
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const menu: MenuItem[] = [{ label: 'Open this letter', onSelect: () => navigate(`/letter/${letter.id}`) }]
  if (!opened) {
    menu.push({ label: letter.decided ? 'Change who and when' : 'Choose when they hear it', onSelect: () => setPanel('edit') })
    if (letter.releaseMode !== 'now') menu.push({ label: 'Release now', onSelect: () => act(() => releaseLetterNow(letter.id)) })
    if (letter.status === 'in_progress' && letter.releaseMode !== 'now') {
      menu.push({ label: 'Add to this letter', onSelect: () => navigate(`/record?add=${letter.id}`) })
      menu.push({ label: 'This letter is finished', onSelect: () => act(() => finishLetter(letter.id)) })
    }
    menu.push({ label: 'Delete', danger: true, onSelect: () => setPanel('delete') })
  }

  const note = [
    letter.status === 'in_progress' ? 'In progress' : null,
    releaseSummary(letter, members),
    letter.pieces.length > 1 ? `${letter.pieces.length} parts` : null,
    letter.psPieces.length ? 'with a P.S.' : null,
    openedSummary(letter, members),
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <AudioCard
      title={letter.title}
      meta={formatMemoDate(letter.createdAt)}
      note={note}
      urls={[...letter.psPieces, ...letter.pieces].map((p) => p.audioUrl)}
      from="you"
      thumb={letter.photoUrl ? <img src={letter.photoUrl} alt="" className="size-full object-cover" /> : <Avatar name={getMyName()} size={96} />}
      menu={menu}
    >
      {(panel !== 'none' || error) && (
        <div className="space-y-3">
          {panel === 'edit' && (
            <>
              <ReleasePicker value={choice} onChange={setChoice} presets={presets} members={others} storytellerName="you" />
              <div className="flex gap-3">
                <SecondaryButton compact onClick={() => setPanel('none')}>
                  Cancel
                </SecondaryButton>
                <PrimaryButton
                  compact
                  arrow={false}
                  disabled={busy}
                  onClick={() => {
                    const problem = releaseChoiceError(choice)
                    if (problem) setError(problem)
                    else act(() => decideRelease(letter.id, choice))
                  }}
                >
                  Save
                </PrimaryButton>
              </div>
            </>
          )}
          {panel === 'delete' && (
            <>
              <p className="text-body">Delete this letter? This can’t be undone.</p>
              <div className="flex gap-3">
                <SecondaryButton compact onClick={() => setPanel('none')}>
                  Keep it
                </SecondaryButton>
                <PrimaryButton compact arrow={false} disabled={busy} danger onClick={() => act(() => deleteLetter(letter.id))}>
                  Delete
                </PrimaryButton>
              </div>
            </>
          )}
          {error && <Notice tone="error">{error}</Notice>}
        </div>
      )}
    </AudioCard>
  )
}
