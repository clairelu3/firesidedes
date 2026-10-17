import { BookMarked, BookOpen, Map, Mic, Users } from 'lucide-react'
import { NavLink } from 'react-router'

const tabs = [
  { to: '/family', label: 'Family', Icon: Users },
  { to: '/life', label: 'Life', Icon: Map },
  { to: '/record', label: 'Record', Icon: Mic },
  { to: '/chapters', label: 'Chapters', Icon: BookOpen },
  { to: '/book', label: 'Book', Icon: BookMarked },
]

export function BottomNav() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[480px] border-t border-line bg-paper pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid h-[72px] grid-cols-5">
        {tabs.map(({ to, label, Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                `flex h-full flex-col items-center justify-center gap-1 text-[13px] font-medium ${
                  isActive ? 'text-ember' : 'text-muted hover:text-ink'
                }`
              }
            >
              <Icon size={24} strokeWidth={1.75} aria-hidden="true" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
