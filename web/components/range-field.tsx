"use client"

import * as React from "react"

export function RangeField({
  label,
  hint,
  unit,
  min,
  max,
  value,
  onChange,
  disabled,
}: {
  label: string
  hint?: string
  unit: string
  min: number
  max: number
  value: number
  onChange: (v: number) => void
  disabled?: boolean
}) {
  const id = React.useId()
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <span className="text-lg font-semibold tabular-nums">
          {value}
          {unit}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-50"
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
