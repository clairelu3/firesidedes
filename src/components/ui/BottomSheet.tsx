// Family side only: secondary details slide up over the page so readers never lose their place.
// Opens at "medium" (~50%); drag the handle up for "large" (~90%), down to close; tapping the
// handle toggles between the two. A labeled Close button, the backdrop and Escape always close
// it too, so nothing depends on a gesture.
import { X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'

export type Detent = 'medium' | 'large'

const HEIGHT: Record<Detent, string> = { medium: '50dvh', large: '90dvh' }
const DURATION = 300
const SNAP = 60 // px of drag that changes detent
const TAP = 6 // px of movement still counted as a tap on the handle
const INTERACTIVE = 'button, a, input, textarea, select, [role="button"]'

// Open sheets, oldest first. A sheet can open over another (a highlight from a transcript);
// only the top one answers Escape and traps Tab.
const openSheets: string[] = []
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select, [tabindex]:not([tabindex="-1"])'

type Props = {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  detent?: Detent // controlled detent (e.g. "Read the transcript" asks for large)
  onDetentChange?: (detent: Detent) => void
  heights?: Partial<Record<Detent, string>> // CSS heights, e.g. a short "peek" for medium
  dragBody?: boolean // at medium, drag from anywhere on the sheet (for short, non-scrolling peeks)
  backdropClassName?: string
}

export function BottomSheet({ open, onClose, title, children, detent: controlled, onDetentChange, heights, dragBody = false, backdropClassName = 'bg-ink/35' }: Props) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const [mounted, setMounted] = useState(open)
  const [shown, setShown] = useState(false) // drives the slide/fade
  const [own, setOwn] = useState<Detent>('medium')
  const [drag, setDrag] = useState(0)
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef<{ y: number; onHandle: boolean } | null>(null)
  const detent = controlled ?? own
  const setDetent = (d: Detent) => (onDetentChange ? onDetentChange(d) : setOwn(d))

  // Mount, then slide in on the next frame; slide out, then unmount.
  useEffect(() => {
    if (open) {
      returnFocus.current = document.activeElement as HTMLElement | null
      setMounted(true)
      setOwn('medium')
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)))
      return () => cancelAnimationFrame(id)
    }
    setShown(false)
    const t = window.setTimeout(() => setMounted(false), DURATION)
    return () => window.clearTimeout(t)
  }, [open])

  // Focus the close button on open, return focus on close.
  useEffect(() => {
    if (!mounted) return
    closeRef.current?.focus()
    return () => returnFocus.current?.focus?.()
  }, [mounted])

  // Join the stack while open (keyed only on open, so re-renders don't reorder it).
  useEffect(() => {
    if (!open) return
    openSheets.push(titleId)
    return () => {
      openSheets.splice(openSheets.indexOf(titleId), 1)
    }
  }, [open, titleId])

  // Escape closes; Tab stays inside the sheet.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (openSheets.at(-1) !== titleId) return
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key !== 'Tab' || !panelRef.current) return
      const items = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
      if (!items.length) return
      const first = items[0]!
      const last = items[items.length - 1]!
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, titleId])

  if (!mounted) return null

  const height = heights?.[detent] ?? HEIGHT[detent]
  const bodyDrags = dragBody && detent === 'medium'

  // Drags start on the handle or header, or anywhere at medium with dragBody; never on a control.
  function onPointerDown(e: ReactPointerEvent) {
    const target = e.target as HTMLElement
    if (target.closest(INTERACTIVE)) return
    const onHandle = !!target.closest('[data-sheet-grab]')
    if (!onHandle && !bodyDrags) return
    dragStart.current = { y: e.clientY, onHandle }
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function onPointerMove(e: ReactPointerEvent) {
    if (dragStart.current === null) return
    setDrag(e.clientY - dragStart.current.y)
  }
  function onPointerUp() {
    if (dragStart.current === null) return
    const { onHandle } = dragStart.current
    dragStart.current = null
    setDragging(false)
    const dy = drag
    setDrag(0)
    if (Math.abs(dy) < TAP) {
      if (onHandle) setDetent(detent === 'medium' ? 'large' : 'medium')
    } else if (dy < -SNAP) setDetent('large')
    else if (dy > SNAP) {
      if (detent === 'large') setDetent('medium')
      else onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <div
        className={`sheet-fade absolute inset-0 ${backdropClassName} ${shown ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`sheet-panel absolute inset-x-0 bottom-0 mx-auto flex max-w-[430px] flex-col rounded-t-[24px] bg-card shadow-float ${shown ? 'is-open' : ''} ${dragging ? 'is-dragging' : ''}`}
        style={{
          height: `calc(${height} - ${Math.min(0, drag)}px)`,
          transform: shown ? `translateY(${Math.max(0, drag)}px)` : 'translateY(100%)',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* Grab handle: drag up for more room, down to close, tap to toggle. The Close button closes without a gesture. */}
        <div data-sheet-grab className="flex h-7 shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing" aria-hidden="true">
          <span className="h-1.5 w-11 rounded-full bg-ink/20" />
        </div>
        <div data-sheet-grab className="flex shrink-0 touch-none items-start gap-3 px-6 pb-3">
          <h2 id={titleId} className="text-heading min-w-0 flex-1 pt-1">
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-ink/15 bg-cream px-4 font-serif text-[16px] text-ink hover:bg-parchment"
          >
            <X size={17} strokeWidth={1.75} aria-hidden="true" />
            Close
          </button>
        </div>
        <div className={`min-h-0 flex-1 px-6 pb-[calc(24px+env(safe-area-inset-bottom))] ${bodyDrags ? 'touch-none overflow-hidden' : 'overflow-y-auto'}`}>{children}</div>
      </div>
    </div>
  )
}

// A labeled row of facts inside a sheet: "Recorded · Sep 2, 2026".
export function SheetFacts({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="divide-y divide-hairline border-y border-hairline">
      {items.map((item) => (
        <div key={item.label} className="flex items-baseline justify-between gap-4 py-3">
          <dt className="text-meta text-[15px]">{item.label}</dt>
          <dd className="text-right font-serif text-[17px] text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
