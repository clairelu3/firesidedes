import { Navigate, NavLink, Outlet, Route, Routes } from 'react-router'
import Book from './pages/Book'
import Chapters from './pages/Chapters'
import Family from './pages/Family'
import Life from './pages/Life'
import Memories from './pages/Memories'
import PhoneRecord from './pages/PhoneRecord'
import QRPage from './pages/QRPage'
import Record from './pages/Record'
import Storytime from './pages/Storytime'

export default function App() {
  return (
    <Routes>
      {/* Redesigned screens (each renders its own AppShell) */}
      <Route path="/family" element={<Family />} />
      <Route path="/family/:code" element={<Family />} />
      <Route path="/life" element={<Life />} />
      <Route path="/record" element={<Record />} />
      <Route path="/chapters" element={<Chapters />} />
      <Route path="/book" element={<Book />} />
      <Route path="/storytime/:memoId" element={<Storytime />} />

      {/* Phone page the QR code opens: no nav, just the record button. */}
      <Route path="/r" element={<PhoneRecord />} />

      {/* Kenza's pages, still in their original layout (not restyled yet) */}
      <Route element={<LegacyLayout />}>
        <Route path="/memories" element={<Memories />} />
        <Route path="/qr" element={<QRPage />} />
      </Route>

      {/* old routes */}
      <Route path="/" element={<Navigate to="/family" replace />} />
      <Route path="/onboarding" element={<Navigate to="/life" replace />} />
      <Route path="/review" element={<Navigate to="/chapters" replace />} />
      <Route path="/read" element={<Navigate to="/book" replace />} />
      <Route path="*" element={<Navigate to="/family" replace />} />
    </Routes>
  )
}

const legacyLinks = [
  { to: '/life', label: 'Life Map' },
  { to: '/record', label: 'Record' },
  { to: '/memories', label: 'Memories' },
  { to: '/chapters', label: 'Review' },
  { to: '/book', label: 'Read' },
  { to: '/qr', label: 'QR' },
]

// Kenza's original Layout, kept as-is for her pages; links point at the new routes.
function LegacyLayout() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 text-lg">
      <nav className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl flex-wrap gap-2 px-4 py-3">
          {legacyLinks.map((link) => (
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
        <Outlet />
      </main>
    </div>
  )
}
