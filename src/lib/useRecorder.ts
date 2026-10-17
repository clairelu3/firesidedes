// Records audio with MediaRecorder and, where the browser supports it, transcribes live with
// the Web Speech API (Chrome, Edge, Safari). The live transcript is what the AI pipeline tags.
import { useCallback, useRef, useState } from 'react'

// Web Speech API isn't in TS's DOM lib yet.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionLike = any

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as Record<string, unknown>
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as (new () => SpeechRecognitionLike) | null
}

export const speechSupported = () => getSpeechRecognition() !== null

export function useRecorder(lang: string) {
  const [recording, setRecording] = useState(false)
  const [audio, setAudio] = useState<Blob | null>(null)
  const [transcript, setTranscript] = useState('')
  const [interim, setInterim] = useState('')
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const recognitionRef = useRef<SpeechRecognitionLike>(null)
  const timerRef = useRef<number | null>(null)
  const finalRef = useRef('')

  const start = useCallback(async () => {
    setError(null)
    setAudio(null)
    setTranscript('')
    setInterim('')
    setSeconds(0)
    finalRef.current = ''

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setError('Microphone access was blocked. Allow it in your browser settings and try again.')
      return
    }

    const chunks: Blob[] = []
    const recorder = new MediaRecorder(stream)
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data)
    recorder.onstop = () => {
      setAudio(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }))
      stream.getTracks().forEach((t) => t.stop())
    }
    recorder.start()
    recorderRef.current = recorder

    const SR = getSpeechRecognition()
    if (SR) {
      const rec = new SR()
      rec.lang = lang
      rec.continuous = true
      rec.interimResults = true
      rec.onresult = (e: SpeechRecognitionLike) => {
        let live = ''
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i]
          if (r.isFinal) finalRef.current += r[0].transcript + ' '
          else live += r[0].transcript
        }
        setTranscript(finalRef.current)
        setInterim(live)
      }
      // Recognition stops on silence in some browsers; restart while still recording.
      rec.onend = () => {
        if (recorderRef.current?.state === 'recording') {
          try {
            rec.start()
          } catch {
            /* already started */
          }
        }
      }
      try {
        rec.start()
      } catch {
        /* ignore */
      }
      recognitionRef.current = rec
    }

    timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000)
    setRecording(true)
  }, [lang])

  const stop = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current)
    recorderRef.current?.stop()
    recorderRef.current = null
    const rec = recognitionRef.current
    recognitionRef.current = null
    rec?.stop()
    setInterim('')
    setRecording(false)
  }, [])

  const reset = useCallback(() => {
    setAudio(null)
    setTranscript('')
    setInterim('')
    setSeconds(0)
    finalRef.current = ''
  }, [])

  return { recording, audio, transcript, setTranscript, interim, seconds, error, start, stop, reset }
}
