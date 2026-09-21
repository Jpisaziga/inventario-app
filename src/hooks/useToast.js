import { createContext, useContext } from 'react'

export const ToastContext = createContext({
  success: () => {},
  error: () => {},
  info: () => {},
})

/** Avisos de la app: const toast = useToast(); toast.success('Guardado') */
export function useToast() {
  return useContext(ToastContext)
}
