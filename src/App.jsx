import { useState } from 'react'
import Inventory from './pages/Inventory'
import Movements from './pages/Movements'

function App() {
  const [page, setPage] = useState('inventory')

  return (
    <div style={{ maxWidth: '600px', margin: 'auto', fontFamily: 'Arial' }}>
      
      {/* 🔝 NAVBAR */}
      <nav
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '10px',
          background: '#000',
          color: '#fff',
          borderRadius: '10px',
          marginTop: '10px'
        }}
      >
        <span>📦 App Inventario</span>

        <div>
          <button
            onClick={() => setPage('inventory')}
            style={{ marginRight: '10px' }}
          >
            Inventario
          </button>

          <button onClick={() => setPage('movements')}>
            Movimientos
          </button>
        </div>
      </nav>

      {/* 📄 CONTENIDO */}
      <div style={{ marginTop: '20px' }}>
        {page === 'inventory' && <Inventory />}
        {page === 'movements' && <Movements />}
      </div>
    </div>
  )
}

export default App