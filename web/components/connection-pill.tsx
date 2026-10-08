"use client"

import { useFarm } from "@/hooks/use-farm"
import { cn } from "@/lib/utils"

export function ConnectionPill() {
  const { connected, error } = useFarm()
  const state = error ? "error" : connected ? "live" : "connecting"
  const label = { error: "No access", live: "Live", connecting: "Connecting" }[
    state
  ]

  return (
    <span
      title={error ?? undefined}
      className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium"
    >
      <span
        className={cn(
          "size-2 rounded-full",
          state === "live" && "bg-primary",
          state === "connecting" && "animate-pulse bg-amber-500",
          state === "error" && "bg-destructive"
        )}
      />
      {label}
    </span>
  )
}
