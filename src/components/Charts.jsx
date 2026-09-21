import { useState } from 'react'

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
