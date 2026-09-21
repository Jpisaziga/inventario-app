import { useState } from 'react'
import Inventory from './pages/Inventory'
import Movements from './pages/Movements'
import { useTheme } from './hooks/useTheme'
import { useStoredState } from './hooks/useStoredState'
import {
  IconBox,
  IconExchange,
  IconSun,
  IconMoon,
  IconChevronLeft,
} from './components/Icons'

const PAGES = [
  { id: 'inventory', label: 'Inventario', icon: IconBox, Component: Inventory },
  { id: 'movements', label: 'Movimientos', icon: IconExchange, Component: Movements },
]

export default function App() {
  const [pageId, setPageId] = useState('inventory')
  const [theme, toggleTheme] = useTheme()
  const [collapsed, setCollapsed] = useStoredState(
    'inventario:rail-collapsed',
    false,
    (raw) => raw === 'true',
  )

  const current = PAGES.find((p) => p.id === pageId) ?? PAGES[0]
  const Page = current.Component

  return (
    <div className={`shell${collapsed ? ' shell-collapsed' : ''}`}>
      <aside className={`rail${collapsed ? ' rail-collapsed' : ''}`}>
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
                title={collapsed ? item.label : undefined}
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="rail-foot">
          <div className="rail-foot-actions">
            <button
              className="btn-icon btn-icon-rail"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
              title={theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
            >
              {theme === 'dark' ? <IconSun size={17} /> : <IconMoon size={17} />}
            </button>
            <button
              className="btn-icon btn-icon-rail rail-collapse-btn"
              onClick={() => setCollapsed((v) => !v)}
              aria-expanded={!collapsed}
              aria-label={collapsed ? 'Expandir el menú' : 'Retraer el menú'}
              title={collapsed ? 'Expandir menú' : 'Retraer menú'}
            >
              <IconChevronLeft
                size={17}
                style={{ transform: collapsed ? 'rotate(180deg)' : 'none' }}
              />
            </button>
          </div>
          <p className="rail-note">Datos sincronizados con Supabase</p>
        </div>
      </aside>

      <main className="page">
        <Page />
      </main>
    </div>
  )
}
