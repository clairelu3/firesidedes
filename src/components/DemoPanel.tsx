// Hidden controls for recording the demo video. Shift+D toggles it.
// Switch viewer, fake "today", play the keeper's part, reset to the seed. Changes reload the page.
import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { demoKeeperRelease, demoReset, demoSetViewer, getViewer, IS_DEMO, type Viewer } from '../api'
import { getFakeToday, setFakeToday, todayString } from '../lib/today'
import { SecondaryButton } from './ui/Button'

const OPEN_KEY = 'postscript-demo-panel'

function readOpen() {
  try {
    return sessionStorage.getItem(OPEN_KEY) === '1'
  } catch {
    return false
  }
}

function writeOpen(open: boolean) {
  try {
    sessionStorage.setItem(OPEN_KEY, open ? '1' : '0')
  } catch {
    // Panel just won't stay open across reloads.
  }
}

export function DemoPanel() {
  const [open, setOpen] = useState(readOpen)
  const [viewer, setViewer] = useState<Viewer | null>(null)
  const [date, setDate] = useState(() => getFakeToday() ?? '')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
      if (e.shiftKey && (e.key === 'D' || e.key === 'd') && !e.metaKey && !e.ctrlKey && !e.altKey) {
        setOpen((o) => {
          writeOpen(!o)
          return !o
        })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) getViewer().then(setViewer).catch((err) => console.error(err))
  }, [open])

  if (!open) return null

  const reload = () => window.location.reload()
  const viewers = viewer?.members ?? []

  return (
    <div className="fixed top-3 right-3 z-[60] max-h-[calc(100dvh-24px)] w-[290px] overflow-y-auto rounded-[18px] bg-card p-4 font-serif shadow-float ring-1 ring-hairline" role="dialog" aria-label="Demo controls">
      <div className="flex items-center justify-between">
        <p className="text-eyebrow text-ink">Demo controls</p>
        <button
          type="button"
          onClick={() => {
            writeOpen(false)
            setOpen(false)
          }}
          aria-label="Close demo controls"
          className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-ink/5"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      {!IS_DEMO && <p className="mt-1 text-xs text-muted">Supabase mode: reset is off.</p>}

      <p className="text-meta mt-3">Viewing as</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {viewers.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => demoSetViewer(m.id).then(reload)}
            aria-pressed={viewer?.me?.id === m.id}
            className={`h-11 rounded-xl text-base ${viewer?.me?.id === m.id ? 'bg-pine text-card' : 'bg-parchment text-ink hover:bg-sage'}`}
          >
            {m.name}
          </button>
        ))}
      </div>

      <p className="text-meta mt-4">Today is {todayString()}</p>
      <div className="mt-2 flex gap-2">
        <input
          type="date"
          aria-label="Fake today"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-11 min-w-0 flex-1 rounded-xl bg-parchment px-3 text-base text-ink"
        />
        <button
          type="button"
          onClick={() => {
            setFakeToday(date || null)
            reload()
          }}
          className="h-11 rounded-xl bg-parchment px-3 text-base text-ink hover:bg-sage"
        >
          Set
        </button>
      </div>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => {
            setFakeToday('2031-06-12')
            reload()
          }}
          className="h-10 flex-1 rounded-xl bg-parchment text-sm text-ink hover:bg-sage"
        >
          Jun 12, 2031
        </button>
        <button
          type="button"
          onClick={() => {
            setFakeToday(null)
            reload()
          }}
          className="h-10 flex-1 rounded-xl bg-parchment text-sm text-ink hover:bg-sage"
        >
          Real today
        </button>
      </div>

      <div className="mt-4 grid gap-2">
        <SecondaryButton
          compact
          onClick={() =>
            demoKeeperRelease()
              .then((n) => {
                setMessage(n ? `Released ${n} letter${n === 1 ? '' : 's'}.` : 'Nothing left to release.')
                window.setTimeout(reload, 700)
              })
              .catch((err) => setMessage(String(err)))
          }
        >
          Keeper releases letters
        </SecondaryButton>
        {IS_DEMO && (
          <SecondaryButton
            compact
            onClick={() => {
              setFakeToday(null)
              demoReset().then(reload)
            }}
          >
            Reset demo data
          </SecondaryButton>
        )}
      </div>
      {message && <p className="mt-2 text-sm text-muted">{message}</p>}
    </div>
  )
}
