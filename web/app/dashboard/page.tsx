"use client"

import {
  ActivityIcon,
  BellRingIcon,
  DropletsIcon,
  PowerIcon,
  SunIcon,
  ThermometerIcon,
  WifiIcon,
} from "lucide-react"
import Link from "next/link"

import { PageHeader } from "@/components/page-header"
import { StopAllButton } from "@/components/stop-all-button"
import { WeatherTile } from "@/components/weather-tile"
import { ZoneCard } from "@/components/zone-card"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useFarm } from "@/hooks/use-farm"
import { cn } from "@/lib/utils"

export default function OverviewPage() {
  const { views, alerts, loaded, error, unread } = useFarm()

  const online = views.filter((v) => v.online)
  const running = views.filter((v) => v.status === "running" || v.status === "starting")
  const soilValues = online
    .map((v) => v.reading?.soilMoisture)
    .filter((n): n is number => n != null)
  const avgSoil = soilValues.length
    ? soilValues.reduce((a, b) => a + b, 0) / soilValues.length
    : null

  // Zone 1 carries the shared DHT22 and BH1750.
  const climate = views.find((v) => v.reading?.temperature != null) ?? views[0]
  const cr = climate.reading

  return (
    <>
      <PageHeader
        title="Farm overview"
        description="Live readings from your four zones."
        actions={<StopAllButton />}
      />

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          Can&apos;t read the database: {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile
          icon={<PowerIcon className="size-4" />}
          label="Zones on"
          value={`${running.length}/${views.length}`}
        />
        <Tile
          icon={<WifiIcon className="size-4" />}
          label="Nodes online"
          value={`${online.length}/${views.length}`}
        />
        <Tile
          icon={<DropletsIcon className="size-4" />}
          label="Avg soil moisture"
          value={avgSoil != null ? `${avgSoil.toFixed(0)}%` : "--"}
        />
        <Tile
          icon={<BellRingIcon className="size-4" />}
          label="Active alerts"
          value={String(alerts.length)}
          tone={alerts.length > 0 || unread > 0 ? "warn" : "default"}
          href="/dashboard/alerts"
        />
      </div>

      <WeatherTile />

      <Card>
        <CardHeader>
          <CardTitle>Climate</CardTitle>
          <CardDescription>
            Shared sensors on {climate.name}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Climate
            icon={<ThermometerIcon className="size-5" />}
            label="Temperature"
            value={cr?.temperature != null ? `${cr.temperature.toFixed(1)} °C` : "--"}
          />
          <Climate
            icon={<ActivityIcon className="size-5" />}
            label="Humidity"
            value={cr?.humidity != null ? `${cr.humidity.toFixed(0)} %` : "--"}
          />
          <Climate
            icon={<SunIcon className="size-5" />}
            label="Light"
            value={cr?.light != null ? `${Math.round(cr.light)} lx` : "Not fitted"}
          />
        </CardContent>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Zones</h2>
        {!loaded ? (
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
            {views.map((v) => (
              <Skeleton key={v.zone.id} className="h-64 rounded-4xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
            {views.map((v) => (
              <ZoneCard key={v.zone.id} view={v} />
            ))}
          </div>
        )}
      </section>
    </>
  )
}

function Tile({
  icon,
  label,
  value,
  tone = "default",
  href,
}: {
  icon: React.ReactNode
  label: string
  value: string
  tone?: "default" | "warn"
  href?: string
}) {
  const body = (
    <Card
      size="sm"
      className={cn(href && "transition-colors hover:bg-muted/50")}
    >
      <CardContent className="flex flex-col gap-1">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {icon}
          {label}
        </span>
        <span
          className={cn(
            "text-2xl font-semibold tabular-nums",
            tone === "warn" && "text-destructive"
          )}
        >
          {value}
        </span>
      </CardContent>
    </Card>
  )
  return href ? <Link href={href}>{body}</Link> : body
}

function Climate({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-muted/60 p-4">
      <span className="text-muted-foreground">{icon}</span>
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-lg font-semibold tabular-nums">{value}</span>
      </div>
    </div>
  )
}
