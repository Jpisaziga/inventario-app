import { useCallback, useEffect, useState } from 'react'
import { ToastContext } from '../hooks/useToast'
import { IconCheckCircle, IconAlert, IconInfo } from './Icons'

const ICONS = {
  success: IconCheckCircle,
  error: IconAlert,
  info: IconInfo,
}

function Toast({ toast, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3400)
    return () => clearTimeout(t)
  }, [onDone])

  const Icon = ICONS[toast.type] ?? IconInfo

  return (
    <div className={`toast toast-${toast.type}`} role="status">
      <span className="toast-icon">
        <Icon size={17} />
      </span>
      <span className="toast-msg">{toast.message}</span>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // Identidad estable: los consumidores no se vuelven a renderizar por esto.
  const [api] = useState(() => {
    const push = (type, message) =>
      setToasts((prev) => [...prev, { id: crypto.randomUUID(), type, message }])

    return {
      success: (m) => push('success', m),
      error: (m) => push('error', m),
      info: (m) => push('info', m),
    }
  })

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onDone={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
