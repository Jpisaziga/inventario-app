import { useEffect, useState } from 'react'
import { supabase } from '../services/supabaseClient'

export default function Inventory() {
  const [products, setProducts] = useState([])
  const [movements, setMovements] = useState([])
  const [filtered, setFiltered] = useState([])

  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')

  const [mode, setMode] = useState('view')

  // producto
  const [code, setCode] = useState('')
  const [name, setName] = useState('')

  // movimiento
  const [type, setType] = useState('income')
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [description, setDescription] = useState('')

  const loadData = async () => {
    const { data: p } = await supabase.from('products').select('*')
    const { data: m } = await supabase.from('movements').select('*')

    setProducts(p || [])
    setMovements(m || [])
    setFiltered(p || [])
  }

  useEffect(() => {
    loadData()
  }, [])

  // 🔍 filtro + orden
  useEffect(() => {
    let result = [...products]

    result = result.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase())
    )

    result.sort((a, b) => {
      if (sortOrder === 'asc') {
        return a[sortField] > b[sortField] ? 1 : -1
      } else {
        return a[sortField] < b[sortField] ? 1 : -1
      }
    })

    setFiltered(result)
  }, [search, sortField, sortOrder, products])

  // ➕ crear producto
  const handleAddProduct = async () => {
    if (!code || !name) return alert('Completa los campos')

    await supabase.from('products').insert([
      {
        code,
        name,
        stock: 0,
        last_unit_price: 0
      }
    ])

    setCode('')
    setName('')
    setMode('view')
    loadData()
  }

  // 🔁 movimiento kardex
  const handleMove = async () => {
    if (!productId || !quantity || !unitPrice) {
      return alert('Completa los campos')
    }

    const product = products.find(p => p.id === productId)

    const total = Number(quantity) * Number(unitPrice)

    let newStock =
      type === 'income'
        ? product.stock + Number(quantity)
        : product.stock - Number(quantity)

    if (newStock < 0) return alert('Stock insuficiente')

    // 👇 actualizar producto
    const updateData = {
      stock: newStock
    }

    if (type === 'income') {
      updateData.last_unit_price = Number(unitPrice)
    }

    await supabase
      .from('products')
      .update(updateData)
      .eq('id', productId)

    // guardar movimiento
    await supabase.from('movements').insert([
      {
        product_id: productId,
        product_name: product.name,
        product_code: product.code,
        type,
        quantity: Number(quantity),
        unit_price: Number(unitPrice),
        total,
        description
      }
    ])

    setMode('view')
    setQuantity('')
    setUnitPrice('')
    setDescription('')
    loadData()
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Inventario</h1>

      {/* 🔝 BOTONES */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={() => setMode('move')}>
          Registrar movimiento
        </button>

        <button onClick={() => setMode('add')}>
          Agregar producto
        </button>
      </div>

      <br />

      {/* 🔍 FILTROS */}
      <div>
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

      <br />

      {/* 📊 TABLA */}
      <table border="1" cellPadding="8">
        <thead>
          <tr>
            <th>Código</th>
            <th>Nombre</th>
            <th>Cantidad</th>
            <th>Último precio unidad</th>
          </tr>
        </thead>

        <tbody>
          {filtered.map(p => (
            <tr key={p.id}>
              <td>{p.code}</td>
              <td>{p.name}</td>
              <td>{p.stock}</td>
              <td>${p.last_unit_price || 0}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ➕ FORM PRODUCTO */}
      {mode === 'add' && (
        <div>
          <h3>Nuevo producto</h3>

          <input
            placeholder="Código"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />

          <input
            placeholder="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <button onClick={handleAddProduct}>Guardar</button>
          <button onClick={() => setMode('view')}>Cancelar</button>
        </div>
      )}

      {/* 🔁 MOVIMIENTO */}
      {mode === 'move' && (
        <div>
          <h3>Registrar movimiento</h3>

          <select onChange={(e) => setType(e.target.value)}>
            <option value="income">Ingreso</option>
            <option value="expense">Salida</option>
          </select>

          <select onChange={(e) => setProductId(e.target.value)}>
            <option value="">Producto</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <input
            type="number"
            placeholder="Cantidad"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />

          <input
            type="number"
            placeholder="Precio unidad"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
          />

          <input
            placeholder="Descripción"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <button onClick={handleMove}>Guardar</button>
          <button onClick={() => setMode('view')}>Cancelar</button>
        </div>
      )}
    </div>
  )
}