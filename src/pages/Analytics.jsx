import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabaseClient'
import { useToast } from '../hooks/useToast'
import { StatCard, EmptyState, TableSkeleton } from '../components/Ui'
import { BarRanking, StatusBar, PriceHistory } from '../components/Charts'
import {
  IconBox,
  IconLayers,
  IconCoins,
  IconAlert,
  IconCheckCircle,
  IconX,
  IconChart,
} from '../components/Icons'
import {
  formatCurrency,
  formatCurrencyCompact,
  formatNumber,
  formatLocalDay,
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
  const [hideEmpty, setHideEmpty] = useState(false)
  const [asTable, setAsTable] = useState(false)

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

    return [
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
  }, [movements, selectedId])

  const ranking = useMemo(() => {
    const rows = products
      .filter((p) => !hideEmpty || active.of(p) > 0)
      .map((p) => ({ id: p.id, label: p.name, code: p.code, value: active.of(p) }))
      .sort((a, b) => (order === 'desc' ? b.value - a.value : a.value - b.value))

    return limit === 0 ? rows : rows.slice(0, limit)
  }, [products, active, order, limit, hideEmpty])

  const totals = useMemo(() => {
    const units = products.reduce((sum, p) => sum + (p.stock || 0), 0)
    const value = products.reduce((sum, p) => sum + (p.stock || 0) * (p.last_unit_price || 0), 0)
    const out = products.filter((p) => !p.stock).length
    const low = products.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK).length
    return { units, value, out, low, ok: products.length - out - low }
  }, [products])

  const statusSegments = [
    { id: 'out', label: 'Sin stock', value: totals.out, tone: 'critical', icon: IconX },
    { id: 'low', label: 'Nivel bajo', value: totals.low, tone: 'warning', icon: IconAlert },
    { id: 'ok', label: 'Normal', value: totals.ok, tone: 'good', icon: IconCheckCircle },
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

      <section className="stats">
        <StatCard
          icon={IconBox}
          label="Productos"
          value={formatNumber(products.length)}
          hint="referencias registradas"
        />
        <StatCard
          icon={IconLayers}
          label="Unidades en stock"
          value={formatNumber(totals.units)}
          hint="suma de todas las existencias"
          accent="var(--wine-500)"
        />
        <StatCard
          icon={IconCoins}
          label="Valor del inventario"
          value={formatCurrencyCompact(totals.value)}
          hint="al último precio de compra"
          accent="var(--success)"
        />
      </section>

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

        <div className="toolbar-actions">
          <button
            className={`btn btn-outline${hideEmpty ? ' btn-toggled' : ''}`}
            onClick={() => setHideEmpty((v) => !v)}
            aria-pressed={hideEmpty}
          >
            Ocultar ceros
          </button>
          <button
            className={`btn btn-outline${asTable ? ' btn-toggled' : ''}`}
            onClick={() => setAsTable((v) => !v)}
            aria-pressed={asTable}
          >
            {asTable ? 'Ver gráfico' : 'Ver datos'}
          </button>
        </div>
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

            {asTable ? (
              <div className="table-scroll">
                <table className="table">
                  <thead>
                    <tr>
                      <th scope="col">
                        <span className="th-inner">Código</span>
                      </th>
                      <th scope="col">
                        <span className="th-inner">Producto</span>
                      </th>
                      <th className="th-num" scope="col">
                        <span className="th-inner">{active.label}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.map((r) => (
                      <tr key={r.id}>
                        <td className="td-code">{r.code}</td>
                        <td className="td-strong">{r.label}</td>
                        <td className="td-num">{active.format(r.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <BarRanking
                data={ranking}
                format={active.format}
                emptyText="Ningún producto tiene un valor mayor a cero con esta medida."
              />
            )}
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
                <span className="card-count">compra y venta, por producto</span>
              </div>

              {withHistory.length > 0 && (
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
              />
            )}
          </section>
        </div>
      )}
    </div>
  )
}
