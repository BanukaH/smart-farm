import { SproutIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export function Brand({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2 font-semibold", className)}>
      <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <SproutIcon className="size-4" />
      </span>
      Smart Farm
    </span>
  )
}
