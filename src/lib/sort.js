/* Comparador estable para las tablas: texto por locale, números por valor. */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T/

export function compareBy(field, order) {
  const dir = order === 'asc' ? 1 : -1

  return (a, b) => {
    const x = a[field]
    const y = b[field]

    // Los vacíos van siempre al final, sin importar la dirección.
    const xEmpty = x === null || x === undefined || x === ''
    const yEmpty = y === null || y === undefined || y === ''
    if (xEmpty || yEmpty) return xEmpty && yEmpty ? 0 : xEmpty ? 1 : -1

    if (typeof x === 'number' && typeof y === 'number') return (x - y) * dir

    // Timestamps ISO: se comparan como fechas, no como texto.
    if (ISO_DATE.test(x) && ISO_DATE.test(y)) return (new Date(x) - new Date(y)) * dir

    return String(x).localeCompare(String(y), 'es', { numeric: true }) * dir
  }
}
