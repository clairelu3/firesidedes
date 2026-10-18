// The first step of intake: the logo pressed onto the page, the wordmark, and "Begin".
import { AppShell, TAGLINE } from './ui/AppShell'
import { PrimaryButton } from './ui/Button'
import { LogoStamp } from './ui/LogoStamp'

export function WelcomeScreen({ onBegin }: { onBegin: () => void }) {
  return (
    <AppShell bare>
      <div className="animate-stamp-press">
        <LogoStamp size="xl" />
      </div>
      <h1 className="mt-8 font-display text-[56px] leading-none font-semibold text-pine animate-rise [animation-delay:520ms]">
        Postscript
      </h1>
      <p className="mt-4 max-w-[300px] font-serif text-[20px] leading-[1.45] whitespace-pre-line text-muted animate-rise [animation-delay:680ms]">
        {TAGLINE}
      </p>
      <p className="text-script mt-6 -rotate-[3deg] text-[16px] animate-rise [animation-delay:840ms]">Small voices make a long home.</p>
      <div className="mt-10 w-full max-w-[320px] animate-rise [animation-delay:1000ms]">
        <PrimaryButton onClick={onBegin}>Begin</PrimaryButton>
      </div>
    </AppShell>
  )
}
