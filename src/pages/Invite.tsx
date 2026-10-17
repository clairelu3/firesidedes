// /invite/:familyId — big QR for the laptop/kitchen screen, plus a live feed of who joined and what got recorded.
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import FamilyQR from '../components/FamilyQR'
import { supabase } from '../lib/supabase'
import type { Family, LifeStage, Member, Memo } from '../lib/types'

const POLL_MS = 3000

export default function Invite() {
  const { familyId } = useParams<{ familyId: string }>()
  const [family, setFamily] = useState<Family | null | undefined>(undefined)
  const [members, setMembers] = useState<Member[]>([])
  const [memos, setMemos] = useState<Memo[]>([])
  const [stages, setStages] = useState<LifeStage[]>([])

  useEffect(() => {
    if (!familyId) return
    supabase.from('families').select('*').eq('id', familyId).maybeSingle().then(({ data }) => setFamily(data))
    supabase.from('life_stages').select('*').eq('family_id', familyId).then(({ data }) => setStages(data ?? []))

    // Polling instead of realtime so it works with zero Supabase config.
    let alive = true
    async function refresh() {
      const [m, r] = await Promise.all([
        supabase.from('members').select('*').eq('family_id', familyId).order('created_at'),
        supabase.from('memos').select('*').eq('family_id', familyId).order('created_at', { ascending: false }).limit(10),
      ])
      if (!alive) return
      setMembers(m.data ?? [])
      setMemos(r.data ?? [])
    }
    refresh()
    const id = window.setInterval(refresh, POLL_MS)
    return () => {
      alive = false
      window.clearInterval(id)
    }
  }, [familyId])

  if (family === undefined) return <Page><p className="text-stone-500">Loading…</p></Page>
  if (family === null) return <Page><p>Family not found. <Link className="underline" to="/new">Create one</Link>.</p></Page>

  const nameOf = (id: string | null) => members.find((m) => m.id === id)?.name ?? 'Someone'
  const stageOf = (id: string | null) => stages.find((s) => s.id === id)?.label

  return (
    <Page>
      <header className="text-center">
        <h1 className="text-3xl font-semibold">{family.name}</h1>
        {family.storyteller_name && <p className="text-stone-600">Collecting {family.storyteller_name}'s stories</p>}
      </header>

      <div className="grid gap-6 md:grid-cols-[auto_1fr] md:items-start">
        <FamilyQR familyId={family.id} familyName={family.name} size={280} />

        <section className="flex flex-col gap-4 print:hidden">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="mb-2 font-semibold">In the family ({members.length})</h2>
            <ul className="flex flex-wrap gap-2">
              {members.map((m) => (
                <li key={m.id} className="rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-900">
                  {m.name} <span className="text-amber-700">· {m.role}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="mb-2 font-semibold">Latest memories</h2>
            {memos.length === 0 && <p className="text-stone-500">Nothing yet. Scan the code and record one.</p>}
            <ul className="flex flex-col gap-3">
              {memos.map((m) => (
                <li key={m.id} className="border-b border-stone-100 pb-3 last:border-0">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium">{nameOf(m.member_id)}</span>
                    <StatusPill status={m.status} />
                  </div>
                  <p className="mt-1 text-stone-700">{m.summary ?? m.transcript?.slice(0, 140) ?? '(audio only)'}</p>
                  {m.status === 'tagged' && (
                    <p className="mt-1 text-xs text-stone-500">
                      {[stageOf(m.life_stage_id), m.place, m.year_start && (m.year_is_estimate ? `~${m.year_start}` : m.year_start)]
                        .filter(Boolean)
                        .join(' · ')}
                      {m.sensitive && ' · 🔒 private'}
                    </p>
                  )}
                  {m.status === 'error' && <p className="mt-1 text-xs text-red-700">{m.error}</p>}
                </li>
              ))}
            </ul>
          </div>

          <Link to={`/join/${family.id}`} className="text-center text-sm text-stone-500 underline">
            Record on this device instead
          </Link>
        </section>
      </div>
    </Page>
  )
}

function StatusPill({ status }: { status: Memo['status'] }) {
  const styles: Record<Memo['status'], string> = {
    uploaded: 'bg-stone-100 text-stone-600',
    processing: 'bg-blue-100 text-blue-800 animate-pulse',
    tagged: 'bg-green-100 text-green-800',
    error: 'bg-red-100 text-red-800',
  }
  const label = { uploaded: 'uploaded', processing: 'placing…', tagged: 'placed', error: 'error' }[status]
  return <span className={`rounded-full px-2 py-0.5 text-xs ${styles[status]}`}>{label}</span>
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-amber-50 px-4 py-8 text-stone-900">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">{children}</div>
    </main>
  )
}
