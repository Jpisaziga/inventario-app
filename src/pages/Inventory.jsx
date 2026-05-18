import { useEffect, useState } from 'react'
import { supabase } from '../services/supabaseClient'

export default function Inventory() {
  const [products, setProducts] = useState([])
  const [filtered, setFiltered] = useState([])

  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')

  const [modal, setModal] = useState(null) // 'add' | 'move' | null

  const [code, setCode] = useState('')
  const [name, setName] = useState('')

  const [editingId, setEditingId] = useState(null)
  const [editCode, setEditCode] = useState('')
  const [editName, setEditName] = useState('')

  const [editMode, setEditMode] = useState(false)

  const [type, setType] = useState('income')
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [description, setDescription] = useState('')

  const loadData = async () => {
    const { data: p } = await supabase.from('products').select('*')
    setProducts(p || [])
    setFiltered(p || [])
  }

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    let result = [...products]
    result = result.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase())
    )
    result.sort((a, b) => {
      if (sortOrder === 'asc') return a[sortField] > b[sortField] ? 1 : -1
      else return a[sortField] < b[sortField] ? 1 : -1
    })
    setFiltered(result)
  }, [search, sortField, sortOrder, products])

  const handleAddProduct = async () => {
    if (!code || !name) return alert('Completa los campos')
    await supabase.from('products').insert([{ code, name, stock: 0, last_unit_price: 0 }])
    setCode(''); setName(''); setModal(null); loadData()
  }

  const handleStartEdit = (product) => {
    setEditingId(product.id)
    setEditCode(product.code)
    setEditName(product.name)
  }

  const handleSaveEdit = async (id) => {
    if (!editCode || !editName) return alert('Completa los campos')
    await supabase.from('products').update({ code: editCode, name: editName }).eq('id', id)
    setEditingId(null); loadData()
  }

  const handleCancelEdit = () => setEditingId(null)

  const handleDelete = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar este producto?')) return
    await supabase.from('products').delete().eq('id', id)
    loadData()
  }

  const handleMove = async () => {
    if (!productId || !quantity || !unitPrice) return alert('Completa los campos')
    const product = products.find(p => p.id === productId)
    const total = Number(quantity) * Number(unitPrice)
    let newStock = type === 'income'
      ? product.stock + Number(quantity)
      : product.stock - Number(quantity)
    if (newStock < 0) return alert('Stock insuficiente')
    const updateData = { stock: newStock }
    if (type === 'income') updateData.last_unit_price = Number(unitPrice)
    await supabase.from('products').update(updateData).eq('id', productId)
    await supabase.from('movements').insert([{
      product_id: productId,
      product_name: product.name,
      product_code: product.code,
      type,
      quantity: Number(quantity),
      unit_price: Number(unitPrice),
      total,
      description
    }])
    setModal(null); setQuantity(''); setUnitPrice(''); setDescription(''); loadData()
  }

  return (
    <div>
      <h1>Inventario</h1>

      <div className="page-controls">
        <input
          placeholder="Buscar nombre o código"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select onChange={(e) => setSortField(e.target.value)}>
          <option value="name">Nombre</option>
          <option value="code">Código</option>
          <option value="stock">Cantidad</option>
          <option value="last_unit_price">Último precio</option>
        </select>
        <select onChange={(e) => setSortOrder(e.target.value)}>
          <option value="asc">Ascendente</option>
          <option value="desc">Descendente</option>
        </select>
      </div>

      <div className="table-wrapper">
        <table className="page-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Cantidad</th>
              <th>Último precio unidad</th>
              {editMode && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id}>
                {editMode && editingId === p.id ? (
                  <>
                    <td><input value={editCode} onChange={(e) => setEditCode(e.target.value)} className="edit-input" /></td>
                    <td><input value={editName} onChange={(e) => setEditName(e.target.value)} className="edit-input" /></td>
                    <td>{p.stock}</td>
                    <td>${p.last_unit_price || 0}</td>
                    <td>
                      <button className="btn-save" onClick={() => handleSaveEdit(p.id)} title="Guardar">💾</button>
                      <button className="btn-cancel" onClick={handleCancelEdit} title="Cancelar">✖</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td>{p.code}</td>
                    <td>{p.name}</td>
                    <td>{p.stock}</td>
                    <td>${p.last_unit_price || 0}</td>
                    {editMode && (
                      <td>
                        <button className="btn-pencil" onClick={() => handleStartEdit(p)}>✏️</button>
                        <button className="btn-trash" onClick={() => handleDelete(p.id)}>🗑️</button>
                      </td>
                    )}
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* BOTONES DEBAJO */}
      <div className="bottom-bar">
        <button className="btn-move" onClick={() => setModal('move')}>📦 Registrar movimiento</button>
        <button className="btn-edit-mode" onClick={() => { setEditMode(!editMode); setEditingId(null) }}>
          {editMode ? '✖ Salir modo editar' : '✏️ Editar'}
        </button>
        <button className="btn-add" onClick={() => setModal('add')}>➕ Agregar producto</button>
      </div>

      {/* MODAL AGREGAR */}
      {modal === 'add' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Nuevo producto</h3>
            <input placeholder="Código" value={code} onChange={(e) => setCode(e.target.value)} />
            <input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
            <div className="modal-actions">
              <button className="btn-add" onClick={handleAddProduct}>Guardar</button>
              <button onClick={() => setModal(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MOVIMIENTO */}
      {modal === 'move' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Registrar movimiento</h3>
            <select onChange={(e) => setType(e.target.value)}>
              <option value="income">Ingreso</option>
              <option value="expense">Salida</option>
            </select>
            <select onChange={(e) => setProductId(e.target.value)}>
              <option value="">Selecciona un producto</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <input type="number" placeholder="Cantidad" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            <input type="number" placeholder="Precio unidad" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
            <input placeholder="Descripción (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} />
            <div className="modal-actions">
              <button className="btn-add" onClick={handleMove}>Guardar</button>
              <button onClick={() => setModal(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}