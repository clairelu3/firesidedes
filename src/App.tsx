import { Link, Route, Routes } from 'react-router'
import CreateFamily from './pages/CreateFamily'
import Invite from './pages/Invite'
import JoinRecord from './pages/JoinRecord'
import { supabaseConfigured } from './lib/supabase'

// Teammates: add onboarding / review / reader routes here.
export default function App() {
  return (
    <>
      {!supabaseConfigured && (
        <div className="bg-red-600 px-4 py-2 text-center text-sm text-white">
          Supabase isn't configured: copy <code>.env.example</code> to <code>.env.local</code>, add the URL + anon key, restart <code>npm run dev</code>.
        </div>
      )}
    <Routes>
      <Route path="/new" element={<CreateFamily />} />
      <Route path="/invite/:familyId" element={<Invite />} />
      <Route path="/join/:familyId" element={<JoinRecord />} />
      <Route path="*" element={<Home />} />
    </Routes>
    </>
  )
}

const DEMO_FAMILY_ID = '00000000-0000-0000-0000-000000000001'

function Home() {
  return (
    <main className="min-h-screen bg-amber-50 p-8 text-stone-900">
      <div className="mx-auto flex max-w-md flex-col gap-4">
        <h1 className="text-3xl font-semibold">Family Story</h1>
        <Link to="/new" className="rounded-xl bg-amber-700 py-4 text-center text-lg font-semibold text-white">
          Start a family
        </Link>
        <Link to={`/invite/${DEMO_FAMILY_ID}`} className="text-center text-stone-600 underline">
          Open the demo family's QR code
        </Link>
      </div>
    </main>
  )
}
