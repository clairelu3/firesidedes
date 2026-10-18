// The one header: hamburger (or back chevron) · centered "Postscript" wordmark + optional
// subtitle · avatar (or a custom action like search). Transparent, so it can sit on an illustration.
import { ChevronLeft, Menu } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { getMyName } from '../../api'
import { Avatar } from './Avatar'
import { MenuDrawer } from './MenuDrawer'

export type AppHeaderProps = {
  back?: string // show a back chevron to this route instead of the menu
  menu?: boolean // false hides the menu button (recording screens)
  subtitle?: ReactNode
  divider?: boolean // hairline under the subtitle (Family Book)
  right?: ReactNode // replaces the avatar
}

export function AppHeader({ back, menu = true, subtitle, divider = false, right }: AppHeaderProps) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const name = getMyName()

  return (
    <header className="relative z-20 grid grid-cols-[48px_1fr_48px] items-start px-4 pt-5 pb-2">
      <div className="flex h-12 items-center">
        {back ? (
          <HeaderIconButton label="Back" onClick={() => navigate(back)}>
            <ChevronLeft size={26} strokeWidth={1.5} aria-hidden="true" />
          </HeaderIconButton>
        ) : menu ? (
          <HeaderIconButton label="Open menu" onClick={() => setOpen(true)}>
            <Menu size={24} strokeWidth={1.5} aria-hidden="true" />
          </HeaderIconButton>
        ) : null}
      </div>

      <div className="text-center">
        <p className="text-wordmark pt-1">Postscript</p>
        {subtitle && <p className="mx-auto mt-2 max-w-[250px] font-serif text-[14.5px] leading-snug whitespace-pre-line text-ink/80">{subtitle}</p>}
        {divider && <span className="mx-auto mt-3 block h-px w-48 bg-ink/20" aria-hidden="true" />}
      </div>

      <div className="flex h-12 items-center justify-end">
        {right ?? (
          <span title={name ?? undefined}>
            <Avatar name={name} size={40} />
          </span>
        )}
      </div>

      {open && <MenuDrawer onClose={() => setOpen(false)} />}
    </header>
  )
}

export function HeaderIconButton({ label, onClick, active = false, children }: { label: string; onClick: () => void; active?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active || undefined}
      className={`-ml-1 flex size-11 items-center justify-center rounded-full text-ink hover:bg-ink/5 ${active ? 'bg-sage text-pine' : ''}`}
    >
      {children}
    </button>
  )
}
