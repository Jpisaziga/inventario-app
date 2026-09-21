import { IconSearch, IconX, IconArrowUp, IconInbox } from './Icons'

/** Tarjeta de métrica. `accent` es un color CSS que tiñe filo e icono. */
export function StatCard({ icon: Icon, label, value, hint, accent }) {
  return (
    <div className="stat" style={accent ? { '--stat-accent': accent } : undefined}>
      <div className="stat-top">
        {Icon && (
          <span className="stat-icon">
            <Icon size={15} />
          </span>
        )}
        <span className="stat-label">{label}</span>
      </div>
      <div className="stat-value">{value}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  )
}

/** Campo de búsqueda con icono y botón de limpieza. */
export function SearchField({ value, onChange, placeholder, label }) {
  return (
    <div className="search">
      <IconSearch size={15} />
      <input
        className="input"
        type="search"
        aria-label={label ?? placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button
          className="btn-icon search-clear"
          onClick={() => onChange('')}
          aria-label="Limpiar búsqueda"
        >
          <IconX size={14} />
        </button>
      )}
    </div>
  )
}

/**
 * Encabezado de columna ordenable. Sin `field` queda como encabezado simple,
 * útil para la columna de acciones.
 */
export function Th({ field, label, sort, onSort, numeric }) {
  const active = sort?.field === field
  const className = numeric ? 'th-num' : undefined

  if (!field) {
    return (
      <th className={className} scope="col">
        <span className="th-inner">{label}</span>
      </th>
    )
  }

  return (
    <th
      className={className}
      scope="col"
      aria-sort={active ? (sort.order === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        className={`th-inner${active ? ' th-sorted' : ''}`}
        onClick={() => onSort(field)}
        title={`Ordenar por ${label}`}
      >
        {label}
        <IconArrowUp
          size={12}
          className={`th-arrow${active && sort.order === 'desc' ? ' th-arrow-desc' : ''}`}
        />
      </button>
    </th>
  )
}

/** Estado vacío: sin datos aún, o sin resultados para el filtro actual. */
export function EmptyState({ icon, title, text }) {
  const Icon = icon ?? IconInbox

  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon size={21} />
      </span>
      <p className="empty-title">{title}</p>
      {text && <p className="empty-text">{text}</p>}
    </div>
  )
}

/** Placeholder animado mientras llega la primera carga. */
export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div>
      {Array.from({ length: rows }, (_, r) => (
        <div className="skeleton-row" key={r}>
          {Array.from({ length: cols }, (_, c) => (
            <span
              className="skeleton-bar"
              key={c}
              style={{ maxWidth: c === 0 ? 90 : undefined, opacity: 1 - r * 0.13 }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
