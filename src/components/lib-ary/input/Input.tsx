import type { CSSProperties, InputHTMLAttributes } from 'react'
import './Input.css'

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'style'> & {
  className?: string
  style?: CSSProperties
}

export function Input({ className = '', style, ...props }: InputProps) {
  return <input className={`lib-input${className ? ` ${className}` : ''}`} style={style} {...props} />
}
