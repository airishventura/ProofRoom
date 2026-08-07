import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'
import './Card.css'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children?: ReactNode
  className?: string
  style?: CSSProperties
}

export function Card({ children, className = '', style, ...props }: CardProps) {
  return (
    <div className={`lib-card${className ? ` ${className}` : ''}`} style={style} {...props}>
      {children}
    </div>
  )
}

type CardSectionProps = HTMLAttributes<HTMLDivElement> & {
  children?: ReactNode
  className?: string
}

export function CardHeader({ children, className = '', ...props }: CardSectionProps) {
  return (
    <div className={`lib-card__header${className ? ` ${className}` : ''}`} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className = '', ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={`lib-card__title${className ? ` ${className}` : ''}`} {...props}>
      {children}
    </h3>
  )
}

export function CardDescription({
  children,
  className = '',
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={`lib-card__description${className ? ` ${className}` : ''}`} {...props}>
      {children}
    </p>
  )
}

export function CardContent({ children, className = '', ...props }: CardSectionProps) {
  return (
    <div className={`lib-card__content${className ? ` ${className}` : ''}`} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({ children, className = '', ...props }: CardSectionProps) {
  return (
    <div className={`lib-card__footer${className ? ` ${className}` : ''}`} {...props}>
      {children}
    </div>
  )
}
