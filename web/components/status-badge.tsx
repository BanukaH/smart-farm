import { Badge } from "@/components/ui/badge"
import { STATUS_LABEL, type ZoneStatus } from "@/lib/farm"
import { cn } from "@/lib/utils"

const STYLE: Record<ZoneStatus, string> = {
  running: "bg-primary/15 text-primary",
  starting: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  stopping: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  off: "bg-muted text-muted-foreground",
  offline: "bg-destructive/10 text-destructive",
  fault: "bg-destructive/10 text-destructive",
}

const DOT: Record<ZoneStatus, string> = {
  running: "bg-primary",
  starting: "bg-amber-500 animate-pulse",
  stopping: "bg-amber-500 animate-pulse",
  off: "bg-muted-foreground/60",
  offline: "bg-destructive",
  fault: "bg-destructive",
}

export function StatusBadge({
  status,
  className,
}: {
  status: ZoneStatus
  className?: string
}) {
  return (
    <Badge variant="secondary" className={cn(STYLE[status], className)}>
      <span className={cn("size-1.5 rounded-full", DOT[status])} />
      {STATUS_LABEL[status]}
    </Badge>
  )
}
