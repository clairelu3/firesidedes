// Family invite QR. Scanning it opens /join/:familyId → join if needed → record.
import { QRCodeCanvas } from 'qrcode.react'
import { useRef, useState } from 'react'
import { inviteUrl } from '../lib/members'

export default function FamilyQR({ familyId, familyName, size = 240 }: { familyId: string; familyName?: string; size?: number }) {
  const url = inviteUrl(familyId)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)
  const pointsAtHttp = url.startsWith('http://') && !url.includes('localhost')

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      window.prompt('Copy this invite link', url)
    }
  }

  function download() {
    const canvas = wrapRef.current?.querySelector('canvas')
    if (!canvas) return
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = `${(familyName ?? 'family').replace(/\s+/g, '-').toLowerCase()}-invite-qr.png`
    a.click()
  }

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl bg-white p-6 shadow-sm">
      <div ref={wrapRef} className="rounded-xl bg-white p-2">
        <QRCodeCanvas value={url} size={size} marginSize={2} level="M" />
      </div>
      <p className="text-center text-lg text-stone-700">Scan with your phone camera to join and record a memory</p>
      <p className="break-all text-center text-xs text-stone-400">{url}</p>
      <div className="flex flex-wrap justify-center gap-2 print:hidden">
        <button onClick={copy} className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm">
          {copied ? 'Copied!' : 'Copy link'}
        </button>
        <button onClick={download} className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm">
          Download PNG
        </button>
        <button onClick={() => window.print()} className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm">
          Print
        </button>
      </div>
      {pointsAtHttp && (
        <p className="max-w-xs text-center text-xs text-amber-800 print:hidden">
          Phones only allow the microphone over HTTPS. Run <code>npm run dev:phone</code> or use the deployed URL.
        </p>
      )}
    </div>
  )
}
