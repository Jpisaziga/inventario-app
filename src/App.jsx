import { useState } from 'react'
import Inventory from './pages/Inventory'
import Movements from './pages/Movements'
import { useTheme } from './hooks/useTheme'
import { IconBox, IconExchange, IconSun, IconMoon } from './components/Icons'

const PAGES = [
  { id: 'inventory', label: 'Inventario', icon: IconBox, Component: Inventory },
  { id: 'movements', label: 'Movimientos', icon: IconExchange, Component: Movements },
]

export default function App() {
  const [pageId, setPageId] = useState('inventory')
  const [theme, toggleTheme] = useTheme()

  const current = PAGES.find((p) => p.id === pageId) ?? PAGES[0]
  const Page = current.Component

  return (
    <div className="shell">
      <aside className="rail">
        <div className="rail-brand">
          <span className="rail-mark">
            <IconBox size={19} />
          </span>
          <span className="rail-brand-text">
            <span className="rail-brand-name">Inventario</span>
            <span className="rail-brand-sub">Control de stock</span>
          </span>
        </div>

        <nav className="rail-nav" aria-label="Secciones">
          <span className="rail-label">Gestión</span>
          {PAGES.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                className={`rail-link${item.id === pageId ? ' rail-link-active' : ''}`}
                onClick={() => setPageId(item.id)}
                aria-current={item.id === pageId ? 'page' : undefined}
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="rail-foot">
          <button
            className="btn-icon btn-icon-rail"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            title={theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
          >
            {theme === 'dark' ? <IconSun size={17} /> : <IconMoon size={17} />}
          </button>
          <p className="rail-note">Datos sincronizados con Supabase</p>
        </div>
      </aside>

      <main className="page">
        <Page />
      </main>
    </div>
  )
}
