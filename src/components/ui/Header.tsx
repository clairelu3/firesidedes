import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { getMyName } from '../../api'
import { Avatar } from './Avatar'
import { LogoMark } from './LogoMark'

export function Header({ action, avatarVariant = 'ember' }: { action?: ReactNode; avatarVariant?: 'ember' | 'sand' }) {
  const name = getMyName()
  return (
    <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-line bg-paper px-5">
      <Link to="/family" className="flex items-center gap-2 rounded-lg text-ink" aria-label="Fireside home">
        <LogoMark className="h-7 w-auto text-ember" />
        <span className="font-display text-[26px] font-semibold lowercase leading-none tracking-[-0.02em]">fireside</span>
      </Link>
      <div className="flex items-center gap-2">
        {action}
        <span title={name ?? undefined}>
          <Avatar name={name} size={44} variant={avatarVariant} />
        </span>
      </div>
    </header>
  )
}

export function HeaderIconButton({
  label,
  active = false,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`flex size-12 items-center justify-center rounded-full ${active ? 'bg-ember-tint text-ember' : 'text-ink hover:bg-field'}`}
    >
      {children}
    </button>
  )
}
