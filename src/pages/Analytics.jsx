import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabaseClient'
import { useToast } from '../hooks/useToast'
import { EmptyState, TableSkeleton } from '../components/Ui'
import { BarRanking, StatusBar, PriceHistory } from '../components/Charts'
import {
  IconAlert,
  IconCheckCircle,
  IconX,
  IconChart,
  IconArrowDownCircle,
  IconArrowUpCircle,
  IconExchange,
} from '../components/Icons'
import {
  formatCurrency,
  formatCurrencyCompact,
  formatNumber,
  formatLocalDay,
  formatLocalDayShort,
  toLocalDate,
} from '../lib/format'

// Mismo umbral que usa la tabla de inventario.
const LOW_STOCK = 5

/**
 * Cada medida define cómo se lee un producto y cómo se formatea. Agregar
 * una medida nueva es agregar una entrada acá.
 */
const MEASURES = {
  stock: {
    label: 'Existencias',
    unit: 'unidades',
    of: (p) => p.stock || 0,
    format: formatNumber,
  },
  value: {
    label: 'Valor en inventario',
    unit: 'dinero',
    of: (p) => (p.stock || 0) * (p.last_unit_price || 0),
    format: formatCurrency,
  },
  price: {
    label: 'Último precio unitario',
    unit: 'dinero',
    of: (p) => p.last_unit_price || 0,
    format: formatCurrency,
  },
}

const LIMITS = [5, 10, 15, 25, 0]

export default function Analytics() {
  const toast = useToast()

  const [products, setProducts] = useState([])
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(true)
  const [historyId, setHistoryId] = useState('')

  const [measure, setMeasure] = useState('stock')
  const [limit, setLimit] = useState(10)
  const [order, setOrder] = useState('desc')
  const [flow, setFlow] = useState('buy') // buy | sell | both

  useEffect(() => {
    supabase
      .from('products')
      .select('*')
      .then(({ data, error }) => {
        if (error) toast.error('No se pudieron cargar los productos')
        setProducts(data ?? [])
        setLoading(false)
      })
    supabase
      .from('movements')
      .select('product_id, product_name, type, unit_price, created_at')
      .then(({ data }) => setMovements(data ?? []))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const active = MEASURES[measure]

  // Sólo tiene sentido ofrecer productos que ya tengan historial.
  const withHistory = useMemo(() => {
    const counts = new Map()
    for (const m of movements) {
      if (!m.product_id) continue
      const prev = counts.get(m.product_id)
      counts.set(m.product_id, { name: m.product_name, n: (prev?.n ?? 0) + 1 })
    }
    return [...counts.entries()]
      .map(([id, v]) => ({ id, name: v.name, n: v.n }))
      .sort((a, b) => b.n - a.n)
  }, [movements])

  // Por defecto, el producto con más registros: el que más historia cuenta.
  const selectedId = historyId || withHistory[0]?.id || ''

  const priceSeries = useMemo(() => {
    const forProduct = movements
      .filter((m) => String(m.product_id) === String(selectedId))
      .map((m) => ({ t: toLocalDate(m.created_at).getTime(), v: m.unit_price || 0, type: m.type }))
      .sort((a, b) => a.t - b.t)

    const all = [
      {
        id: 'buy',
        label: 'Precio de compra',
        color: 'var(--viz-buy)',
        points: forProduct.filter((p) => p.type === 'income'),
      },
      {
        id: 'sell',
        label: 'Precio de venta',
        color: 'var(--viz-sell)',
        points: forProduct.filter((p) => p.type === 'expense'),
      },
    ]

    return flow === 'both' ? all : all.filter((serie) => serie.id === flow)
  }, [movements, selectedId, flow])

  const ranking = useMemo(() => {
    const rows = products
      .filter((p) => active.of(p) > 0)
      .map((p) => ({ id: p.id, label: p.name, code: p.code, value: active.of(p) }))
      .sort((a, b) => (order === 'desc' ? b.value - a.value : a.value - b.value))

    return limit === 0 ? rows : rows.slice(0, limit)
  }, [products, active, order, limit])

  const levels = useMemo(() => {
    const out = products.filter((p) => !p.stock).length
    const low = products.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK).length
    return { out, low, ok: products.length - out - low }
  }, [products])

  const statusSegments = [
    { id: 'out', label: 'Sin stock', value: levels.out, tone: 'critical', icon: IconX },
    { id: 'low', label: 'Nivel bajo', value: levels.low, tone: 'warning', icon: IconAlert },
    { id: 'ok', label: 'Normal', value: levels.ok, tone: 'good', icon: IconCheckCircle },
  ]

  return (
    <div className="page-inner viz">
      <header className="page-head">
        <div>
          <span className="page-eyebrow">Análisis</span>
          <h1>Reportes</h1>
          <p className="page-sub">
            Comparativas del inventario. Elegí qué medir y cuántos productos incluir.
          </p>
        </div>
      </header>

      {/* Controles en una sola fila, por encima de los gráficos. */}
      <div className="toolbar">
        <label className="field-inline">
          <span className="field-hint">Medir</span>
          <select
            className="select"
            value={measure}
            onChange={(e) => setMeasure(e.target.value)}
            aria-label="Medida a graficar"
          >
            {Object.entries(MEASURES).map(([key, m]) => (
              <option key={key} value={key}>
                {m.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field-inline">
          <span className="field-hint">Mostrar</span>
          <select
            className="select"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            aria-label="Cantidad de productos"
          >
            {LIMITS.map((n) => (
              <option key={n} value={n}>
                {n === 0 ? 'Todos' : `Top ${n}`}
              </option>
            ))}
          </select>
        </label>

        <label className="field-inline">
          <span className="field-hint">Orden</span>
          <select
            className="select"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            aria-label="Orden del ranking"
          >
            <option value="desc">Mayor a menor</option>
            <option value="asc">Menor a mayor</option>
          </select>
        </label>

      </div>

      {loading ? (
        <section className="card">
          <TableSkeleton rows={6} cols={3} />
        </section>
      ) : products.length === 0 ? (
        <section className="card">
          <EmptyState
            icon={IconChart}
            title="No hay nada que graficar"
            text="Agregá productos en el inventario y los reportes se arman solos."
          />
        </section>
      ) : (
        <div className="viz-grid">
          <section className="card">
            <div className="card-head">
              <div className="card-title">
                <h2>{active.label} por producto</h2>
                <span className="card-count">
                  {limit === 0 ? 'todos' : `top ${Math.min(limit, ranking.length)}`}
                </span>
              </div>
            </div>

            <BarRanking
              data={ranking}
              format={active.format}
              emptyText="Ningún producto tiene un valor mayor a cero con esta medida."
            />
          </section>

          <section className="card">
            <div className="card-head">
              <div className="card-title">
                <h2>Niveles de stock</h2>
                <span className="card-count">{formatNumber(products.length)} productos</span>
              </div>
            </div>
            <StatusBar
              segments={statusSegments}
              total={products.length}
              unit="productos"
            />
          </section>

          <section className="card viz-wide">
            <div className="card-head">
              <div className="card-title">
                <h2>Historial de precios</h2>
                <span className="card-count">
                  {flow === 'buy'
                    ? 'a qué precio se compró'
                    : flow === 'sell'
                      ? 'a qué precio se vendió'
                      : 'compra y venta juntas'}
                </span>
              </div>

              {withHistory.length > 0 && (
                <div className="card-controls">
                  <div className="segmented segmented-3 segmented-sm">
                    <button
                      type="button"
                      className={flow === 'buy' ? 'seg-active' : ''}
                      onClick={() => setFlow('buy')}
                    >
                      <IconArrowDownCircle size={14} />
                      Compras
                    </button>
                    <button
                      type="button"
                      className={flow === 'sell' ? 'seg-active' : ''}
                      onClick={() => setFlow('sell')}
                    >
                      <IconArrowUpCircle size={14} />
                      Ventas
                    </button>
                    <button
                      type="button"
                      className={flow === 'both' ? 'seg-active' : ''}
                      onClick={() => setFlow('both')}
                    >
                      <IconExchange size={14} />
                      Ambas
                    </button>
                  </div>

                  <label className="field-inline">
                    <span className="field-hint">Producto</span>
                    <select
                      className="select"
                      value={selectedId}
                      onChange={(e) => setHistoryId(e.target.value)}
                      aria-label="Producto del historial de precios"
                    >
                      {withHistory.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.n})
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
            </div>

            {withHistory.length === 0 ? (
              <EmptyState
                icon={IconChart}
                title="Sin historial todavía"
                text="Registrá movimientos en el inventario y acá vas a ver cómo se movió el precio de cada producto."
              />
            ) : (
              <PriceHistory
                series={priceSeries}
                formatValue={formatCurrencyCompact}
                formatDate={formatLocalDay}
                formatAxisDate={formatLocalDayShort}
                emptyText={
                  flow === 'buy'
                    ? 'Este producto no tiene compras registradas.'
                    : flow === 'sell'
                      ? 'Este producto no tiene ventas registradas.'
                      : 'Este producto todavía no tiene movimientos registrados.'
                }
              />
            )}
          </section>
        </div>
      )}
    </div>
  )
}
