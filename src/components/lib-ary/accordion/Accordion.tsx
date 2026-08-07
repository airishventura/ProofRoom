import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import './Accordion.css'

type AccordionContextValue = {
  type: 'single' | 'multiple'
  openValues: Set<string>
  toggle: (value: string) => void
}

const AccordionContext = createContext<AccordionContextValue | null>(null)

function useAccordionContext() {
  const context = useContext(AccordionContext)
  if (!context) {
    throw new Error('Accordion components must be used within <Accordion>')
  }
  return context
}

type ItemContextValue = {
  value: string
  open: boolean
  triggerId: string
  contentId: string
}

const ItemContext = createContext<ItemContextValue | null>(null)

function useItemContext() {
  const context = useContext(ItemContext)
  if (!context) {
    throw new Error('AccordionTrigger/Content must be used within <AccordionItem>')
  }
  return context
}

type AccordionProps = {
  type?: 'single' | 'multiple'
  defaultValue?: string | string[]
  value?: string | string[]
  onValueChange?: (value: string | string[]) => void
  children: ReactNode
  className?: string
  style?: CSSProperties
}

function toSet(value: string | string[] | undefined) {
  if (value === undefined) return new Set<string>()
  return new Set(Array.isArray(value) ? value : [value])
}

function fromSet(set: Set<string>, type: 'single' | 'multiple') {
  const values = [...set]
  return type === 'single' ? (values[0] ?? '') : values
}

export function Accordion({
  type = 'single',
  defaultValue,
  value,
  onValueChange,
  children,
  className = '',
  style,
}: AccordionProps) {
  const [internal, setInternal] = useState(() => toSet(defaultValue))
  const openValues = value !== undefined ? toSet(value) : internal

  const toggle = useCallback(
    (itemValue: string) => {
      const next = new Set(openValues)

      if (type === 'single') {
        if (next.has(itemValue)) next.clear()
        else {
          next.clear()
          next.add(itemValue)
        }
      } else if (next.has(itemValue)) {
        next.delete(itemValue)
      } else {
        next.add(itemValue)
      }

      if (value === undefined) setInternal(next)
      onValueChange?.(fromSet(next, type))
    },
    [onValueChange, openValues, type, value],
  )

  return (
    <AccordionContext.Provider value={{ type, openValues, toggle }}>
      <div className={`lib-accordion${className ? ` ${className}` : ''}`} style={style}>
        {children}
      </div>
    </AccordionContext.Provider>
  )
}

type AccordionItemProps = {
  value: string
  children: ReactNode
  className?: string
}

export function AccordionItem({ value, children, className = '' }: AccordionItemProps) {
  const { openValues } = useAccordionContext()
  const baseId = useId().replace(/:/g, '')
  const open = openValues.has(value)

  return (
    <ItemContext.Provider
      value={{
        value,
        open,
        triggerId: `${baseId}-trigger`,
        contentId: `${baseId}-content`,
      }}
    >
      <div
        className={`lib-accordion__item${open ? ' lib-accordion__item--open' : ''}${className ? ` ${className}` : ''}`}
        data-state={open ? 'open' : 'closed'}
      >
        {children}
      </div>
    </ItemContext.Provider>
  )
}

type AccordionTriggerProps = ButtonHTMLAttributes<HTMLButtonElement>

export function AccordionTrigger({ className = '', children, ...props }: AccordionTriggerProps) {
  const { toggle } = useAccordionContext()
  const { value, open, triggerId, contentId } = useItemContext()

  return (
    <button
      type="button"
      id={triggerId}
      className={`lib-accordion__trigger${className ? ` ${className}` : ''}`}
      aria-expanded={open}
      aria-controls={contentId}
      data-state={open ? 'open' : 'closed'}
      onClick={() => toggle(value)}
      {...props}
    >
      <span className="lib-accordion__title">{children}</span>
      <span className="lib-accordion__chevron" aria-hidden>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </span>
    </button>
  )
}

type AccordionContentProps = HTMLAttributes<HTMLDivElement>

export function AccordionContent({ className = '', children, ...props }: AccordionContentProps) {
  const { open, triggerId, contentId } = useItemContext()
  const innerRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(0)

  useEffect(() => {
    const node = innerRef.current
    if (!node) return

    const measure = () => setHeight(node.scrollHeight)
    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [children, open])

  return (
    <div
      id={contentId}
      role="region"
      aria-labelledby={triggerId}
      aria-hidden={!open}
      className={`lib-accordion__content${className ? ` ${className}` : ''}`}
      data-state={open ? 'open' : 'closed'}
      style={{ height: open ? height : 0 }}
      {...props}
    >
      <div ref={innerRef} className="lib-accordion__content-inner">
        {children}
      </div>
    </div>
  )
}
