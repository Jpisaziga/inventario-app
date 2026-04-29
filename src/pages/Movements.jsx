import { useEffect, useState } from 'react'
import { supabase } from '../services/supabaseClient'

export default function Movements() {
  const [movements, setMovements] = useState([])
  const [filtered, setFiltered] = useState([])

  const [search, setSearch] = useState('')
  const [order, setOrder] = useState('desc')
  const [selectedDate, setSelectedDate] = useState('')

  const load = async () => {
    const { data } = await supabase
      .from('movements')
      .select('*')

    setMovements(data || [])
    setFiltered(data || [])
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    let result = [...movements]

    // 🔍 búsqueda
    result = result.filter(m =>
      m.product_name.toLowerCase().includes(search.toLowerCase()) ||
      m.product_code.toLowerCase().includes(search.toLowerCase())
    )

    // 📅 filtro por fecha (ajustado a Colombia)
    if (selectedDate) {
      result = result.filter(m => {
        const d = new Date(m.created_at)
        d.setHours(d.getHours() - 5)

        const localDate =
          d.getFullYear() +
          '-' +
          String(d.getMonth() + 1).padStart(2, '0') +
          '-' +
          String(d.getDate()).padStart(2, '0')

        return localDate === selectedDate
      })
    }

    // ⬆️⬇️ ordenar
    result.sort((a, b) => {
      if (order === 'desc') {
        return new Date(b.created_at) - new Date(a.created_at)
      } else {
        return new Date(a.created_at) - new Date(b.created_at)
      }
    })

    setFiltered(result)
  }, [search, movements, order, selectedDate])

  return (
    <div style={{ padding: '20px' }}>
      <h1>Movimientos</h1>

      {/* 🔝 CONTROLES */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        
        <input
          placeholder="Buscar producto o código"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />

        <button onClick={() =>
          setOrder(order === 'desc' ? 'asc' : 'desc')
        }>
          {order === 'desc'
            ? 'Más recientes ↓'
            : 'Más antiguos ↑'}
        </button>

        {selectedDate && (
          <button onClick={() => setSelectedDate('')}>
            Limpiar fecha
          </button>
        )}
      </div>

      <br />

      {/* 📊 TABLA */}
      <table border="1" cellPadding="8">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Código</th>
            <th>Producto</th>
            <th>Tipo</th>
            <th>Cantidad</th>
            <th>Precio</th>
            <th>Total</th>
          </tr>
        </thead>

        <tbody>
          {filtered.map(m => {
            const d = new Date(m.created_at)
            d.setHours(d.getHours() - 5)

            return (
              <tr key={m.id}>
                <td>
                  {d.toLocaleString('es-CO', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}
                </td>
                <td>{m.product_code}</td>
                <td>{m.product_name}</td>
                <td>{m.type === 'income' ? 'Ingreso' : 'Salida'}</td>
                <td>{m.quantity}</td>
                <td>${m.unit_price}</td>
                <td>${m.total}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}