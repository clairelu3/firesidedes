// /letter/:id — open or read a letter. Readers see an envelope until it's openable; on the day:
// "Open now / Later / Open with someone", then heads-up (if sensitive) → P.S. → the letter →
// a voice reply. api.ts decides how much of the letter this viewer may see.
import { Copy, Mail, MailOpen } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { addReply, getLetter, getViewer, markLetterOpened, releaseAsKeeper } from '../api'
import { MiniRecorder } from '../components/MiniRecorder'
import { SequencePlayer } from '../components/SequencePlayer'
import { AppShell } from '../components/ui/AppShell'
import { AudioCard } from '../components/ui/AudioCard'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { PageHeader } from '../components/ui/PageHeader'
import { Diamond, DropCapParagraph } from '../components/ui/story'
import { PS_PROMPT_LABEL, releaseSummary } from '../lib/letterText'
import { publicBaseUrl } from '../lib/qrApi'
import type { FamilyMember, Letter, LetterAccess, LetterReply } from '../types'

type Phase = 'choices' | 'together' | 'headsup' | 'ps' | 'letter'

export default function LetterPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [access, setAccess] = useState<LetterAccess | null>(null)
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [phase, setPhase] = useState<Phase>('choices')
  const [confirmRelease, setConfirmRelease] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    const [a, v] = await Promise.all([getLetter(id), getViewer()])
    setAccess(a)
    setMembers(v.members)
    if (a.kind === 'reader' && a.opened) setPhase('letter')
  }

  useEffect(() => {
    load().catch((err) => {
      console.error(err)
      setAccess({ kind: 'hidden' })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [phase])

  // Opening is recorded once the letter itself is on screen.
  useEffect(() => {
    if (phase === 'letter' && access?.kind === 'reader' && !access.opened) {
      markLetterOpened(id).catch((err) => console.error(err))
    }
  }, [phase, access, id])

  if (access === null) {
    return (
      <AppShell>
        <p className="pt-10 text-center text-lg text-muted">Opening…</p>
      </AppShell>
    )
  }

  if (access.kind === 'hidden') {
    return (
      <AppShell>
        <PageHeader title="This letter isn’t for you" subtitle="Letters are only shown to the people they were written for." />
        <Button chevron className="w-full" onClick={() => navigate('/book')}>
          Open the family book
        </Button>
      </AppShell>
    )
  }

  if (access.kind === 'envelope') {
    const { envelope } = access
    return (
      <AppShell>
        <section className="rounded-[28px] bg-sand px-6 py-12 text-center shadow-card">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-paper text-ember">
            <Mail size={30} aria-hidden="true" />
          </span>
          <p className="text-display mt-5 text-[30px] text-ink">From {envelope.fromName}</p>
          <p className="mt-1 text-lg text-ink">For {envelope.forNames}</p>
          <p className="mt-4 text-base font-semibold text-muted">{envelope.opensLabel}</p>
        </section>

        {access.canKeeperRelease && (
          <Card className="mt-6">
            <p className="text-lg font-bold text-ink">{envelope.fromName} asked you to keep her letters until the time comes.</p>
            {confirmRelease ? (
              <div className="mt-4 rounded-2xl bg-ember-tint p-4">
                <p className="text-base font-semibold text-ink">
                  This opens every letter {envelope.fromName} left for when she’s gone, for everyone she chose. It can’t be undone.
                </p>
                <div className="mt-3 flex gap-3">
                  <Button variant="secondary" size="compact" className="flex-1" onClick={() => setConfirmRelease(false)}>
                    Not yet
                  </Button>
                  <Button
                    size="compact"
                    className="flex-1"
                    onClick={() =>
                      releaseAsKeeper()
                        .then(() => load())
                        .catch((err) => setError(err instanceof Error ? err.message : String(err)))
                    }
                  >
                    Release them
                  </Button>
                </div>
              </div>
            ) : (
              <Button className="mt-4 w-full" onClick={() => setConfirmRelease(true)}>
                Release {envelope.fromName}’s letters
              </Button>
            )}
            {error && <p className="mt-3 text-base text-ember-dark">{error}</p>}
          </Card>
        )}
      </AppShell>
    )
  }

  if (access.kind === 'author') {
    const { letter, replies } = access
    return (
      <AppShell>
        <PageHeader eyebrow="Your letter" title={letter.title} subtitle={releaseSummary(letter, members)} />
        <LetterBody letter={letter} fromName="you" />
        <Replies replies={replies} title="Replies" />
        <Button variant="ghost" className="mt-6 w-full" onClick={() => navigate('/letterbox')}>
          Back to my letterbox
        </Button>
      </AppShell>
    )
  }

  // --- reader ---
  const { letter, fromName, replies } = access
  const afterOpen = () => setPhase(letter.sensitive.flagged ? 'headsup' : letter.psPieces.length ? 'ps' : 'letter')
  const afterHeadsUp = () => setPhase(letter.psPieces.length ? 'ps' : 'letter')

  if (phase === 'choices') {
    return (
      <AppShell>
        <section className="rounded-[28px] bg-ember-tint px-6 py-12 text-center shadow-card">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-paper text-ember">
            <MailOpen size={30} aria-hidden="true" />
          </span>
          <h1 className="text-display mt-5 text-[32px] text-ink">{fromName} left you a letter for today</h1>
        </section>
        <div className="mt-6 space-y-3">
          <Button className="w-full" onClick={afterOpen}>
            Open now
          </Button>
          <Button variant="secondary" className="w-full" onClick={() => navigate('/book')}>
            Later
          </Button>
          <Button variant="secondary" className="w-full" onClick={() => setPhase('together')}>
            Open with someone
          </Button>
        </div>
      </AppShell>
    )
  }

  if (phase === 'together') {
    return <OpenTogether id={id} fromName={fromName} onOpen={afterOpen} />
  }

  if (phase === 'headsup') {
    return (
      <AppShell>
        <Card className="mt-4 py-10 text-center">
          <p className="text-display text-[28px] text-ink">This letter is about difficult things in our family.</p>
          <p className="mt-3 text-lg text-muted">Open it when you’re ready.</p>
          <div className="mt-8 space-y-3">
            <Button className="w-full" onClick={afterHeadsUp}>
              I’m ready
            </Button>
            <Button variant="secondary" className="w-full" onClick={() => navigate('/book')}>
              Later
            </Button>
          </div>
        </Card>
      </AppShell>
    )
  }

  if (phase === 'ps') {
    return (
      <AppShell>
        <PageHeader eyebrow={`A P.S. from ${fromName}`} title="Before you read" subtitle={`${fromName} recorded this just for you.`} />
        <div className="space-y-3">
          <SequencePlayer
            title={letter.psPieces.map((p) => PS_PROMPT_LABEL[p.prompt ?? 'ps']).join(' · ')}
            urls={letter.psPieces.map((p) => p.audioUrl)}
            variant="paper"
            autoPlay
          />
          {letter.psPieces.map((p) => p.transcript && <p key={p.id} className="text-story">{p.transcript}</p>)}
        </div>
        <Button chevron className="mt-8 w-full" onClick={() => setPhase('letter')}>
          Read the letter
        </Button>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <p className="text-eyebrow text-center">A letter from {fromName}</p>
      <h1 className="text-display mt-3 text-center text-[40px] text-ink">{letter.title}</h1>
      <Diamond className="mx-auto mt-5" />
      <div className="mt-8">
        <LetterBody letter={letter} fromName={fromName} />
      </div>

      {letter.sensitive.mentalHealth && (
        <p className="mt-10 border-t border-line pt-6 text-sm leading-normal text-muted">
          If any of this feels close to home, you don’t have to carry it alone. In the US, call or text 988 to reach the Suicide &amp; Crisis Lifeline, any time.
        </p>
      )}

      <section className="mt-10">
        <MiniRecorder
          label={`Send ${fromName} a voice reply`}
          hint={`A few words is enough. “Thank you, ${fromName}.”`}
          onSave={async (r) => {
            const reply = await addReply(letter.id, r.blob)
            setAccess({ ...access, replies: [...replies, reply] })
          }}
        />
        <Replies replies={replies} title="Your replies" />
      </section>
    </AppShell>
  )
}

// P.S. first, then each passage with the recording it came from underneath.
function LetterBody({ letter, fromName }: { letter: Letter; fromName: string }) {
  const pieceOf = (memoId: string) => letter.pieces.find((p) => p.id === memoId)
  return (
    <div className="space-y-6">
      {letter.psPieces.length > 0 && (
        <SequencePlayer title={`${fromName === 'you' ? 'Your' : `${fromName}’s`} P.S.`} urls={letter.psPieces.map((p) => p.audioUrl)} variant="sand" />
      )}
      {letter.passages.map((p, i) => {
        const piece = pieceOf(p.memoId)
        const lastOfPiece = letter.passages[i + 1]?.memoId !== p.memoId
        return (
          <div key={i} className="space-y-4">
            {i === 0 ? <DropCapParagraph>{p.text}</DropCapParagraph> : <p className="text-story">{p.text}</p>}
            {lastOfPiece && piece?.audioUrl && <AudioCard title={`Hear ${fromName === 'you' ? 'yourself' : fromName} tell it`} audioUrl={piece.audioUrl} variant="paper" />}
          </div>
        )
      })}
    </div>
  )
}

function Replies({ replies, title }: { replies: LetterReply[]; title: string }) {
  if (!replies.length) return null
  return (
    <div className="mt-6">
      <p className="text-eyebrow">{title}</p>
      <div className="mt-3 space-y-3">
        {replies.map((r) => (
          <AudioCard key={r.id} title={`From ${r.memberName}`} audioUrl={r.audioUrl} variant="paper" />
        ))}
      </div>
    </div>
  )
}

function OpenTogether({ id, fromName, onOpen }: { id: string; fromName: string; onOpen: () => void }) {
  const url = `${publicBaseUrl()}/letter/${id}`
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      window.prompt('Copy this link', url)
    }
  }

  return (
    <AppShell>
      <PageHeader title="Open it together" subtitle={`Send this to someone in your family, then open ${fromName}’s letter side by side. It only opens for the people she wrote it for.`} />
      <Card className="flex flex-col items-center text-center">
        <QRCodeCanvas value={url} size={220} marginSize={2} level="M" />
        <p className="mt-4 break-all text-sm text-muted">{url}</p>
        <Button variant="secondary" className="mt-4 w-full" onClick={copy} icon={<Copy size={20} aria-hidden="true" />}>
          {copied ? 'Copied!' : 'Copy link'}
        </Button>
      </Card>
      <Button className="mt-6 w-full" onClick={onOpen}>
        We’re ready. Open now
      </Button>
    </AppShell>
  )
}
