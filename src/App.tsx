import { Routes, Route, Link } from 'react-router-dom'
import { BarChart3 } from 'lucide-react'
import { ConnectionProvider } from './contexts/Connection'
import SchrgReport from './pages/SchrgReport'
import Metrics from './pages/Metrics'

function Header() {
  return (
    <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
            <BarChart3 className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold">SCHRG Metrics</h1>
        </div>
        <nav className="flex gap-6">
          <Link to="/" className="hover:text-blue-100 transition-colors font-medium">Dashboard</Link>
          <Link to="/schrg" className="hover:text-blue-100 transition-colors font-medium">KPI Report</Link>
        </nav>
      </div>
    </header>
  )
}

function App() {
  return (
    <ConnectionProvider>
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <Routes>
              <Route path="/" element={<Metrics />} />
              <Route path="/schrg" element={<SchrgReport />} />
            </Routes>
          </div>
        </main>
      </div>
    </ConnectionProvider>
  )
}

export default App
