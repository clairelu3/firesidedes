import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { saveLifeMap } from '../api'
import type { LifeStage, Person } from '../types'

const inputClass =
  'w-full rounded-lg border-2 border-stone-300 bg-white px-4 py-3 text-lg focus:border-stone-700 focus:outline-none'
const labelClass = 'block text-base font-medium text-stone-700 mb-1'
const addButtonClass =
  'rounded-lg border-2 border-dashed border-stone-400 px-5 py-3 text-lg font-medium text-stone-700 hover:bg-stone-100'

function newStage(): LifeStage {
  return { id: crypto.randomUUID(), label: '', years: '', place: '', livedWith: '' }
}

function newPerson(): Person {
  return { id: crypto.randomUUID(), name: '', nickname: '', relation: '' }
}

export default function Onboarding() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [stages, setStages] = useState<LifeStage[]>([newStage()])
  const [people, setPeople] = useState<Person[]>([newPerson()])
  const [saving, setSaving] = useState(false)

  function updateStage(id: string, field: keyof LifeStage, value: string) {
    setStages((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)))
  }

  function updatePerson(id: string, field: keyof Person, value: string) {
    setPeople((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    await saveLifeMap({
      name,
      birthYear: Number(birthYear),
      stages,
      people: people.map((p) => ({ ...p, nickname: p.nickname || undefined })),
    })
    navigate('/record')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      <header>
        <h1 className="text-3xl font-semibold">Your life map</h1>
        <p className="mt-2 text-stone-600">
          A few details help us put your stories in order. You can change these later.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className={labelClass}>Your name</label>
          <input id="name" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="birthYear" className={labelClass}>Birth year</label>
          <input
            id="birthYear"
            type="number"
            inputMode="numeric"
            className={inputClass}
            value={birthYear}
            onChange={(e) => setBirthYear(e.target.value)}
            required
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Life stages</h2>
        {stages.map((stage, i) => (
          <fieldset key={stage.id} className="grid gap-4 rounded-xl border border-stone-200 bg-white p-5 sm:grid-cols-2">
            <legend className="px-2 text-base text-stone-500">Stage {i + 1}</legend>
            <label className="block">
              <span className={labelClass}>Stage (e.g. Childhood)</span>
              <input className={inputClass} value={stage.label} onChange={(e) => updateStage(stage.id, 'label', e.target.value)} />
            </label>
            <label className="block">
              <span className={labelClass}>Years (e.g. 1960–1975)</span>
              <input className={inputClass} value={stage.years} onChange={(e) => updateStage(stage.id, 'years', e.target.value)} />
            </label>
            <label className="block">
              <span className={labelClass}>Place</span>
              <input className={inputClass} value={stage.place} onChange={(e) => updateStage(stage.id, 'place', e.target.value)} />
            </label>
            <label className="block">
              <span className={labelClass}>Lived with</span>
              <input className={inputClass} value={stage.livedWith} onChange={(e) => updateStage(stage.id, 'livedWith', e.target.value)} />
            </label>
          </fieldset>
        ))}
        <button type="button" className={addButtonClass} onClick={() => setStages((prev) => [...prev, newStage()])}>
          + Add stage
        </button>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Important people</h2>
        {people.map((person, i) => (
          <fieldset key={person.id} className="grid gap-4 rounded-xl border border-stone-200 bg-white p-5 sm:grid-cols-3">
            <legend className="px-2 text-base text-stone-500">Person {i + 1}</legend>
            <label className="block">
              <span className={labelClass}>Name</span>
              <input className={inputClass} value={person.name} onChange={(e) => updatePerson(person.id, 'name', e.target.value)} />
            </label>
            <label className="block">
              <span className={labelClass}>Nickname</span>
              <input className={inputClass} value={person.nickname ?? ''} onChange={(e) => updatePerson(person.id, 'nickname', e.target.value)} />
            </label>
            <label className="block">
              <span className={labelClass}>Relation</span>
              <input className={inputClass} value={person.relation} onChange={(e) => updatePerson(person.id, 'relation', e.target.value)} />
            </label>
          </fieldset>
        ))}
        <button type="button" className={addButtonClass} onClick={() => setPeople((prev) => [...prev, newPerson()])}>
          + Add person
        </button>
      </section>

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-xl bg-stone-800 px-6 py-4 text-xl font-semibold text-white hover:bg-stone-900 disabled:opacity-60"
      >
        {saving ? 'Saving…' : 'Save and start recording'}
      </button>
    </form>
  )
}
