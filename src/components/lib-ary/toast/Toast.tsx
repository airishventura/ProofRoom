import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import './Toast.css'

export type ToastItem = {
  id: string
  message: string
}

type ToastProps = {
  id: string
  message: string
  duration?: number
  onDismiss: (id: string) => void
}

type ToastViewportProps = {
  children: ReactNode
  inline?: boolean
  className?: string
  style?: CSSProperties
}

export function Toast({ id, message, duration = 4000, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(false)
  const [exiting, setExiting] = useState(false)

  const dismiss = useCallback(() => {
    setExiting(true)
    window.setTimeout(() => onDismiss(id), 300)
  }, [id, onDismiss])

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true))
    const timer = window.setTimeout(dismiss, duration)
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(timer)
    }
  }, [duration, dismiss])

  return (
    <div
      className={`lib-toast${visible && !exiting ? ' lib-toast--visible' : ''}${exiting ? ' lib-toast--exiting' : ''}`}
      role="status"
      aria-live="polite"
    >
      <span className="lib-toast__message">{message}</span>
      <button type="button" className="lib-toast__close" aria-label="Dismiss" onClick={dismiss}>
        ×
      </button>
    </div>
  )
}

export function ToastViewport({
  children,
  inline = false,
  className = '',
  style,
}: ToastViewportProps) {
  return (
    <div
      className={`lib-toast-viewport${inline ? ' lib-toast-viewport--inline' : ''}${className ? ` ${className}` : ''}`}
      style={style}
    >
      {children}
    </div>
  )
}

export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const add = useCallback((message: string) => {
    setToasts((current) => [...current, { id: crypto.randomUUID(), message }])
  }, [])

  const remove = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  return { toasts, add, remove }
}
