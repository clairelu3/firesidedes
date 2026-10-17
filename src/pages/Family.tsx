import { Camera, LoaderCircle, Plus, Users } from 'lucide-react'
import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router'
import {
  getCurrentMember,
  getFamily,
  getMyIdentity,
  joinFamily,
  listFamilyMembers,
  saveCurrentMember,
  saveMyIdentity,
  uploadFamilyPhoto,
} from '../api'
import { InviteSheet } from '../components/InviteSheet'
import { AppShell } from '../components/ui/AppShell'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Field } from '../components/ui/Field'
import { PageHeader } from '../components/ui/PageHeader'
import { RoleBadge } from '../components/ui/RoleBadge'
import { NotAnImageError } from '../lib/image'
import type { Family as FamilyType, FamilyMember } from '../types'

// NOTE: roles are checked in the browser only (identity = a member id in localStorage).
// This is a hackathon demo, not real security — the database accepts writes from anyone.

const TITLE = 'Set up your family'
const SUBTITLE = 'Start a private home for the stories your family wants to keep.'

export default function Family() {
  const params = useParams()
  // /family/:code from an invite link; plain /family reopens the family you joined last.
  const code = params.code ?? getMyIdentity()?.code ?? 'default'
  const navigate = useNavigate()
  const [family, setFamily] = useState<FamilyType | null>(null)
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [memberId, setMemberId] = useState<string | null>(() => getCurrentMember(code))
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [inviting, setInviting] = useState(false)

  async function refresh() {
    const [f, m] = await Promise.all([getFamily(code), listFamilyMembers(code)])
    setFamily(f)
    setMembers(m)
  }

  useEffect(() => {
    setMemberId(getCurrentMember(code))
    setLoading(true)
    setLoadError(false)
    refresh()
      .catch((err) => {
        console.error(err)
        setLoadError(true)
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  // A saved id that isn't in this family (e.g. the data was reset) counts as not joined.
  const me = members.find((m) => m.id === memberId)

  useEffect(() => {
    if (me) saveMyIdentity({ code, name: me.name })
  }, [code, me])

  if (loading) {
    return (
      <AppShell>
        <PageHeader counter="1 of 2" title={TITLE} subtitle={SUBTITLE} />
        <p className="text-center text-lg text-muted">Loading your family…</p>
      </AppShell>
    )
  }

  if (loadError) {
    return (
      <AppShell>
        <PageHeader counter="1 of 2" title={TITLE} subtitle={SUBTITLE} />
        <Card>
          <p className="text-lg text-ink">We couldn’t load this family. Check your connection and refresh the page.</p>
        </Card>
      </AppShell>
    )
  }

  if (!me) {
    return (
      <AppShell>
        <JoinScreen
          family={family}
          onJoin={async (name) => {
            const member = await joinFamily(code, name)
            saveCurrentMember(code, member.id)
            setMemberId(member.id)
            await refresh()
          }}
        />
      </AppShell>
    )
  }

  const isOrganizer = me.role === 'organizer'
  const familyName = family?.name ?? 'Our family'
  const since = new Date(family?.createdAt ?? Date.now()).getFullYear()

  return (
    <AppShell>
      <PageHeader counter="1 of 2" title={TITLE} subtitle={SUBTITLE} />

      <div className="space-y-6">
        <CoverCard
          code={code}
          familyName={familyName}
          since={since}
          photoUrl={family?.photoUrl}
          isOrganizer={isOrganizer}
          onUploaded={(photoUrl) => setFamily((f) => (f ? { ...f, photoUrl } : f))}
        />

        <Card>
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-display text-[28px] text-ink">Family roles</h2>
            <p className="shrink-0 text-sm font-medium text-muted">
              {members.length} {members.length === 1 ? 'person' : 'people'}
            </p>
          </div>
          <p className="mt-2 text-[15px] leading-normal text-muted">
            Everyone can have more than one role, but each family has one organizer.
          </p>

          <ul className="mt-2 divide-y divide-line">
            {members.map((m) => {
              const isMe = m.id === me.id
              const subtext = m.relationship ?? (m.role === 'organizer' ? 'Started this family' : undefined)
              return (
                <li key={m.id} className="flex items-center gap-4 py-4">
                  <Avatar name={m.name} size={56} variant={isMe ? 'ember' : 'sand'} />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-lg leading-snug font-bold break-words text-ink">
                      <span className="min-w-0">{m.name}</span>
                      {isMe && <span className="shrink-0 rounded-md bg-field px-1.5 py-0.5 text-xs font-semibold text-muted">You</span>}
                    </p>
                    {subtext && <p className="text-sm leading-snug text-muted">{subtext}</p>}
                  </div>
                  <RoleBadge role={m.role} />
                </li>
              )
            })}
          </ul>

          <button
            type="button"
            onClick={() => setInviting(true)}
            className="mx-auto mt-2 flex h-12 items-center gap-2 rounded-xl px-4 text-lg font-semibold text-ember hover:bg-ember-tint/50"
          >
            <Plus size={20} strokeWidth={2.5} aria-hidden="true" />
            Invite a family member
          </button>

          <div className="mt-4 flex gap-4 rounded-2xl bg-field p-5">
            <Users size={24} className="mt-0.5 shrink-0 text-ember" aria-hidden="true" />
            <div>
              <p className="text-base font-bold text-ink">What does the organizer do?</p>
              <p className="mt-1 text-[15px] leading-normal text-muted">
                Manages invites, the family cover, and who can see or contribute stories.
              </p>
            </div>
          </div>
        </Card>

        <div>
          <Button chevron className="w-full" onClick={() => navigate('/life')}>
            Continue to your life map
          </Button>
          <p className="mt-4 text-center text-sm leading-normal text-muted">
            Your family space is private. Only invited members can enter.
          </p>
        </div>
      </div>

      {inviting && <InviteSheet code={code} familyName={familyName} onClose={() => setInviting(false)} />}
    </AppShell>
  )
}

function JoinScreen({ family, onJoin }: { family: FamilyType | null; onJoin: (name: string) => Promise<void> }) {
  const [name, setName] = useState('')
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setJoining(true)
    setError(false)
    try {
      await onJoin(trimmed)
    } catch (err) {
      console.error(err)
      setError(true)
      setJoining(false)
    }
  }

  return (
    <>
      <PageHeader
        counter={family ? undefined : '1 of 2'}
        title={family ? `Join ${family.name}` : TITLE}
        subtitle={family ? 'Your family is keeping its stories on Fireside. Tell us your name to join them.' : SUBTITLE}
      />
      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          <Field
            label="What’s your name?"
            autoFocus
            autoComplete="given-name"
            placeholder="Your first name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {error && (
            <p className="rounded-2xl bg-ember-tint px-4 py-3 text-base text-ember-dark" role="alert">
              Something went wrong. Please try again.
            </p>
          )}
          <Button type="submit" chevron disabled={joining || !name.trim()} className="w-full">
            {joining ? 'Joining…' : family ? 'Join family' : 'Start our family'}
          </Button>
        </form>
      </Card>
      <p className="mt-4 text-center text-sm leading-normal text-muted">
        Your family space is private. Only invited members can enter.
      </p>
    </>
  )
}

function CoverCard({
  code,
  familyName,
  since,
  photoUrl,
  isOrganizer,
  onUploaded,
}: {
  code: string
  familyName: string
  since: number
  photoUrl?: string
  isOrganizer: boolean
  onUploaded: (photoUrl: string) => void
}) {
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview)
    },
    [preview],
  )

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (!file) return
    setError(null)
    if (!file.type.startsWith('image/')) {
      setError('That file isn’t an image.')
      return
    }
    setPreview(URL.createObjectURL(file))
    try {
      onUploaded(await uploadFamilyPhoto(code, file))
    } catch (err) {
      console.error(err)
      setError(err instanceof NotAnImageError ? 'That file isn’t an image.' : 'Upload failed, try again.')
    } finally {
      setPreview(null)
    }
  }

  const fileInput = <input type="file" accept="image/*" onChange={handleFile} disabled={!!preview} className="sr-only" />
  const src = preview ?? photoUrl
  // "THE Chen Family" reads well; "THE Our family" doesn't.
  const showThe = !/^(the|our)\b/i.test(familyName)

  return (
    <div>
      {src ? (
        <div className="relative h-[340px] overflow-hidden rounded-3xl bg-sand">
          <img src={src} alt={`${familyName} cover photo`} className="absolute inset-0 size-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 h-[60%] bg-linear-to-t from-black/75 via-black/35 to-transparent" />
          <div className="absolute right-6 bottom-6 left-6 text-white">
            {showThe && <p className="text-xs font-semibold tracking-[0.14em] text-white/70">THE</p>}
            <p className="text-display mt-1 text-[44px]">{familyName}</p>
            <p className="mt-2 text-[11px] font-semibold tracking-[0.18em] text-white/80">OUR STORIES · SINCE {since}</p>
          </div>
          {isOrganizer && !preview && (
            <label className="absolute top-4 right-4 inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-paper px-4 text-[15px] font-semibold text-ink shadow-card focus-within:ring-2 focus-within:ring-ember/40 hover:bg-field">
              <Camera size={18} aria-hidden="true" />
              Change cover
              {fileInput}
            </label>
          )}
          {preview && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/25">
              <span className="inline-flex h-11 items-center gap-2 rounded-full bg-paper px-5 text-[15px] font-semibold text-ink">
                <LoaderCircle size={18} className="motion-safe:animate-spin" aria-hidden="true" />
                Uploading…
              </span>
            </div>
          )}
        </div>
      ) : (
        <CoverPlaceholder familyName={familyName} since={since} isOrganizer={isOrganizer}>
          {fileInput}
        </CoverPlaceholder>
      )}
      {error && (
        <p className="mt-3 rounded-2xl bg-ember-tint px-4 py-3 text-base text-ember-dark" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

function CoverPlaceholder({
  familyName,
  since,
  isOrganizer,
  children,
}: {
  familyName: string
  since: number
  isOrganizer: boolean
  children: ReactNode
}) {
  const content = (
    <>
      <span className="flex size-16 items-center justify-center rounded-full bg-paper text-ember">
        <Camera size={28} aria-hidden="true" />
      </span>
      <span className="text-display mt-4 text-[26px] text-ink">
        {isOrganizer ? 'Add a family photo' : familyName}
      </span>
      <span className="mt-2 max-w-[260px] text-base leading-normal text-muted">
        {isOrganizer ? 'A photo everyone will see when they open Fireside.' : 'Your organizer hasn’t added a photo yet.'}
      </span>
      <span className="mt-5 text-[11px] font-semibold tracking-[0.18em] text-muted">OUR STORIES · SINCE {since}</span>
    </>
  )
  const className = 'flex h-[340px] flex-col items-center justify-center rounded-3xl bg-sand px-6 text-center'
  if (!isOrganizer) return <div className={className}>{content}</div>
  return (
    <label className={`${className} cursor-pointer border-[1.5px] border-dashed border-cream-border hover:bg-cream focus-within:ring-2 focus-within:ring-ember/40`}>
      {content}
      {children}
    </label>
  )
}
