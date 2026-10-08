import { DropletsIcon, SunIcon, ThermometerIcon } from "lucide-react"

import { StatusBadge } from "@/components/status-badge"
import { ZoneLabel } from "@/components/zone-label"
import { ZoneToggle } from "@/components/zone-toggle"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { ZoneView } from "@/lib/farm"
import { cn } from "@/lib/utils"

function lastSeen(v: ZoneView) {
  if (v.ageSeconds == null) return "No data yet"
  if (v.ageSeconds < 5) return "Updated just now"
  if (v.ageSeconds < 60) return `Updated ${v.ageSeconds}s ago`
  return `Updated ${Math.round(v.ageSeconds / 60)} min ago`
}

export function ZoneCard({ view }: { view: ZoneView }) {
  const r = view.reading
  const soil = r?.soilMoisture
  const hasClimate =
    r?.temperature != null || r?.humidity != null || r?.light != null

  return (
    <Card className={cn(!view.online && "opacity-80")}>
      <CardHeader>
        <CardTitle>
          <ZoneLabel view={view} />
        </CardTitle>
        <CardDescription className="text-xs">
          {view.config.crop ? `${view.config.crop} · ` : ""}
          <span className="font-mono">{view.zone.nodeId}</span>
        </CardDescription>
        <CardAction>
          <StatusBadge status={view.status} />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <DropletsIcon className="size-4" />
              Soil moisture
            </span>
            <span className="text-2xl font-semibold tabular-nums">
              {soil != null ? `${soil.toFixed(0)}%` : "--"}
            </span>
          </div>
          <Progress value={soil ?? 0} />
        </div>
        {hasClimate && (
          <div className="grid grid-cols-3 gap-2 text-sm">
            <Stat
              icon={<ThermometerIcon className="size-4" />}
              label="Temp"
              value={r?.temperature != null ? `${r.temperature.toFixed(1)}°C` : "--"}
            />
            <Stat
              icon={<DropletsIcon className="size-4" />}
              label="Humidity"
              value={r?.humidity != null ? `${r.humidity.toFixed(0)}%` : "--"}
            />
            <Stat
              icon={<SunIcon className="size-4" />}
              label="Light"
              value={r?.light != null ? `${Math.round(r.light)} lx` : "n/a"}
            />
          </div>
        )}
      </CardContent>
      <CardFooter className="justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          {view.config.mode === "auto" ? "Automatic · " : ""}
          {lastSeen(view)}
        </span>
        <ZoneToggle view={view} />
      </CardFooter>
    </Card>
  )
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl bg-muted/60 px-3 py-2">
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  )
}
