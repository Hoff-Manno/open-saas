"use client"

import * as React from "react"
import { Tab } from "@headlessui/react"
import { cn } from "../../lib/utils"

interface TabsProps {
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  className?: string
  children: React.ReactNode
}

interface TabsContextType {
  value?: string
  onValueChange?: (value: string) => void
}

const TabsContext = React.createContext<TabsContextType>({})

const Tabs: React.FC<TabsProps> = ({ defaultValue, value, onValueChange, className, children }) => {
  const [selectedIndex, setSelectedIndex] = React.useState(() => {
    if (value || defaultValue) {
      const tabs = React.Children.toArray(children).find(
        (child) => React.isValidElement(child) && child.type === TabsList
      )
      if (tabs && React.isValidElement(tabs)) {
        const triggers = React.Children.toArray(tabs.props.children).filter(
          (child) => React.isValidElement(child) && child.type === TabsTrigger
        )
        const targetValue = value || defaultValue
        const index = triggers.findIndex(
          (trigger) => React.isValidElement(trigger) && trigger.props.value === targetValue
        )
        return index >= 0 ? index : 0
      }
    }
    return 0
  })

  const handleChange = (index: number) => {
    setSelectedIndex(index)
    if (onValueChange) {
      const tabs = React.Children.toArray(children).find(
        (child) => React.isValidElement(child) && child.type === TabsList
      )
      if (tabs && React.isValidElement(tabs)) {
        const triggers = React.Children.toArray(tabs.props.children).filter(
          (child) => React.isValidElement(child) && child.type === TabsTrigger
        )
        const trigger = triggers[index]
        if (React.isValidElement(trigger) && trigger.props.value) {
          onValueChange(trigger.props.value)
        }
      }
    }
  }

  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <Tab.Group selectedIndex={selectedIndex} onChange={handleChange}>
        <div className={className}>{children}</div>
      </Tab.Group>
    </TabsContext.Provider>
  )
}

const TabsList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <Tab.List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  >
    {children}
  </Tab.List>
))
TabsList.displayName = "TabsList"

interface TabsTriggerProps extends React.HTMLAttributes<HTMLButtonElement> {
  value: string
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, children, value, ...props }, ref) => (
    <Tab
      ref={ref}
      className={({ selected }) =>
        cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          selected
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
          className
        )
      }
      {...props}
    >
      {children}
    </Tab>
  )
)
TabsTrigger.displayName = "TabsTrigger"

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, children, value, ...props }, ref) => (
    <Tab.Panel
      ref={ref}
      className={cn(
        "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      {...props}
    >
      {children}
    </Tab.Panel>
  )
)
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }
