// /qr — big QR for the laptop/kitchen screen, plus a live feed of memories as they're placed.
// Scanning the QR opens /r on the phone: one big record button that uploads to the backend.
import { QRCodeCanvas } from 'qrcode.react'
import { useEffect, useRef, useState } from 'react'
import { type ApiMemo, type ApiStage, listMemos, listStages, publicBaseUrl, RECORD_PATH } from '../lib/qrApi'

const POLL_MS = 3000

export default function QRPage() {
  const url = `${publicBaseUrl()}${RECORD_PATH}`
  const wrapRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)
  const [memos, setMemos] = useState<ApiMemo[]>([])
  const [stages, setStages] = useState<ApiStage[]>([])
  const [backendDown, setBackendDown] = useState(false)

  useEffect(() => {
    listStages().then(setStages).catch(() => {})
    let alive = true
    async function refresh() {
      try {
        const all = await listMemos()
        if (alive) {
          setMemos(all.slice(-8).reverse())
          setBackendDown(false)
        }
      } catch {
        if (alive) setBackendDown(true)
      }
    }
    refresh()
    const id = window.setInterval(refresh, POLL_MS)
    return () => {
      alive = false
      window.clearInterval(id)
    }
  }, [])

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      window.prompt('Copy this link', url)
    }
  }

  function download() {
    const canvas = wrapRef.current?.querySelector('canvas')
    if (!canvas) return
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = 'family-story-qr.png'
    a.click()
  }

  const stageLabel = (id: number | null) => stages.find((s) => s.id === id)?.label

  return (
    <div className="grid gap-6 md:grid-cols-[auto_1fr] md:items-start">
        <section className="flex flex-col items-center gap-4 rounded-2xl bg-white p-6 shadow-sm">
          <div ref={wrapRef}>
            <QRCodeCanvas value={url} size={280} marginSize={2} level="M" />
          </div>
          <p className="text-center text-lg text-stone-700">Scan with your phone camera to record a memory</p>
          <p className="break-all text-center text-xs text-stone-400">{url}</p>
          <div className="flex flex-wrap justify-center gap-2 print:hidden">
            <button onClick={copy} className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm">{copied ? 'Copied!' : 'Copy link'}</button>
            <button onClick={download} className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm">Download PNG</button>
            <button onClick={() => window.print()} className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm">Print</button>
          </div>
          {url.startsWith('http://') && (
            <p className="max-w-xs text-center text-xs text-amber-800 print:hidden">
              Phones only allow the mic over HTTPS: run <code>npm run dev:phone</code>.
            </p>
          )}
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm print:hidden">
          <h2 className="mb-3 font-semibold">Latest memories</h2>
          {backendDown && (
            <p className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">
              Can't reach the backend. Start it: <code>cd backend && venv/bin/uvicorn main:app --reload</code>
            </p>
          )}
          {!backendDown && memos.length === 0 && <p className="text-stone-500">Nothing yet. Scan the code and record one.</p>}
          <ul className="flex flex-col gap-3">
            {memos.map((m) => {
              const t = m.tags ?? { stage_id: null }
              const years = t.year_start ? `${t.year_is_estimate ? '~' : ''}${t.year_start}${t.year_end && t.year_end !== t.year_start ? `–${t.year_end}` : ''}` : null
              return (
                <li key={m.id} className="border-b border-stone-100 pb-3 last:border-0">
                  <p className="text-stone-800">{t.summary ?? m.transcript?.slice(0, 160)}</p>
                  <p className="mt-1 text-xs text-stone-500">
                    {[stageLabel(m.stage_id) ?? 'Not placed yet', t.place, years, ...(t.people ?? [])].filter(Boolean).join(' · ')}
                    {t.sensitive && ' · 🔒 private'}
                  </p>
                </li>
              )
            })}
          </ul>
        </section>
    </div>
  )
}
