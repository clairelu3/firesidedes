// Every screen: a centered 430px column on cream paper, the shared header (over an optional
// illustration), 24px margins, and an optional action bar pinned to the bottom.
import type { ReactNode } from 'react'
import type { IllustrationSlot } from '../../lib/illustrations'
import { AppHeader, type AppHeaderProps } from './AppHeader'
import { IllustratedHero } from './IllustratedHero'
import { CornerLeaves } from './Illustration'

export const TAGLINE = 'Your voice today,\na family book for tomorrow.'

type Props = AppHeaderProps & {
  children: ReactNode
  hero?: IllustrationSlot
  heroSize?: 'tall' | 'short'
  spine?: boolean // the Family Book's dark-green spine down the left edge
  floating?: ReactNode
  floatingHeight?: number
  bare?: boolean // no header; content centered on the page (welcome screen)
}

export function AppShell({ children, hero, heroSize = 'tall', spine = false, floating, floatingHeight = 0, bare = false, ...header }: Props) {
  if (bare) {
    return (
      <div className="min-h-dvh">
        <div className="relative mx-auto flex min-h-dvh max-w-[430px] flex-col overflow-x-clip">
          <CornerLeaves side="left" className="-top-4 -left-10 h-36 w-44" />
          <CornerLeaves side="right" className="-top-6 -right-12 h-44 w-52" />
          <main className="relative flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">{children}</main>
        </div>
      </div>
    )
  }
  return (
    <div className="min-h-dvh">
      <div className="relative mx-auto min-h-dvh max-w-[430px] overflow-x-clip">
        {spine && <BookSpine />}
        {hero ? (
          <div className="relative">
            <IllustratedHero image={hero} size={heroSize} />
            <div className="absolute inset-x-0 top-0">
              <AppHeader {...header} />
            </div>
          </div>
        ) : (
          <>
            <CornerLeaves side="left" className="-top-4 -left-10 h-28 w-36 opacity-80" />
            <CornerLeaves side="right" className="-top-6 -right-12 h-32 w-40 opacity-80" />
            <AppHeader {...header} />
          </>
        )}
        <main
          className={`relative px-6 ${hero ? '-mt-12' : 'pt-4'} ${spine ? 'pl-10' : ''}`}
          style={{ paddingBottom: `calc(${40 + (floating ? floatingHeight : 0)}px + env(safe-area-inset-bottom))` }}
        >
          {children}
        </main>
        {floating && (
          <div className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-[430px] bg-linear-to-t from-cream via-cream to-cream/0 px-6 pt-6 pb-[calc(16px+env(safe-area-inset-bottom))]">
            {floating}
          </div>
        )}
      </div>
    </div>
  )
}

function BookSpine() {
  return (
    <div className="pointer-events-none absolute inset-y-0 left-0 w-[18px] bg-pine" aria-hidden="true">
      <span className="absolute inset-y-0 right-[3px] w-px bg-card/25" />
      <span className="absolute inset-y-0 right-0 w-[2px] bg-pine-dark" />
    </div>
  )
}
