import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import './Dropdown.css'

export type DropdownOption = {
  value: string
  label: string
  icon?: ReactNode
}

type DropdownProps = {
  options: DropdownOption[]
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  style?: CSSProperties
}

function ChevronIcon({ open }: { open: boolean }) {
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
      className={`lib-dropdown__chevron${open ? ' lib-dropdown__chevron--open' : ''}`}
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

function OptionContent({ icon, label }: { icon?: ReactNode; label: string }) {
  return (
    <span className="lib-dropdown__content">
      {icon && <span className="lib-dropdown__icon">{icon}</span>}
      <span className="lib-dropdown__text">{label}</span>
    </span>
  )
}

export function Dropdown({
  options,
  value,
  defaultValue,
  onChange,
  placeholder = 'Select option',
  className = '',
  style,
}: DropdownProps) {
  const [open, setOpen] = useState(false)
  const [internalValue, setInternalValue] = useState(defaultValue ?? '')
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  const selectedValue = value ?? internalValue
  const selected = options.find((option) => option.value === selectedValue)

  const select = (next: string) => {
    if (value === undefined) setInternalValue(next)
    onChange?.(next)
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className={`lib-dropdown ${className}`.trim()} ref={rootRef} style={style}>
      <button
        type="button"
        className={`lib-dropdown__trigger${open ? ' lib-dropdown__trigger--open' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((prev) => !prev)}
      >
        {selected ? (
          <OptionContent icon={selected.icon} label={selected.label} />
        ) : (
          <span className="lib-dropdown__content">
            <span className="lib-dropdown__text lib-dropdown__text--placeholder">{placeholder}</span>
          </span>
        )}
        <ChevronIcon open={open} />
      </button>

      <div
        id={listId}
        role="listbox"
        className={`lib-dropdown__menu${open ? ' lib-dropdown__menu--open' : ''}`}
      >
        {options.map((option) => {
          const isSelected = option.value === selectedValue
          return (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={isSelected}
              className={`lib-dropdown__item${isSelected ? ' lib-dropdown__item--selected' : ''}`}
              onClick={() => select(option.value)}
            >
              <OptionContent icon={option.icon} label={option.label} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
