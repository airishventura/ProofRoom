import type { CSSProperties, ReactNode } from 'react'
import './Tooltip.css'

type TooltipSide = 'top' | 'bottom' | 'left' | 'right'

type TooltipProps = {
  content: ReactNode
  side?: TooltipSide
  children: ReactNode
  className?: string
  style?: CSSProperties
}

export function Tooltip({
  content,
  side = 'top',
  children,
  className = '',
  style,
}: TooltipProps) {
  return (
    <span className={`lib-tooltip${className ? ` ${className}` : ''}`}>
      <span className="lib-tooltip__trigger">{children}</span>
      <span
        className={`lib-tooltip__bubble lib-tooltip__bubble--${side}`}
        style={style}
        role="tooltip"
      >
        {content}
      </span>
    </span>
  )
}
