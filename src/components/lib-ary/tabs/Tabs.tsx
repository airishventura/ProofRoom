import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import './Tabs.css'

type TabsContextValue = {
  value: string
  setValue: (value: string) => void
}

const TabsContext = createContext<TabsContextValue | null>(null)

function useTabsContext() {
  const context = useContext(TabsContext)
  if (!context) {
    throw new Error('Tabs components must be used within <Tabs>')
  }
  return context
}

type TabsProps = {
  defaultValue: string
  children: ReactNode
  className?: string
  style?: CSSProperties
}

export function Tabs({ defaultValue, children, className = '', style }: TabsProps) {
  const [value, setValue] = useState(defaultValue)

  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div className={`lib-tabs ${className}`.trim()} style={style}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

type TabsListProps = HTMLAttributes<HTMLDivElement>

export function TabsList({ className = '', children, ...props }: TabsListProps) {
  const { value } = useTabsContext()
  const listRef = useRef<HTMLDivElement>(null)
  const [indicator, setIndicator] = useState({ x: 0, width: 0 })

  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return

    const activeTab = list.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')
    if (!activeTab) return

    setIndicator({
      x: activeTab.offsetLeft,
      width: activeTab.offsetWidth,
    })
  }, [value, children])

  return (
    <div ref={listRef} role="tablist" className={`lib-tabs__list ${className}`.trim()} {...props}>
      <div
        className="lib-tabs__indicator"
        style={{
          width: indicator.width,
          transform: `translateX(${indicator.x}px)`,
        }}
      />
      {children}
    </div>
  )
}

type TabProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  value: string
}

export function Tab({ value, className = '', children, ...props }: TabProps) {
  const { value: activeValue, setValue } = useTabsContext()
  const isActive = activeValue === value

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      className={`lib-tabs__tab${isActive ? ' lib-tabs__tab--active' : ''}${className ? ` ${className}` : ''}`}
      onClick={() => setValue(value)}
      {...props}
    >
      {children}
    </button>
  )
}

type TabsPanelProps = HTMLAttributes<HTMLDivElement> & {
  value: string
}

export function TabsPanel({ value, className = '', children, ...props }: TabsPanelProps) {
  const { value: activeValue } = useTabsContext()

  if (activeValue !== value) return null

  return (
    <div role="tabpanel" className={`lib-tabs__panel ${className}`.trim()} {...props}>
      {children}
    </div>
  )
}

TabsPanel.displayName = 'TabsPanel'

type TabsPanelsProps = HTMLAttributes<HTMLDivElement>

export function TabsPanels({ className = '', children, ...props }: TabsPanelsProps) {
  return (
    <div className={`lib-tabs__panels ${className}`.trim()} {...props}>
      {Children.map(children, (child) => {
        if (!isValidElement(child) || child.type !== TabsPanel) return child
        return child
      })}
    </div>
  )
}
