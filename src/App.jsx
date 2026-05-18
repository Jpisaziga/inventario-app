import { useState } from 'react'
import Inventory from './pages/Inventory'
import Movements from './pages/Movements'

function App() {
  const [page, setPage] = useState('inventory')

  return (
    <div>
      {/* NAVBAR */}
      <nav className="navbar">
        <span className="navbar-brand">📦 App Inventario</span>
        <div className="navbar-links">
          <button
            className={`nav-btn ${page === 'inventory' ? 'nav-btn-active' : ''}`}
            onClick={() => setPage('inventory')}
          >
            Inventario
          </button>
          <button
            className={`nav-btn ${page === 'movements' ? 'nav-btn-active' : ''}`}
            onClick={() => setPage('movements')}
          >
            Movimientos
          </button>
        </div>
      </nav>

      {/* CONTENIDO */}
      <div className="page-content">
        {page === 'inventory' && <Inventory />}
        {page === 'movements' && <Movements />}
      </div>
    </div>
  )
}

export default App