import type { ReactNode } from 'react'
import { BottomNav } from './BottomNav'
import { Header } from './Header'

const NAV_HEIGHT = 72

type Props = {
  children: ReactNode
  tone?: 'page' | 'review'
  headerAction?: ReactNode
  avatarVariant?: 'ember' | 'sand'
  // Content pinned above the bottom nav (action bar / review panel) and its approximate height.
  floating?: ReactNode
  floatingHeight?: number
}

export function AppShell({ children, tone = 'page', headerAction, avatarVariant, floating, floatingHeight = 0 }: Props) {
  const bg = tone === 'review' ? 'bg-review-bg' : 'bg-page'
  return (
    <div className={`min-h-dvh ${bg}`}>
      <div className="mx-auto min-h-dvh max-w-[480px]">
        <Header action={headerAction} avatarVariant={avatarVariant} />
        <main
          className="px-5 pt-6"
          style={{ paddingBottom: `calc(${NAV_HEIGHT + (floating ? floatingHeight : 0) + 32}px + env(safe-area-inset-bottom))` }}
        >
          {children}
        </main>
        {floating && (
          <div
            className={`fixed inset-x-0 z-10 mx-auto max-w-[480px] px-5 pb-3 pt-3 ${bg}`}
            style={{ bottom: `calc(${NAV_HEIGHT}px + env(safe-area-inset-bottom))` }}
          >
            {floating}
          </div>
        )}
        <BottomNav />
      </div>
    </div>
  )
}
