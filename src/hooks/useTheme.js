import { useEffect, useState } from 'react'

const STORAGE_KEY = 'inventario:theme'

function readStored() {
  // En modo privado o con el almacenamiento bloqueado esto puede lanzar.
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'light' || v === 'dark' ? v : null
  } catch {
    return null
  }
}

function systemTheme() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Tema claro/oscuro: arranca con la preferencia del sistema y se puede fijar a mano. */
export function useTheme() {
  const [theme, setTheme] = useState(() => readStored() ?? systemTheme())

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // Sin persistencia el tema sigue funcionando durante la sesión.
    }
  }, [theme])

  return [theme, () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))]
}
