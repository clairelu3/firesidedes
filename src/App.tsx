import { Link, Route, Routes } from 'react-router'
import PhoneRecord from './pages/PhoneRecord'
import QRPage from './pages/QRPage'

// Teammates: add onboarding / review / reader routes here.
export default function App() {
  return (
    <Routes>
      <Route path="/qr" element={<QRPage />} />
      <Route path="/r" element={<PhoneRecord />} />
      <Route path="*" element={<Home />} />
    </Routes>
  )
}

function Home() {
  return (
    <main className="min-h-screen bg-amber-50 p-8 text-stone-900">
      <div className="mx-auto flex max-w-md flex-col gap-4">
        <h1 className="text-3xl font-semibold">Family Story</h1>
        <Link to="/qr" className="rounded-xl bg-amber-700 py-4 text-center text-lg font-semibold text-white">Show QR code</Link>
        <Link to="/r" className="text-center text-stone-600 underline">Record on this device</Link>
      </div>
    </main>
  )
}
