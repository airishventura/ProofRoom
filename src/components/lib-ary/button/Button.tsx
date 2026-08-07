import { useState, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react'
import './Button.css'

function ThumbsUpIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M7 10v12" />
      <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
    </svg>
  )
}

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'style'> & {
  children?: ReactNode
  className?: string
  style?: CSSProperties
  /** Visual variant — icon = square-ish control for toolbars */
  variant?: 'default' | 'primary' | 'ghost' | 'icon'
}

/**
 * LibAry Button (project-owned). Default demo is Like + thumbs-up when no children.
 * Pass `children` for real app actions (Upload, Send, etc.).
 */
export function Button({
  onClick,
  className = '',
  style,
  children,
  disabled,
  type = 'button',
  variant = 'default',
  ...rest
}: ButtonProps) {
  const [pressed, setPressed] = useState(false)
  const isDemo = children === undefined

  return (
    <button
      type={type}
      disabled={disabled}
      className={`lib-button${pressed ? ' lib-button--pressed' : ''}${variant !== 'default' ? ` lib-button--${variant}` : ''}${className ? ` ${className}` : ''}`}
      style={style}
      onPointerDown={() => !disabled && setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onClick={onClick}
      {...rest}
    >
      {isDemo ? (
        <>
          <ThumbsUpIcon />
          <span>Like</span>
        </>
      ) : (
        children
      )}
    </button>
  )
}
