import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabaseClient'
import { useToast } from '../hooks/useToast'
import Modal, { ConfirmModal } from '../components/Modal'
import { EmptyState, TableSkeleton } from '../components/Ui'
import {
  IconPlus,
  IconTrash,
  IconCheck,
  IconNote,
  IconAlert,
  IconArrowDownCircle,
  IconArrowUpCircle,
  IconInfo,
} from '../components/Icons'
import { formatNumber } from '../lib/format'

/** SQL que crea la tabla; se muestra si Supabase responde que no existe. */
const SETUP_SQL = `create table public.notes (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text,
  kind       text not null default 'buy',
  product_id uuid references public.products(id) on delete set null,
  quantity   numeric,
  due_date   date,
  done       boolean not null default false,
  created_at timestamp not null default now()
);

alter table public.notes enable row level security;

create policy "acceso publico a notes"
  on public.notes for all
  using (true) with check (true);`

const KINDS = {
  buy: { label: 'Comprar', icon: IconArrowDownCircle, tone: 'in' },
  sell: { label: 'Vender', icon: IconArrowUpCircle, tone: 'out' },
  general: { label: 'General', icon: IconInfo, tone: 'neutral' },
}

const EMPTY_NOTE = {
  kind: 'buy',
  title: '',
  body: '',
  productId: '',
  quantity: '',
  dueDate: '',
}

/** Día de hoy en formato YYYY-MM-DD, para comparar contra due_date. */
function todayKey() {
  const d = new Date()
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  )
}

export default function Notes() {
  const toast = useToast()

  const [notes, setNotes] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [needsSetup, setNeedsSetup] = useState(false)

  const [filter, setFilter] = useState('pending') // pending | done | all
  const [kindFilter, setKindFilter] = useState('all')

  const [modalOpen, setModalOpen] = useState(false)
  const [draft, setDraft] = useState(EMPTY_NOTE)
  const [confirming, setConfirming] = useState(null)

  const loadNotes = () =>
    supabase
      .from('notes')
      .select('*')
      .then(({ data, error }) => {
        // PGRST205 = la tabla no existe todavía en el esquema.
        if (error?.code === 'PGRST205') setNeedsSetup(true)
        else if (error) toast.error('No se pudieron cargar las notas')
        else setNeedsSetup(false)
        setNotes(data ?? [])
        setLoading(false)
      })

  useEffect(() => {
    loadNotes()
    supabase
      .from('products')
      .select('id, name, code')
      .then(({ data }) => setProducts(data ?? []))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const today = todayKey()

  const visible = useMemo(() => {
    return notes
      .filter((n) => {
        if (filter === 'pending' && n.done) return false
        if (filter === 'done' && !n.done) return false
        if (kindFilter !== 'all' && n.kind !== kindFilter) return false
        return true
      })
      .sort((a, b) => {
        // Primero lo pendiente, después por fecha límite más cercana.
        if (a.done !== b.done) return a.done ? 1 : -1
        if (a.due_date && b.due_date) return a.due_date < b.due_date ? -1 : 1
        if (a.due_date) return -1
        if (b.due_date) return 1
        return new Date(b.created_at) - new Date(a.created_at)
      })
  }, [notes, filter, kindFilter])

  const pendingCount = notes.filter((n) => !n.done).length
  const overdueCount = notes.filter((n) => !n.done && n.due_date && n.due_date < today).length

  const handleCreate = async (e) => {
    e.preventDefault()
    const title = draft.title.trim()
    if (!title) return toast.error('Escribí de qué se trata la nota')

    setSaving(true)
    const { error } = await supabase.from('notes').insert([
      {
        kind: draft.kind,
        title,
        body: draft.body.trim() || null,
        product_id: draft.productId || null,
        quantity: draft.quantity === '' ? null : Number(draft.quantity),
        due_date: draft.dueDate || null,
        done: false,
      },
    ])
    setSaving(false)

    if (error) return toast.error('No se pudo guardar la nota')
    toast.success('Nota agregada')
    setDraft(EMPTY_NOTE)
    setModalOpen(false)
    loadNotes()
  }

  const handleToggle = async (note) => {
    const { error } = await supabase
      .from('notes')
      .update({ done: !note.done })
      .eq('id', note.id)
    if (error) return toast.error('No se pudo actualizar la nota')
    loadNotes()
  }

  const handleDelete = async () => {
    const note = confirming
    setConfirming(null)
    const { error } = await supabase.from('notes').delete().eq('id', note.id)
    if (error) return toast.error('No se pudo eliminar la nota')
    toast.success('Nota eliminada')
    loadNotes()
  }

  const productName = (id) => products.find((p) => String(p.id) === String(id))?.name

  if (needsSetup) {
    return (
      <div className="page-inner">
        <header className="page-head">
          <div>
            <span className="page-eyebrow">Planeación</span>
            <h1>Notas</h1>
          </div>
        </header>

        <section className="card setup">
          <div className="setup-head">
            <span className="modal-icon">
              <IconAlert size={19} />
            </span>
            <div>
              <h2>Falta crear la tabla en Supabase</h2>
              <p className="page-sub">
                Las notas se guardan junto al resto de los datos, pero la tabla{' '}
                <code>notes</code> todavía no existe. Copiá este SQL, pegalo en el editor
                SQL de tu proyecto en Supabase y ejecutalo. Después recargá esta página.
              </p>
            </div>
          </div>

          <pre className="setup-sql">{SETUP_SQL}</pre>

          <div className="setup-actions">
            <button
              className="btn btn-outline"
              onClick={() => {
                navigator.clipboard
                  ?.writeText(SETUP_SQL)
                  .then(() => toast.success('SQL copiado'))
                  .catch(() => toast.error('No se pudo copiar; seleccionalo a mano'))
              }}
            >
              Copiar SQL
            </button>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              Ya lo ejecuté, recargar
            </button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="page-inner">
      <header className="page-head">
        <div>
          <span className="page-eyebrow">Planeación</span>
          <h1>Notas</h1>
          <p className="page-sub">
            Compras pendientes, ventas estimadas y recordatorios, con producto,
            cantidad y fecha.
          </p>
        </div>
      </header>

      <div className="toolbar">
        <label className="field-inline">
          <span className="field-hint">Estado</span>
          <select
            className="select"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Filtrar por estado"
          >
            <option value="pending">Pendientes</option>
            <option value="done">Completadas</option>
            <option value="all">Todas</option>
          </select>
        </label>

        <label className="field-inline">
          <span className="field-hint">Tipo</span>
          <select
            className="select"
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value)}
            aria-label="Filtrar por tipo"
          >
            <option value="all">Todos</option>
            {Object.entries(KINDS).map(([key, k]) => (
              <option key={key} value={key}>
                {k.label}
              </option>
            ))}
          </select>
        </label>

        {overdueCount > 0 && (
          <span className="filter-chip chip-warn">
            <IconAlert size={13} />
            {overdueCount} vencida{overdueCount > 1 ? 's' : ''}
          </span>
        )}

        <div className="toolbar-actions">
          <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
            <IconPlus size={15} />
            Nueva nota
          </button>
        </div>
      </div>

      <section className="card">
        <div className="card-head">
          <div className="card-title">
            <h2>Notas</h2>
            <span className="card-count">
              {formatNumber(pendingCount)} pendiente{pendingCount === 1 ? '' : 's'} ·{' '}
              {formatNumber(visible.length)} en vista
            </span>
          </div>
        </div>

        {loading ? (
          <TableSkeleton rows={4} cols={3} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={IconNote}
            title={notes.length === 0 ? 'Todavía no hay notas' : 'Nada con estos filtros'}
            text={
              notes.length === 0
                ? 'Anotá qué necesitás comprar o cuánto estimás vender, y cuándo.'
                : 'Probá cambiando el estado o el tipo.'
            }
          />
        ) : (
          <ul className="note-list">
            {visible.map((n) => {
              const kind = KINDS[n.kind] ?? KINDS.general
              const KindIcon = kind.icon
              const overdue = !n.done && n.due_date && n.due_date < today
              const name = productName(n.product_id)

              return (
                <li key={n.id} className={`note${n.done ? ' note-done' : ''}`}>
                  <button
                    className={`note-check${n.done ? ' note-check-on' : ''}`}
                    onClick={() => handleToggle(n)}
                    aria-pressed={n.done}
                    aria-label={n.done ? 'Marcar como pendiente' : 'Marcar como hecha'}
                  >
                    {n.done && <IconCheck size={13} />}
                  </button>

                  <div className="note-body">
                    <div className="note-top">
                      <span className={`badge badge-${kind.tone}`}>
                        <KindIcon size={12} />
                        {kind.label}
                      </span>
                      <span className="note-title">{n.title}</span>
                    </div>

                    <div className="note-meta">
                      {name && <span>{name}</span>}
                      {n.quantity != null && <span>{formatNumber(n.quantity)} unidades</span>}
                      {n.due_date && (
                        <span className={overdue ? 'note-overdue' : undefined}>
                          {overdue && <IconAlert size={12} />}
                          Para el {n.due_date}
                        </span>
                      )}
                    </div>

                    {n.body && <p className="note-text">{n.body}</p>}
                  </div>

                  <button
                    className="btn-icon btn-icon-danger"
                    onClick={() => setConfirming(n)}
                    aria-label={`Eliminar la nota ${n.title}`}
                    title="Eliminar"
                  >
                    <IconTrash size={15} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {modalOpen && (
        <Modal
          title="Nueva nota"
          description="Anotá qué hay que hacer, con qué producto y para cuándo."
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>
                Cancelar
              </button>
              <button className="btn btn-primary" form="form-note" type="submit" disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar nota'}
              </button>
            </>
          }
        >
          <form id="form-note" onSubmit={handleCreate} style={{ display: 'contents' }}>
            <div className="field">
              <span className="field-label">Tipo</span>
              <div className="segmented segmented-3">
                {Object.entries(KINDS).map(([key, k]) => {
                  const KindIcon = k.icon
                  return (
                    <button
                      key={key}
                      type="button"
                      className={draft.kind === key ? 'seg-active' : ''}
                      onClick={() => setDraft({ ...draft, kind: key })}
                    >
                      <KindIcon size={15} />
                      {k.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <label className="field">
              <span className="field-label">De qué se trata</span>
              <input
                className="input"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Comprar platina antes del lunes"
              />
            </label>

            <label className="field">
              <span className="field-label">
                Producto <span className="field-hint">(opcional)</span>
              </span>
              <select
                className="select"
                value={draft.productId}
                onChange={(e) => setDraft({ ...draft, productId: e.target.value })}
              >
                <option value="">Sin producto asociado</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.code}
                  </option>
                ))}
              </select>
            </label>

            <div className="modal-grid">
              <label className="field">
                <span className="field-label">
                  Cantidad <span className="field-hint">(opcional)</span>
                </span>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="1"
                  value={draft.quantity}
                  onChange={(e) => setDraft({ ...draft, quantity: e.target.value })}
                  placeholder="0"
                />
              </label>
              <label className="field">
                <span className="field-label">
                  Para cuándo <span className="field-hint">(opcional)</span>
                </span>
                <input
                  className="input"
                  type="date"
                  value={draft.dueDate}
                  onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}
                />
              </label>
            </div>

            <label className="field">
              <span className="field-label">
                Detalle <span className="field-hint">(opcional)</span>
              </span>
              <textarea
                className="input note-textarea"
                rows={3}
                value={draft.body}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                placeholder="Proveedor, precio acordado, condiciones…"
              />
            </label>
          </form>
        </Modal>
      )}

      {confirming && (
        <ConfirmModal
          title="Eliminar nota"
          description={`"${confirming.title}" se eliminará. Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          onConfirm={handleDelete}
          onClose={() => setConfirming(null)}
        />
      )}
    </div>
  )
}
