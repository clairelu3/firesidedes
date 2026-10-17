// /new — create a family group, then go straight to its QR invite page.
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { createFamily } from '../lib/members'

export default function CreateFamily() {
  const navigate = useNavigate()
  const [familyName, setFamilyName] = useState('')
  const [storytellerName, setStorytellerName] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [organizerName, setOrganizerName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ready = familyName.trim() && storytellerName.trim() && organizerName.trim()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!ready) return
    setSaving(true)
    setError(null)
    try {
      const family = await createFamily({
        familyName: familyName.trim(),
        storytellerName: storytellerName.trim(),
        birthYear: birthYear ? Number(birthYear) : null,
        organizerName: organizerName.trim(),
      })
      navigate(`/invite/${family.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create family')
      setSaving(false)
    }
  }

  const field = 'rounded-xl border border-stone-300 bg-white px-4 py-3 text-lg'

  return (
    <main className="min-h-screen bg-amber-50 px-4 py-8 text-stone-900">
      <form onSubmit={submit} className="mx-auto flex max-w-md flex-col gap-4">
        <h1 className="text-3xl font-semibold">Start your family's story</h1>
        <label className="flex flex-col gap-1">
          Family name
          <input className={field} value={familyName} onChange={(e) => setFamilyName(e.target.value)} placeholder="The Lin Family" />
        </label>
        <label className="flex flex-col gap-1">
          Who's telling the stories?
          <input className={field} value={storytellerName} onChange={(e) => setStorytellerName(e.target.value)} placeholder="Mom, Grandma Mei-Ling" />
        </label>
        <label className="flex flex-col gap-1">
          Their birth year (optional)
          <input className={field} inputMode="numeric" value={birthYear} onChange={(e) => setBirthYear(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="1958" />
        </label>
        <label className="flex flex-col gap-1">
          Your name
          <input className={field} value={organizerName} onChange={(e) => setOrganizerName(e.target.value)} placeholder="Claire" />
        </label>
        {error && <p className="text-red-700">{error}</p>}
        <button disabled={!ready || saving} className="rounded-xl bg-amber-700 py-4 text-lg font-semibold text-white disabled:opacity-50">
          {saving ? 'Creating…' : 'Create family & get QR code'}
        </button>
      </form>
    </main>
  )
}
