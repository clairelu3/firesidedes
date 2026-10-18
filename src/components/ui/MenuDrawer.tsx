// The hamburger menu: a cream drawer with the app's sections, in place of a bottom tab bar.
import { BookMarked, BookOpen, Mail, Map, Users, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { NavLink } from 'react-router'
import { getMyName } from '../../api'
import { Avatar } from './Avatar'
import { SignatureLine } from './SignatureLine'

const LINKS = [
  { to: '/letterbox', label: 'Letters', hint: 'Record and keep your letters', Icon: Mail },
  { to: '/book', label: 'Family Book', hint: 'Shared letters and sealed envelopes', Icon: BookOpen },
  { to: '/family', label: 'Family', hint: 'Who’s here, and letters waiting', Icon: Users },
  { to: '/life', label: 'Life map', hint: 'Places, years and people', Icon: Map },
  { to: '/chapters', label: 'Review', hint: 'Approve chapters for the book', Icon: BookMarked },
]

export function MenuDrawer({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const name = getMyName()

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 bg-ink/30" onClick={onClose}>
      <nav
        aria-label="Main"
        onClick={(e) => e.stopPropagation()}
        className="bg-paper motion-safe:animate-drawer absolute inset-y-0 left-0 flex w-[min(320px,84vw)] flex-col px-6 pt-6 pb-[calc(24px+env(safe-area-inset-bottom))] shadow-float"
      >
        <div className="flex items-center justify-between">
          <p className="text-wordmark text-[34px]">Postscript</p>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close menu" className="flex size-11 items-center justify-center rounded-full text-ink hover:bg-ink/5">
            <X size={22} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
        {name && (
          <p className="mt-4 flex items-center gap-3">
            <Avatar name={name} size={36} />
            <span className="text-meta">Signed in as {name}</span>
          </p>
        )}
        <ul className="mt-6 divide-y divide-hairline border-y border-hairline">
          {LINKS.map(({ to, label, hint, Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                onClick={onClose}
                className={({ isActive }) => `flex items-center gap-4 py-4 ${isActive ? 'text-pine' : 'text-ink'}`}
              >
                {({ isActive }) => (
                  <>
                    <Icon size={22} strokeWidth={1.5} className={isActive ? 'text-pine' : 'text-muted'} aria-hidden="true" />
                    <span>
                      <span className={`block font-serif text-[19px] ${isActive ? 'font-medium' : ''}`}>{label}</span>
                      <span className="text-meta">{hint}</span>
                    </span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="mt-auto pt-8">
          <SignatureLine />
        </div>
      </nav>
    </div>
  )
}
