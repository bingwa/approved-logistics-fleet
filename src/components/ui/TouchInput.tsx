// src/components/ui/TouchInput.tsx
'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface TouchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
  helpText?: string
}

const TouchInput = React.forwardRef<HTMLInputElement, TouchInputProps>(
  ({ className, type, label, error, icon, helpText, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false)

    return (
      <div className="space-y-1">
        {label && (
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
              {icon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              "flex h-12 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:placeholder:text-slate-400",
              icon && "pl-10",
              isFocused && "ring-2 ring-blue-500 border-transparent",
              error && "border-red-500 focus-visible:ring-red-500",
              className
            )}
            ref={ref}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            {...props}
          />
        </div>
        {helpText && !error && (
          <p className="text-xs text-slate-600 dark:text-slate-400">{helpText}</p>
        )}
        {error && (
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    )
  }
)

TouchInput.displayName = "TouchInput"

export { TouchInput }
