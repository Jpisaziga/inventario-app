import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabaseClient'
import { useToast } from '../hooks/useToast'
import Modal, { ConfirmModal } from '../components/Modal'
import { StatCard, SearchField, Th, EmptyState, TableSkeleton } from '../components/Ui'
import {
  IconPlus,
  IconPencil,
  IconTrash,
  IconCheck,
  IconX,
  IconExchange,
  IconBox,
  IconAlert,
  IconArrowDownCircle,
  IconArrowUpCircle,
  IconSearch,
} from '../components/Icons'
import { formatCurrency, formatNumber } from '../lib/format'
import { compareBy } from '../lib/sort'

// Umbral a partir del cual una existencia se marca como "bajo".
const LOW_STOCK = 5

const EMPTY_MOVE = { type: 'income', productId: '', quantity: '', unitPrice: '', description: '' }

export default function Inventory() {
  const toast = useToast()

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [search, setSearch] = useState('')
  const [sort, setSort] = useState({ field: 'name', order: 'asc' })

  const [modal, setModal] = useState(null) // 'add' | 'move' | null
  const [confirming, setConfirming] = useState(null) // producto a eliminar

  const [newProduct, setNewProduct] = useState({ code: '', name: '' })
  const [move, setMove] = useState(EMPTY_MOVE)

  const [editMode, setEditMode] = useState(false)
  const [editing, setEditing] = useState(null) // { id, code, name }

  const loadData = () =>
    supabase
      .from('products')
      .select('*')
      .then(({ data, error }) => {
        if (error) toast.error('No se pudieron cargar los productos')
        setProducts(data ?? [])
        setLoading(false)
      })

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products
      .filter(
        (p) =>
          !q ||
          p.name?.toLowerCase().includes(q) ||
          p.code?.toLowerCase().includes(q),
      )
      .sort(compareBy(sort.field, sort.order))
  }, [products, search, sort])

  const alerts = useMemo(() => {
    const out = products.filter((p) => !p.stock).length
    const low = products.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK).length
    return { out, low, total: out + low }
  }, [products])

  const toggleSort = (field) =>
    setSort((s) =>
      s.field === field ? { field, order: s.order === 'asc' ? 'desc' : 'asc' } : { field, order: 'asc' },
    )

  // --- Productos -------------------------------------------------

  const handleAddProduct = async (e) => {
    e.preventDefault()
    const code = newProduct.code.trim()
    const name = newProduct.name.trim()
    if (!code || !name) return toast.error('Completa código y nombre')

    setSaving(true)
    const { error } = await supabase
      .from('products')
      .insert([{ code, name, stock: 0, last_unit_price: 0 }])
    setSaving(false)

    if (error) return toast.error('No se pudo crear el producto')
    toast.success(`"${name}" agregado al inventario`)
    setNewProduct({ code: '', name: '' })
    setModal(null)
    loadData()
  }

  const handleSaveEdit = async () => {
    const code = editing.code.trim()
    const name = editing.name.trim()
    if (!code || !name) return toast.error('Completa código y nombre')

    const { error } = await supabase.from('products').update({ code, name }).eq('id', editing.id)
    if (error) return toast.error('No se pudo guardar el cambio')

    toast.success('Producto actualizado')
    setEditing(null)
    loadData()
  }

  const handleDelete = async () => {
    const product = confirming
    setConfirming(null)

    const { error } = await supabase.from('products').delete().eq('id', product.id)
    if (error) return toast.error('No se pudo eliminar el producto')

    toast.success(`"${product.name}" eliminado`)
    loadData()
  }

  // --- Movimientos -----------------------------------------------

  const moveProduct = products.find((p) => String(p.id) === String(move.productId))
  const moveTotal = (Number(move.quantity) || 0) * (Number(move.unitPrice) || 0)

  const handleMove = async (e) => {
    e.preventDefault()
    if (!moveProduct) return toast.error('Selecciona un producto')

    const quantity = Number(move.quantity)
    const unitPrice = Number(move.unitPrice)
    if (!quantity || quantity <= 0) return toast.error('La cantidad debe ser mayor a cero')
    if (!unitPrice || unitPrice < 0) return toast.error('Indica el precio por unidad')

    const isIncome = move.type === 'income'
    const newStock = isIncome ? moveProduct.stock + quantity : moveProduct.stock - quantity
    if (newStock < 0) {
      return toast.error(`Stock insuficiente: quedan ${formatNumber(moveProduct.stock)} unidades`)
    }

    setSaving(true)
    const update = { stock: newStock }
    // El último precio sólo se actualiza con ingresos: es el costo de compra.
    if (isIncome) update.last_unit_price = unitPrice

    const { error: updateError } = await supabase
      .from('products')
      .update(update)
      .eq('id', moveProduct.id)

    if (updateError) {
      setSaving(false)
      return toast.error('No se pudo actualizar el stock')
    }

    const { error: moveError } = await supabase.from('movements').insert([
      {
        product_id: moveProduct.id,
        product_name: moveProduct.name,
        product_code: moveProduct.code,
        type: move.type,
        quantity,
        unit_price: unitPrice,
        total: quantity * unitPrice,
        description: move.description.trim(),
      },
    ])
    setSaving(false)

    if (moveError) return toast.error('El stock cambió, pero no se registró el movimiento')

    toast.success(
      `${isIncome ? 'Ingreso' : 'Salida'} de ${formatNumber(quantity)} × ${moveProduct.name}`,
    )
    setMove(EMPTY_MOVE)
    setModal(null)
    loadData()
  }

  const closeMove = () => {
    setModal(null)
    setMove(EMPTY_MOVE)
  }

  return (
    <div className="page-inner">
      <header className="page-head">
        <div>
          <span className="page-eyebrow">Gestión</span>
          <h1>Inventario</h1>
          <p className="page-sub">
            Existencias actuales, último costo por unidad y registro de entradas y salidas.
          </p>
        </div>
      </header>

      {alerts.total > 0 && (
        <section className="stats stats-single">
          <StatCard
            icon={IconAlert}
            label="Requieren atención"
            value={formatNumber(alerts.total)}
            hint={`${alerts.out} sin stock · ${alerts.low} en nivel bajo`}
            accent="var(--warning)"
          />
        </section>
      )}

      <div className="toolbar">
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nombre o código"
          label="Buscar productos"
        />
        <div className="toolbar-actions">
          <button
            className={`btn btn-outline${editMode ? ' btn-toggled' : ''}`}
            onClick={() => {
              setEditMode((v) => !v)
              setEditing(null)
            }}
            aria-pressed={editMode}
          >
            <IconPencil size={15} />
            {editMode ? 'Salir de edición' : 'Editar'}
          </button>
          <button className="btn btn-outline" onClick={() => setModal('add')}>
            <IconPlus size={15} />
            Agregar producto
          </button>
          <button className="btn btn-primary" onClick={() => setModal('move')}>
            <IconExchange size={15} />
            Registrar movimiento
          </button>
        </div>
      </div>

      <section className="card">
        <div className="card-head">
          <div className="card-title">
            <h2>Productos</h2>
            <span className="card-count">
              {filtered.length === products.length
                ? `${formatNumber(products.length)} en total`
                : `${formatNumber(filtered.length)} de ${formatNumber(products.length)}`}
            </span>
          </div>
        </div>

        {loading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : filtered.length === 0 ? (
          products.length === 0 ? (
            <EmptyState
              icon={IconBox}
              title="Todavía no hay productos"
              text="Agrega tu primera referencia para empezar a llevar el control de existencias."
            />
          ) : (
            <EmptyState
              icon={IconSearch}
              title="Sin resultados"
              text={`Ningún producto coincide con "${search}".`}
            />
          )
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <Th field="code" label="Código" sort={sort} onSort={toggleSort} />
                  <Th field="name" label="Producto" sort={sort} onSort={toggleSort} />
                  <Th field="stock" label="Existencias" sort={sort} onSort={toggleSort} numeric />
                  <Th
                    field="last_unit_price"
                    label="Último precio"
                    sort={sort}
                    onSort={toggleSort}
                    numeric
                  />
                  {editMode && <Th label="Acciones" numeric />}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const isEditing = editMode && editing?.id === p.id
                  const level = !p.stock ? 'stock-empty' : p.stock <= LOW_STOCK ? 'stock-low' : ''

                  return (
                    <tr key={p.id} className={isEditing ? 'row-editing' : undefined}>
                      {isEditing ? (
                        <>
                          <td>
                            <input
                              className="input input-cell"
                              value={editing.code}
                              onChange={(e) => setEditing({ ...editing, code: e.target.value })}
                              aria-label="Código"
                            />
                          </td>
                          <td>
                            <input
                              className="input input-cell"
                              value={editing.name}
                              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                              aria-label="Nombre"
                            />
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="td-code">{p.code}</td>
                          <td className="td-strong">{p.name}</td>
                        </>
                      )}

                      <td className="td-num">
                        <span className={`stock ${level}`}>
                          {level && (
                            <span className="stock-tag">{p.stock ? 'Bajo' : 'Sin stock'}</span>
                          )}
                          {formatNumber(p.stock)}
                        </span>
                      </td>
                      <td className="td-num">{formatCurrency(p.last_unit_price)}</td>

                      {editMode && (
                        <td className="td-actions">
                          <div className="row-actions">
                            {isEditing ? (
                              <>
                                <button
                                  className="btn-icon btn-icon-success"
                                  onClick={handleSaveEdit}
                                  aria-label="Guardar cambios"
                                  title="Guardar"
                                >
                                  <IconCheck size={16} />
                                </button>
                                <button
                                  className="btn-icon"
                                  onClick={() => setEditing(null)}
                                  aria-label="Cancelar edición"
                                  title="Cancelar"
                                >
                                  <IconX size={16} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  className="btn-icon"
                                  onClick={() =>
                                    setEditing({ id: p.id, code: p.code, name: p.name })
                                  }
                                  aria-label={`Editar ${p.name}`}
                                  title="Editar"
                                >
                                  <IconPencil size={15} />
                                </button>
                                <button
                                  className="btn-icon btn-icon-danger"
                                  onClick={() => setConfirming(p)}
                                  aria-label={`Eliminar ${p.name}`}
                                  title="Eliminar"
                                >
                                  <IconTrash size={15} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* --- Nuevo producto --- */}
      {modal === 'add' && (
        <Modal
          title="Nuevo producto"
          description="La referencia se crea con existencias en cero."
          onClose={() => setModal(null)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setModal(null)}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                form="form-add-product"
                type="submit"
                disabled={saving}
              >
                {saving ? 'Guardando…' : 'Guardar producto'}
              </button>
            </>
          }
        >
          <form id="form-add-product" onSubmit={handleAddProduct} className="modal-grid">
            <label className="field">
              <span className="field-label">Código</span>
              <input
                className="input"
                value={newProduct.code}
                onChange={(e) => setNewProduct({ ...newProduct, code: e.target.value })}
                placeholder="SKU-001"
              />
            </label>
            <label className="field">
              <span className="field-label">Nombre</span>
              <input
                className="input"
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                placeholder="Nombre del producto"
              />
            </label>
          </form>
        </Modal>
      )}

      {/* --- Registrar movimiento --- */}
      {modal === 'move' && (
        <Modal
          title="Registrar movimiento"
          description="Ajusta las existencias y deja constancia en el historial."
          onClose={closeMove}
          footer={
            <>
              <button className="btn btn-ghost" onClick={closeMove}>
                Cancelar
              </button>
              <button className="btn btn-primary" form="form-move" type="submit" disabled={saving}>
                {saving ? 'Registrando…' : 'Registrar'}
              </button>
            </>
          }
        >
          <form id="form-move" onSubmit={handleMove} style={{ display: 'contents' }}>
            <div className="field">
              <span className="field-label">Tipo de movimiento</span>
              <div className="segmented">
                <button
                  type="button"
                  className={move.type === 'income' ? 'seg-active seg-active-in' : ''}
                  onClick={() => setMove({ ...move, type: 'income' })}
                >
                  <IconArrowDownCircle size={16} />
                  Ingreso
                </button>
                <button
                  type="button"
                  className={move.type === 'expense' ? 'seg-active seg-active-out' : ''}
                  onClick={() => setMove({ ...move, type: 'expense' })}
                >
                  <IconArrowUpCircle size={16} />
                  Salida
                </button>
              </div>
            </div>

            <label className="field">
              <span className="field-label">Producto</span>
              <select
                className="select"
                value={move.productId}
                onChange={(e) => {
                  const next = products.find((p) => String(p.id) === e.target.value)
                  setMove((m) => ({
                    ...m,
                    productId: e.target.value,
                    // En una salida sugerimos el último costo conocido.
                    unitPrice:
                      m.type === 'expense' && !m.unitPrice && next?.last_unit_price
                        ? String(next.last_unit_price)
                        : m.unitPrice,
                  }))
                }}
              >
                <option value="">Selecciona un producto</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.code}
                  </option>
                ))}
              </select>
              {moveProduct && (
                <span className="field-hint">
                  Disponible: {formatNumber(moveProduct.stock)} unidades
                </span>
              )}
            </label>

            <div className="modal-grid">
              <label className="field">
                <span className="field-label">Cantidad</span>
                <input
                  className="input"
                  type="number"
                  min="1"
                  step="1"
                  value={move.quantity}
                  onChange={(e) => setMove({ ...move, quantity: e.target.value })}
                  placeholder="0"
                />
              </label>
              <label className="field">
                <span className="field-label">Precio por unidad</span>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="any"
                  value={move.unitPrice}
                  onChange={(e) => setMove({ ...move, unitPrice: e.target.value })}
                  placeholder="0"
                />
              </label>
            </div>

            <label className="field">
              <span className="field-label">
                Descripción <span className="field-hint">(opcional)</span>
              </span>
              <input
                className="input"
                value={move.description}
                onChange={(e) => setMove({ ...move, description: e.target.value })}
                placeholder="Compra a proveedor, venta mostrador…"
              />
            </label>

            <div className="summary">
              <span className="summary-label">Total del movimiento</span>
              <span className="summary-value">{formatCurrency(moveTotal)}</span>
            </div>
          </form>
        </Modal>
      )}

      {/* --- Confirmar eliminación --- */}
      {confirming && (
        <ConfirmModal
          title="Eliminar producto"
          description={`"${confirming.name}" se eliminará del inventario. Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          onConfirm={handleDelete}
          onClose={() => setConfirming(null)}
        />
      )}
    </div>
  )
}
