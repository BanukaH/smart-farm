"use client"

import Link from "next/link"
import { DropletsIcon, MapPinIcon } from "lucide-react"

import { WeatherIcon } from "@/components/weather-icon"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useWeather } from "@/hooks/use-weather"
import { describeCode, irrigationAdvice } from "@/lib/weather"

// Compact weather summary for the overview; links to the full page.
export function WeatherTile() {
  const { place, weather, loading, error } = useWeather()

  if (loading) return <Skeleton className="h-28 rounded-4xl" />
  if (error || !weather) return null

  const c = weather.current
  const today = weather.daily[0]
  const advice = irrigationAdvice(weather)

  return (
    <Link href="/dashboard/weather" className="block">
      <Card className="transition-colors hover:bg-muted/50">
        <CardContent className="flex items-center gap-4">
          <WeatherIcon code={c.code} isDay={c.isDay} className="size-12 shrink-0 text-primary" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold tabular-nums">{Math.round(c.temp)}°C</span>
              <span className="truncate text-sm text-muted-foreground">{describeCode(c.code).label}</span>
            </div>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPinIcon className="size-3" />
              <span className="truncate">{place.name}</span>
              <DropletsIcon className="ml-2 size-3" />
              {Math.round(today.rainChance)}% rain
            </span>
            <span className="truncate text-sm">{advice.text}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
