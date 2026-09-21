import { useEffect, useRef } from 'react'
import { IconX, IconAlert } from './Icons'

/**
 * Diálogo modal: cierra con Esc o clic en el fondo, bloquea el scroll
 * de la página y deja el foco en el primer control al abrirse.
 */
export default function Modal({ title, description, onClose, footer, children }) {
  const bodyRef = useRef(null)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    bodyRef.current?.querySelector('input, select, textarea, button')?.focus()

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="modal-head">
          <div className="modal-head-text">
            <div className="modal-title">{title}</div>
            {description && <p className="modal-desc">{description}</p>}
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Cerrar">
            <IconX size={17} />
          </button>
        </header>

        <div className="modal-body" ref={bodyRef}>
          {children}
        </div>

        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>
  )
}

/** Confirmación destructiva, con el mismo lenguaje visual que Modal. */
export function ConfirmModal({ title, description, confirmLabel, onConfirm, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div
        className="modal"
        style={{ maxWidth: 420 }}
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="modal-head">
          <div className="modal-icon">
            <IconAlert size={19} />
          </div>
          <div className="modal-head-text">
            <div className="modal-title">{title}</div>
            {description && <p className="modal-desc">{description}</p>}
          </div>
        </header>

        <footer className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-danger" onClick={onConfirm} autoFocus>
            {confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  )
}
