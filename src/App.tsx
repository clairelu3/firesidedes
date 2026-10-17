import { Navigate, Route, Routes } from 'react-router'
import Book from './pages/Book'
import Chapters from './pages/Chapters'
import Family from './pages/Family'
import Life from './pages/Life'
import Record from './pages/Record'

export default function App() {
  return (
    <Routes>
      <Route path="/family" element={<Family />} />
      <Route path="/family/:code" element={<Family />} />
      <Route path="/life" element={<Life />} />
      <Route path="/record" element={<Record />} />
      <Route path="/chapters" element={<Chapters />} />
      <Route path="/book" element={<Book />} />

      {/* old routes */}
      <Route path="/" element={<Navigate to="/family" replace />} />
      <Route path="/onboarding" element={<Navigate to="/life" replace />} />
      <Route path="/review" element={<Navigate to="/chapters" replace />} />
      <Route path="/read" element={<Navigate to="/book" replace />} />
      <Route path="*" element={<Navigate to="/family" replace />} />
    </Routes>
  )
}
