"use client"

import { cn } from "@/lib/utils"

// Fruits and vegetables a zone can be marked with.
export const ZONE_ICONS = [
  "🌱", "🍅", "🥕", "🌽", "🥬", "🥦", "🍆", "🌶️",
  "🥔", "🧅", "🥒", "🍠", "🍚", "🍎", "🍌", "🍇",
  "🍊", "🍋", "🍉", "🥭", "🍍", "🥥", "🍓", "🫐",
]

export function IconPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (icon: string) => void
}) {
  return (
    <div role="radiogroup" aria-label="Zone icon" className="grid grid-cols-8 gap-1.5">
      {ZONE_ICONS.map((icon) => (
        <button
          key={icon}
          type="button"
          role="radio"
          aria-checked={value === icon}
          onClick={() => onChange(icon)}
          className={cn(
            "flex aspect-square items-center justify-center rounded-xl border text-xl transition-colors hover:bg-muted",
            value === icon && "border-primary bg-primary/10 ring-2 ring-primary/30"
          )}
        >
          <span aria-hidden>{icon}</span>
          <span className="sr-only">{icon}</span>
        </button>
      ))}
    </div>
  )
}
