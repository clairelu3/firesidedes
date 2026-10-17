import { Route, Routes, useParams } from 'react-router'
import FamilyQR from './components/FamilyQR'
import JoinRecord from './pages/JoinRecord'

// Teammates: add onboarding / review / reader routes here.
export default function App() {
  return (
    <Routes>
      <Route path="/join/:familyId" element={<JoinRecord />} />
      <Route path="/invite/:familyId" element={<InvitePage />} />
      <Route path="*" element={<Home />} />
    </Routes>
  )
}

function InvitePage() {
  const { familyId } = useParams()
  return (
    <main className="flex min-h-screen items-center justify-center bg-amber-50 p-4">
      <FamilyQR familyId={familyId!} size={280} />
    </main>
  )
}

function Home() {
  return (
    <main className="min-h-screen bg-amber-50 p-8 text-stone-900">
      <h1 className="text-3xl font-semibold">Family Story</h1>
      <p className="mt-2 text-stone-600">
        Demo: open <code>/invite/&lt;familyId&gt;</code> on a laptop and scan the QR with your phone.
      </p>
    </main>
  )
}
