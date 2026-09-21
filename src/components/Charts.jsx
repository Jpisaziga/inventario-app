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

const PAD = { top: 16, right: 64, bottom: 28, left: 62 }
const HEIGHT = 250

/**
 * Historial de precios en el tiempo. Las dos series comparten unidad y
 * escala, así que van en un mismo eje: el valor está justamente en la
 * distancia entre ambas. Dos ejes inventarían una relación inexistente.
 */
export function PriceHistory({ series, formatValue, formatDate }) {
  const [wrapRef, width] = useWidth()
  const [hover, setHover] = useState(null)

  const withData = series.filter((s) => s.points.length > 0)
  const allPoints = withData.flatMap((s) => s.points)

  if (allPoints.length === 0) {
    return (
      <div ref={wrapRef} className="viz-line">
        <p className="viz-empty">Este producto todavía no tiene movimientos registrados.</p>
      </div>
    )
  }

  const plotW = Math.max(width - PAD.left - PAD.right, 10)
  const plotH = HEIGHT - PAD.top - PAD.bottom

  const times = allPoints.map((p) => p.t)
  const tMin = Math.min(...times)
  const tMax = Math.max(...times)
  const { top: yMax, ticks } = niceScale(Math.max(...allPoints.map((p) => p.v)))

  const x = (t) => (tMax === tMin ? PAD.left + plotW / 2 : PAD.left + ((t - tMin) / (tMax - tMin)) * plotW)
  const y = (v) => PAD.top + plotH - (v / yMax) * plotH

  // Cada instante con movimiento es una parada del crosshair.
  const stops = [...new Set(times)].sort((a, b) => a - b)

  const onMove = (e) => {
    const box = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - box.left
    let best = stops[0]
    for (const t of stops) if (Math.abs(x(t) - px) < Math.abs(x(best) - px)) best = t
    setHover(best)
  }

  const hovered =
    hover != null
      ? withData
          .map((s) => ({ ...s, hit: s.points.filter((p) => p.t === hover) }))
          .filter((s) => s.hit.length > 0)
      : []

  // Etiquetas al final de cada línea; si chocan, la leyenda las reemplaza.
  const ends = withData.map((s) => {
    const last = s.points[s.points.length - 1]
    return { id: s.id, color: s.color, x: x(last.t), y: y(last.v), v: last.v }
  })
  const endsCollide =
    ends.length === 2 && Math.abs(ends[0].y - ends[1].y) < 15

  return (
    <div ref={wrapRef} className="viz-line">
      {width > 0 && (
        <svg width={width} height={HEIGHT} role="img" aria-label="Historial de precios">
          {/* Rejilla recesiva, trazo fino y continuo. */}
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

          <text x={PAD.left} y={HEIGHT - 8} className="viz-axis">
            {formatDate(tMin)}
          </text>
          {tMax !== tMin && (
            <text x={PAD.left + plotW} y={HEIGHT - 8} className="viz-axis" textAnchor="end">
              {formatDate(tMax)}
            </text>
          )}

          {hover != null && (
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={PAD.top}
              y2={PAD.top + plotH}
              className="viz-crosshair"
            />
          )}

          {withData.map((s) => (
            <g key={s.id}>
              {s.points.length > 1 && (
                <polyline
                  points={s.points.map((p) => `${x(p.t)},${y(p.v)}`).join(' ')}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              )}
              {s.points.map((p, i) => (
                <circle
                  key={i}
                  cx={x(p.t)}
                  cy={y(p.v)}
                  r="4"
                  fill={s.color}
                  className="viz-dot"
                />
              ))}
            </g>
          ))}

          {!endsCollide &&
            ends.map((e) => (
              <text key={e.id} x={e.x + 9} y={e.y + 4} className="viz-end-label">
                {formatValue(e.v)}
              </text>
            ))}

          {/* Capa de captura: toda el área del gráfico responde al cursor. */}
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

      {hovered.length > 0 && (
        <div className="viz-line-tip" style={{ left: x(hover) }}>
          <strong>{formatDate(hover)}</strong>
          {hovered.map((s) => (
            <span key={s.id}>
              <i style={{ background: s.color }} />
              {s.label}: {formatValue(s.hit[0].v)}
            </span>
          ))}
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
