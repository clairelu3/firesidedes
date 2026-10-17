import { NavLink, Route, Routes } from 'react-router'
import Memories from './pages/Memories'
import Onboarding from './pages/Onboarding'
import PhoneRecord from './pages/PhoneRecord'
import QRPage from './pages/QRPage'
import Reader from './pages/Reader'
import Record from './pages/Record'
import Review from './pages/Review'
import Storytime from './pages/Storytime'

const links = [
  { to: '/', label: 'Life Map' },
  { to: '/record', label: 'Record' },
  { to: '/memories', label: 'Memories' },
  { to: '/review', label: 'Review' },
  { to: '/read', label: 'Read' },
  { to: '/qr', label: 'QR' },
]

export default function App() {
  return (
    <Routes>
      {/* Phone page the QR code opens: no nav, just the record button. */}
      <Route path="/r" element={<PhoneRecord />} />
      <Route path="*" element={<Layout />} />
    </Routes>
  )
}

function Layout() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 text-lg">
      <nav className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl flex-wrap gap-2 px-4 py-3">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end
              className={({ isActive }) =>
                `rounded-lg px-4 py-3 text-lg font-medium ${
                  isActive
                    ? 'bg-stone-800 text-white'
                    : 'text-stone-700 hover:bg-stone-100'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      </nav>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Routes>
          <Route path="/" element={<Onboarding />} />
          <Route path="/record" element={<Record />} />
          <Route path="/memories" element={<Memories />} />
          <Route path="/review" element={<Review />} />
          <Route path="/read" element={<Reader />} />
          <Route path="/qr" element={<QRPage />} />
          <Route path="/storytime/:memoId" element={<Storytime />} />
        </Routes>
      </main>
    </div>
  )
}
