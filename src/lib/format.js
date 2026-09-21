/* Formateo compartido de fechas, moneda y números (es-CO). */

// Los registros llegan en UTC y se muestran en hora de Colombia.
// Mismo desfase que usaba la versión anterior de la app.
const TZ_OFFSET_HOURS = -5

/** Convierte un timestamp del backend a un Date ya desplazado a hora local. */
export function toLocalDate(value) {
  const d = new Date(value)
  d.setHours(d.getHours() + TZ_OFFSET_HOURS)
  return d
}

/** Día en formato YYYY-MM-DD, para comparar contra un <input type="date">. */
export function toDayKey(date) {
  return (
    date.getFullYear() +
    '-' +
    String(date.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(date.getDate()).padStart(2, '0')
  )
}

const dateTimeFmt = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
})

const currencyFmt = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

const numberFmt = new Intl.NumberFormat('es-CO')

const compactFmt = new Intl.NumberFormat('es-CO', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

export function formatDateTime(value) {
  return dateTimeFmt.format(toLocalDate(value))
}

export function formatCurrency(value) {
  return currencyFmt.format(Number(value) || 0)
}

/** Moneda abreviada ($1,2 M) para las tarjetas de métricas. */
export function formatCurrencyCompact(value) {
  const n = Number(value) || 0
  return n >= 1_000_000 ? '$' + compactFmt.format(n) : currencyFmt.format(n)
}

export function formatNumber(value) {
  return numberFmt.format(Number(value) || 0)
}
