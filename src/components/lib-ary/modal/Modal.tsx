import { useCallback, useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import './Modal.css'

type ModalProps = {
  open?: boolean
  defaultOpen?: boolean
  onClose?: () => void
  title?: string
  children?: ReactNode
  closeOnBackdrop?: boolean
  className?: string
  style?: CSSProperties
}

function CloseIcon() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}

export function Modal({
  open,
  defaultOpen = false,
  onClose,
  title,
  children,
  closeOnBackdrop = true,
  className = '',
  style,
}: ModalProps) {
  const titleId = useId()
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const [mounted, setMounted] = useState(defaultOpen)
  const [visible, setVisible] = useState(false)
  const isOpen = open ?? internalOpen

  const close = useCallback(() => {
    if (open === undefined) setInternalOpen(false)
    onClose?.()
  }, [open, onClose])

  useEffect(() => {
    if (isOpen) {
      setMounted(true)
      setVisible(false)
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true))
      })
      return () => cancelAnimationFrame(frame)
    }

    setVisible(false)
    const timer = window.setTimeout(() => setMounted(false), 320)
    return () => window.clearTimeout(timer)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen, close])

  if (!mounted) return null

  return createPortal(
    <div className={`lib-modal${className ? ` ${className}` : ''}`}>
      <button
        type="button"
        className={`lib-modal__backdrop${visible ? ' lib-modal__backdrop--visible' : ''}`}
        aria-label="Close modal"
        onClick={closeOnBackdrop ? close : undefined}
      />
      <div
        className="lib-modal__container"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className={`lib-modal__panel${visible ? ' lib-modal__panel--visible' : ''}`}
          style={style}
        >
          <div className="lib-modal__header">
            {title ? (
              <h2 id={titleId} className="lib-modal__title">
                {title}
              </h2>
            ) : (
              <span />
            )}
            <button type="button" className="lib-modal__close" aria-label="Close" onClick={close}>
              <CloseIcon />
            </button>
          </div>
          <div className="lib-modal__body">{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
