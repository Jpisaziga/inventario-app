import { useEffect, useRef, useState } from 'react'

/**
 * Gráficos en HTML plano: sin librería, responsivos por construcción y
 * con el mismo sistema de tokens que el resto de la app.
 *
 * Los colores salen de charts.css y están validados para daltonismo y
 * contraste en ambos temas; no se eligen aquí.
 */

/** Capa de tooltip compartida: se posiciona sobre el cursor. */
function useTooltip() {
  const [tip, setTip] = useState(null)

  const bind = (content) => ({
    onMouseEnter: (e) => {
      const r = e.currentTarget.getBoundingClientRect()
      setTip({ content, x: r.left + r.width / 2, y: r.top })
    },
    onMouseMove: (e) => {
      // Se leen del evento antes del updater: dentro ya no es seguro tocarlo.
      const x = e.clientX
      const y = e.currentTarget.getBoundingClientRect().top
      setTip((t) => (t ? { ...t, x, y } : t))
    },
    onMouseLeave: () => setTip(null),
  })

  const node = tip && (
    <div className="viz-tip" style={{ left: tip.x, top: tip.y }} role="tooltip">
      {tip.content}
    </div>
  )

  return [bind, node]
}

/**
 * Ranking en barras horizontales. Una sola serie, así que todas las barras
 * comparten color y no hace falta leyenda: el título dice qué se mide.
 */
export function BarRanking({ data, format, emptyText }) {
  const [bind, tooltip] = useTooltip()

  if (data.length === 0) {
    return <p className="viz-empty">{emptyText}</p>
  }

  // La escala arranca en cero: acortarla exageraría las diferencias.
  const max = Math.max(...data.map((d) => d.value), 0) || 1

  return (
    <div className="viz-bars">
      {data.map((d) => (
        <div className="viz-row" key={d.id} {...bind(`${d.label} · ${format(d.value)}`)}>
          <span className="viz-row-label" title={d.label}>
            {d.label}
          </span>
          <span className="viz-track">
            <span
              className="viz-bar"
              style={{ width: `${Math.max((d.value / max) * 100, d.value > 0 ? 1.5 : 0)}%` }}
            />
          </span>
          <span className="viz-row-value tnum">{format(d.value)}</span>
        </div>
      ))}
      {tooltip}
    </div>
  )
}

/**
 * Barra apilada parte-de-todo. Cada segmento es un estado, no una serie,
 * así que usa la paleta de estado y viaja siempre con icono y etiqueta.
 */
export function StatusBar({ segments, total, unit }) {
  const [bind, tooltip] = useTooltip()
  const shown = segments.filter((s) => s.value > 0)

  if (total === 0) {
    return <p className="viz-empty">Todavía no hay productos para analizar.</p>
  }

  return (
    <div className="viz-status">
      <div className="viz-stack">
        {shown.map((s) => {
          const pct = (s.value / total) * 100
          return (
            <span
              key={s.id}
              className="viz-seg"
              style={{ width: `${pct}%`, background: `var(--viz-${s.tone})` }}
              {...bind(`${s.label}: ${s.value} ${unit} · ${Math.round(pct)}%`)}
            >
              {/* La etiqueta sólo entra si el segmento tiene ancho de sobra;
                  si no, el dato vive en la leyenda y en el tooltip. */}
              {pct >= 14 && <span className="viz-seg-label">{Math.round(pct)}%</span>}
            </span>
          )
        })}
      </div>

      <ul className="viz-legend">
        {segments.map((s) => {
          const Icon = s.icon
          return (
            <li key={s.id}>
              <span className="viz-key" style={{ background: `var(--viz-${s.tone})` }} />
              <Icon size={14} />
              <span className="viz-legend-label">{s.label}</span>
              <span className="viz-legend-value tnum">{s.value}</span>
            </li>
          )
        })}
      </ul>
      {tooltip}
    </div>
  )
}

/** Ancho real del contenedor: el SVG se dibuja en píxeles, sin deformar trazos. */
function useWidth() {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return [ref, width]
}

/**
 * Escala del eje: elige primero un paso limpio y deriva el tope de ahí.
 * Así las marcas caen en cifras redondas y el tope queda pegado al dato,
 * en vez de dejar la mitad del gráfico vacío.
 */
function niceScale(max, tickCount = 4) {
  if (!(max > 0)) return { top: 1, ticks: [0, 1] }

  const raw = max / tickCount
  const base = 10 ** Math.floor(Math.log10(raw))
  const n = raw / base
  const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * base

  const top = Math.ceil(max / step) * step
  const ticks = []
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(v)
  return { top, ticks }
}


const PAD = { top: 16, right: 66, bottom: 40, left: 64 }
const HEIGHT = 262
const LABEL_W = 54

/**
 * Historial de precios en el tiempo.
 *
 * El eje horizontal tiene dos modos, porque resuelven problemas opuestos:
 *
 * - 'seq' da una ranura a cada movimiento, en orden cronológico. Dos
 *   compras del mismo día quedan una al lado de la otra y se pueden
 *   señalar por separado. Es el modo por defecto: sobre un eje de meses,
 *   un día mide menos de un píxel y los movimientos se superponen.
 * - 'time' usa la fecha real, así que se ve cuánto tiempo pasó entre un
 *   precio y otro, a costa de volver a apilar lo del mismo día.
 */
export function PriceHistory({
  series,
  mode = 'seq',
  formatValue,
  formatDate,
  formatAxisDate,
  dayKeyOf,
  emptyText,
}) {
  const [wrapRef, width] = useWidth()
  const [hover, setHover] = useState(null)

  const withData = series.filter((s) => s.points.length > 0)
  const allPoints = withData.flatMap((s) => s.points.map((p) => ({ ...p, serie: s })))

  if (allPoints.length === 0) {
    return (
      <div ref={wrapRef} className="viz-line">
        <p className="viz-empty">{emptyText}</p>
      </div>
    )
  }

  const plotW = Math.max(width - PAD.left - PAD.right, 10)
  const plotH = HEIGHT - PAD.top - PAD.bottom
  const baseY = PAD.top + plotH

  const { top: yMax, ticks } = niceScale(Math.max(...allPoints.map((p) => p.v)))
  const y = (v) => PAD.top + plotH - (v / yMax) * plotH

  // Orden cronológico único de todos los movimientos visibles: en modo
  // secuencia define las ranuras, y las series se cuelgan de ellas.
  const ordered = [...allPoints].sort((a, b) => a.t - b.t || (a.id < b.id ? -1 : 1))
  const slotOf = new Map(ordered.map((p, i) => [p.id, i]))
  const slotW = plotW / ordered.length

  const times = ordered.map((p) => p.t)
  const tMin = times[0]
  const tMax = times[times.length - 1]

  const xTime = (t) =>
    tMax === tMin ? PAD.left + plotW / 2 : PAD.left + ((t - tMin) / (tMax - tMin)) * plotW
  const xSeq = (p) => PAD.left + slotW * (slotOf.get(p.id) + 0.5)
  const xOf = (p) => (mode === 'seq' ? xSeq(p) : xTime(p.t))

  // Movimientos agrupados por día: sirven para etiquetar el eje una sola
  // vez por fecha y para separar visualmente un día del siguiente.
  const days = []
  for (const p of ordered) {
    const key = dayKeyOf(p.t)
    const last = days[days.length - 1]
    if (last && last.key === key) last.items.push(p)
    else days.push({ key, t: p.t, items: [p] })
  }

  // Etiquetas de fecha, saltando las que se pisarían con la anterior.
  const dayLabels = []
  if (mode === 'seq') {
    let start = 0
    let lastRight = -Infinity
    for (const d of days) {
      const center = PAD.left + slotW * (start + d.items.length / 2)
      if (center - LABEL_W / 2 > lastRight) {
        dayLabels.push({ key: d.key, t: d.t, x: center })
        lastRight = center + LABEL_W / 2
      }
      start += d.items.length
    }
  } else {
    const count = Math.min(plotW > 560 ? 5 : plotW > 340 ? 4 : 3, new Set(times).size)
    const stamps =
      tMax === tMin
        ? [tMin]
        : Array.from({ length: count }, (_, i) => tMin + ((tMax - tMin) * i) / (count - 1))
    stamps.forEach((t, i) => dayLabels.push({ key: `t${i}`, t, x: xTime(t) }))
  }

  // Líneas divisorias entre días, sólo donde el modo secuencia las separa.
  const dayEdges = []
  if (mode === 'seq' && days.length > 1) {
    let acc = 0
    for (const d of days.slice(0, -1)) {
      acc += d.items.length
      dayEdges.push(PAD.left + slotW * acc)
    }
  }

  const onMove = (e) => {
    const px = e.clientX - e.currentTarget.getBoundingClientRect().left
    let best = ordered[0]
    for (const p of ordered) if (Math.abs(xOf(p) - px) < Math.abs(xOf(best) - px)) best = p
    setHover(best)
  }

  // Cuántos movimientos comparten el día del punto señalado: es justamente
  // lo que el eje de tiempo no dejaba ver.
  const sameDay = hover ? (days.find((d) => d.key === dayKeyOf(hover.t))?.items ?? []) : []
  const hoverRank = hover ? sameDay.findIndex((p) => p.id === hover.id) + 1 : 0

  const ends = withData.map((s) => {
    const last = s.points[s.points.length - 1]
    return { id: s.id, x: xOf(last), y: y(last.v), v: last.v }
  })
  const endsCollide = ends.length === 2 && Math.abs(ends[0].y - ends[1].y) < 15

  return (
    <div ref={wrapRef} className="viz-line">
      {width > 0 && (
        <svg width={width} height={HEIGHT} role="img" aria-label="Historial de precios">
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={PAD.left + plotW}
                y1={y(t)}
                y2={y(t)}
                className="viz-grid-line"
              />
              <text x={PAD.left - 10} y={y(t) + 4} className="viz-axis" textAnchor="end">
                {formatValue(t)}
              </text>
            </g>
          ))}

          {dayEdges.map((edge) => (
            <line
              key={edge}
              x1={edge}
              x2={edge}
              y1={PAD.top}
              y2={baseY + 5}
              className="viz-day-edge"
            />
          ))}

          {dayLabels.map((d) => (
            <text key={d.key} x={d.x} y={HEIGHT - 20} className="viz-axis" textAnchor="middle">
              {formatAxisDate(d.t)}
            </text>
          ))}

          {hover && (
            <line
              x1={xOf(hover)}
              x2={xOf(hover)}
              y1={PAD.top}
              y2={baseY}
              className="viz-crosshair"
            />
          )}

          {withData.map((s) => {
            const pts = s.points
            return (
              <g key={s.id}>
                {pts.length > 1 && (
                  <polyline
                    points={pts.map((p) => `${xOf(p)},${y(p.v)}`).join(' ')}
                    fill="none"
                    stroke={s.color}
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                )}
                {pts.map((p) => (
                  <circle
                    key={p.id}
                    cx={xOf(p)}
                    cy={y(p.v)}
                    r={hover?.id === p.id ? 6 : 4}
                    fill={s.color}
                    className="viz-dot"
                  />
                ))}
              </g>
            )
          })}

          {!endsCollide &&
            ends.map((e) => (
              <text key={e.id} x={e.x + 9} y={e.y + 4} className="viz-end-label">
                {formatValue(e.v)}
              </text>
            ))}

          <rect
            x={PAD.left}
            y={PAD.top}
            width={plotW}
            height={plotH}
            fill="transparent"
            onMouseMove={onMove}
            onMouseLeave={() => setHover(null)}
          />
        </svg>
      )}

      {hover && (
        <div className="viz-line-tip" style={{ left: xOf(hover) }}>
          <strong>{formatDate(hover.t)}</strong>
          <span>
            <i style={{ background: hover.serie.color }} />
            {hover.serie.label}: {formatValue(hover.v)}
          </span>
          {hover.qty != null && <span className="viz-tip-sub">{hover.qty} unidades</span>}
          {sameDay.length > 1 && (
            <span className="viz-tip-sub">
              Movimiento {hoverRank} de {sameDay.length} ese día
            </span>
          )}
        </div>
      )}

      {withData.length >= 2 && (
        <ul className="viz-legend">
          {withData.map((s) => (
            <li key={s.id}>
              <span className="viz-key" style={{ background: s.color }} />
              <span className="viz-legend-label">{s.label}</span>
              <span className="viz-legend-value tnum">{s.points.length} reg.</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
