import { useEffect, useState } from 'react'

/**
 * Estado que sobrevive a la recarga. El almacenamiento puede estar
 * bloqueado (ventana privada, permisos), así que cada acceso va
 * protegido y la app sigue funcionando sin persistencia.
 */
export function useStoredState(key, initial, parse = (v) => v) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw === null ? initial : parse(raw)
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, String(value))
    } catch {
      // Sin persistencia el valor sigue vivo durante la sesión.
    }
  }, [key, value])

  return [value, setValue]
}
