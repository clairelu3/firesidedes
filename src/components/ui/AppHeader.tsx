// The one header: hamburger (or back chevron) · centered "Postscript" wordmark + optional
// subtitle · avatar (or a custom action like search). Transparent, so it can sit on an illustration.
import { ChevronLeft, Menu } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { getMyName } from '../../api'
import { Avatar } from './Avatar'
import { LogoStamp } from './LogoStamp'
import { MenuDrawer } from './MenuDrawer'
import { useIsStoryteller } from '../../lib/useViewer'

export type AppHeaderProps = {
  back?: string // show a back chevron to this route instead of the menu
  onBack?: () => void // go back within a screen's own steps instead of to a route
  labeledBack?: boolean // storyteller steps: a worded "‹ Back" row under the wordmark
  step?: string // "Step 2 of 4", shown beside the labeled back
  menu?: boolean // false hides the menu button (recording screens)
  subtitle?: ReactNode
  divider?: boolean // hairline under the subtitle (Family Book)
  right?: ReactNode // replaces the avatar
}

export function AppHeader({ back, onBack, labeledBack = false, step, menu = true, subtitle, divider = false, right }: AppHeaderProps) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const name = getMyName()
  const isStoryteller = useIsStoryteller()
  const goBack = onBack ?? (() => back && navigate(back))
  const hasBack = !!(back || onBack)

  return (
    <header className="relative z-20 grid grid-cols-[48px_1fr_48px] items-start px-4 pt-5 pb-2">
      <div className="flex h-12 items-center">
        {hasBack && labeledBack ? null : hasBack ? (
          <HeaderIconButton label="Back" onClick={goBack}>
            <ChevronLeft size={26} strokeWidth={1.5} aria-hidden="true" />
          </HeaderIconButton>
        ) : menu ? (
          <HeaderIconButton label="Open menu" onClick={() => setOpen(true)}>
            <Menu size={24} strokeWidth={1.5} aria-hidden="true" />
          </HeaderIconButton>
        ) : null}
      </div>

      <div className="text-center">
        <p className="flex items-center justify-center gap-2 pt-1">
          <LogoStamp size="sm" />
          <span className="text-wordmark">Postscript</span>
        </p>
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

      {hasBack && labeledBack && (
        <div className="col-span-3 mt-3 flex items-center justify-between gap-3 px-1">
          <button
            type="button"
            onClick={goBack}
            className="-ml-2 inline-flex min-h-12 items-center gap-1 rounded-full px-3 font-serif text-[20px] text-pine hover:bg-sage/60"
          >
            <ChevronLeft size={22} strokeWidth={1.75} aria-hidden="true" />
            Back
          </button>
          {step && <span className="text-meta text-[15px]">{step}</span>}
        </div>
      )}

      {open && <MenuDrawer onClose={() => setOpen(false)} fullScreen={isStoryteller === true} />}
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
