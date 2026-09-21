import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabaseClient'
import { useToast } from '../hooks/useToast'
import { StatCard, SearchField, Th, EmptyState, TableSkeleton } from '../components/Ui'
import {
  IconExchange,
  IconCoins,
  IconLayers,
  IconSearch,
  IconX,
  IconActivity,
  IconArrowDownCircle,
  IconArrowUpCircle,
} from '../components/Icons'
import {
  formatCurrency,
  formatCurrencyCompact,
  formatDateTime,
  formatNumber,
  toLocalDate,
  toDayKey,
} from '../lib/format'
import { compareBy } from '../lib/sort'

export default function Movements() {
  const toast = useToast()

  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [date, setDate] = useState('')
  const [type, setType] = useState('all') // all | income | expense
  const [sort, setSort] = useState({ field: 'created_at', order: 'desc' })
  const [balance, setBalance] = useState('units') // units | money

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.from('movements').select('*')
      if (error) toast.error('No se pudo cargar el historial')
      setMovements(data ?? [])
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return movements
      .filter((m) => {
        if (q && !m.product_name?.toLowerCase().includes(q) && !m.product_code?.toLowerCase().includes(q)) {
          return false
        }
        if (type !== 'all' && m.type !== type) return false
        if (date && toDayKey(toLocalDate(m.created_at)) !== date) return false
        return true
      })
      .sort(compareBy(sort.field, sort.order))
  }, [movements, search, date, type, sort])

  // Las métricas siguen los filtros activos: el encabezado describe lo que se ve.
  const stats = useMemo(() => {
    let inUnits = 0
    let outUnits = 0
    let inValue = 0
    let outValue = 0

    for (const m of filtered) {
      if (m.type === 'income') {
        inUnits += m.quantity || 0
        inValue += m.total || 0
      } else {
        outUnits += m.quantity || 0
        outValue += m.total || 0
      }
    }
    // Una entrada es una compra (sale dinero) y una salida es una venta
    // (entra dinero), así que el balance monetario resta compras a ventas.
    return { inUnits, outUnits, inValue, outValue, money: outValue - inValue }
  }, [filtered])

  const toggleSort = (field) =>
    setSort((s) =>
      s.field === field ? { field, order: s.order === 'asc' ? 'desc' : 'asc' } : { field, order: 'desc' },
    )

  const hasFilters = Boolean(search || date || type !== 'all')

  const clearFilters = () => {
    setSearch('')
    setDate('')
    setType('all')
  }

  return (
    <div className="page-inner">
      <header className="page-head">
        <div>
          <span className="page-eyebrow">Historial</span>
          <h1>Movimientos</h1>
          <p className="page-sub">
            Todas las entradas y salidas registradas, con su valor y fecha.
          </p>
        </div>
      </header>

      <section className="stats">
        <StatCard
          icon={IconActivity}
          label="Movimientos"
          value={formatNumber(filtered.length)}
          hint={hasFilters ? 'según los filtros activos' : 'registrados en total'}
        />
        <StatCard
          icon={IconArrowDownCircle}
          label="Ingresos"
          value={formatNumber(stats.inUnits)}
          hint={`${formatCurrencyCompact(stats.inValue)} en compras`}
          accent="var(--success)"
        />
        <StatCard
          icon={IconArrowUpCircle}
          label="Salidas"
          value={formatNumber(stats.outUnits)}
          hint={`${formatCurrencyCompact(stats.outValue)} en ventas`}
          accent="var(--danger)"
        />
        <StatCard
          icon={balance === 'units' ? IconLayers : IconCoins}
          label={balance === 'units' ? 'Balance de unidades' : 'Balance de dinero'}
          value={
            balance === 'units'
              ? formatNumber(stats.inUnits - stats.outUnits)
              : formatCurrencyCompact(stats.money)
          }
          hint={balance === 'units' ? 'ingresos menos salidas' : 'ventas menos compras'}
          accent={
            balance === 'units'
              ? 'var(--wine-500)'
              : stats.money < 0
                ? 'var(--danger)'
                : 'var(--success)'
          }
          action={
            <button
              className="btn-icon"
              onClick={() => setBalance((b) => (b === 'units' ? 'money' : 'units'))}
              title={balance === 'units' ? 'Ver balance de dinero' : 'Ver balance de unidades'}
              aria-label={
                balance === 'units' ? 'Ver balance de dinero' : 'Ver balance de unidades'
              }
            >
              <IconExchange size={14} />
            </button>
          }
        />
      </section>

      <div className="toolbar">
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Buscar por producto o código"
          label="Buscar movimientos"
        />

        <select
          className="select"
          style={{ width: 'auto' }}
          value={type}
          onChange={(e) => setType(e.target.value)}
          aria-label="Filtrar por tipo"
        >
          <option value="all">Todos los tipos</option>
          <option value="income">Sólo ingresos</option>
          <option value="expense">Sólo salidas</option>
        </select>

        <input
          className="input"
          style={{ width: 'auto' }}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label="Filtrar por fecha"
        />

        {hasFilters && (
          <span className="filter-chip">
            Filtros activos
            <button className="btn-icon" onClick={clearFilters} aria-label="Limpiar filtros">
              <IconX size={13} />
            </button>
          </span>
        )}
      </div>

      <section className="card">
        <div className="card-head">
          <div className="card-title">
            <h2>Historial</h2>
            <span className="card-count">
              {filtered.length === movements.length
                ? `${formatNumber(movements.length)} en total`
                : `${formatNumber(filtered.length)} de ${formatNumber(movements.length)}`}
            </span>
          </div>
        </div>

        {loading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : filtered.length === 0 ? (
          movements.length === 0 ? (
            <EmptyState
              icon={IconExchange}
              title="Aún no hay movimientos"
              text="Registra una entrada o salida desde el inventario y aparecerá aquí."
            />
          ) : (
            <EmptyState
              icon={IconSearch}
              title="Sin resultados"
              text="Ningún movimiento coincide con los filtros aplicados."
            />
          )
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <Th field="created_at" label="Fecha" sort={sort} onSort={toggleSort} />
                  <Th field="product_code" label="Código" sort={sort} onSort={toggleSort} />
                  <Th field="product_name" label="Producto" sort={sort} onSort={toggleSort} />
                  <Th field="type" label="Tipo" sort={sort} onSort={toggleSort} />
                  <Th field="quantity" label="Cantidad" sort={sort} onSort={toggleSort} numeric />
                  <Th field="unit_price" label="Precio unidad" sort={sort} onSort={toggleSort} numeric />
                  <Th field="total" label="Total" sort={sort} onSort={toggleSort} numeric />
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => {
                  const isIncome = m.type === 'income'
                  return (
                    <tr key={m.id}>
                      <td className="td-date">{formatDateTime(m.created_at)}</td>
                      <td className="td-code">{m.product_code}</td>
                      <td className="td-strong">{m.product_name}</td>
                      <td>
                        <span className={`badge ${isIncome ? 'badge-in' : 'badge-out'}`}>
                          <span className="badge-dot" />
                          {isIncome ? 'Ingreso' : 'Salida'}
                        </span>
                      </td>
                      <td className="td-num">{formatNumber(m.quantity)}</td>
                      <td className="td-num">{formatCurrency(m.unit_price)}</td>
                      <td className="td-num td-strong">{formatCurrency(m.total)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
