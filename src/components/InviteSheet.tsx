import { Check, Copy, X } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useRef, useState } from 'react'
import { Button } from './ui/Button'

export function InviteSheet({ code, familyName, onClose }: { code: string; familyName: string; onClose: () => void }) {
  const url = `${window.location.origin}/family/${encodeURIComponent(code)}`
  const [copied, setCopied] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname)

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      window.prompt('Copy this invite link', url)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[480px] rounded-t-3xl bg-paper px-6 pt-6 pb-[calc(24px+env(safe-area-inset-bottom))]"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 flex size-12 items-center justify-center rounded-full text-muted hover:bg-field"
        >
          <X size={22} aria-hidden="true" />
        </button>
        <h2 id="invite-title" className="text-display pr-12 text-[28px] text-ink">
          Invite your family
        </h2>
        <p className="mt-2 text-base leading-normal text-muted">
          Scan this code or share the link to join {familyName}. They’ll just enter their name.
        </p>
        <div className="mt-6 flex justify-center">
          <div className="rounded-2xl border border-line bg-paper p-4">
            <QRCodeSVG value={url} size={196} fgColor="#2A2622" bgColor="#FFFFFF" marginSize={0} level="M" title="Invite QR code" />
          </div>
        </div>
        <p className="mt-6 rounded-2xl bg-field px-4 py-3 text-[15px] font-medium break-all text-ink">{url}</p>
        <Button
          onClick={copy}
          className="mt-4 w-full"
          icon={copied ? <Check size={20} aria-hidden="true" /> : <Copy size={20} aria-hidden="true" />}
        >
          {copied ? 'Copied' : 'Copy link'}
        </Button>
        {isLocal && (
          <p className="mt-4 text-center text-sm leading-normal text-muted">
            This link only works on this computer. Run <code className="font-semibold">npm run dev -- --host</code> to
            invite phones on the same Wi-Fi.
          </p>
        )}
      </div>
    </div>
  )
}
