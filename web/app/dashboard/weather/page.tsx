"use client"

import * as React from "react"
import {
  DropletsIcon,
  EyeIcon,
  GaugeIcon,
  LocateFixedIcon,
  MapPinIcon,
  SearchIcon,
  UmbrellaIcon,
  WindIcon,
} from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { WeatherIcon } from "@/components/weather-icon"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useWeather } from "@/hooks/use-weather"
import {
  dayName,
  describeCode,
  irrigationAdvice,
  searchPlaces,
  type GeoResult,
} from "@/lib/weather"
import { cn } from "@/lib/utils"

export default function WeatherPage() {
  const { place, weather, loading, error, setPlace } = useWeather()
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<GeoResult[] | null>(null)
  const [searching, setSearching] = React.useState(false)
  const [searchError, setSearchError] = React.useState<string | null>(null)

  async function onSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    setSearching(true)
    setSearchError(null)
    try {
      const found = await searchPlaces(q)
      setResults(found)
      if (found.length === 0) setSearchError(`No place found for "${q}".`)
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Search failed")
    } finally {
      setSearching(false)
    }
  }

  function pick(p: GeoResult) {
    setPlace({ name: p.name, lat: p.lat, lon: p.lon })
    setResults(null)
    setQuery("")
  }

  function locate() {
    if (!("geolocation" in navigator)) {
      setSearchError("Location isn't available on this device.")
      return
    }
    setSearchError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setPlace({
          name: "My location",
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        }),
      () => setSearchError("Location permission denied. Search for a city instead."),
      { timeout: 10_000 }
    )
  }

  const c = weather?.current
  const cond = c ? describeCode(c.code) : null
  const advice = weather ? irrigationAdvice(weather) : null

  return (
    <>
      <PageHeader title="Weather" description="Current conditions and a 5-day forecast for your farm." />

      <form onSubmit={onSearch} className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search any city..."
            aria-label="Search city"
            className="pl-9"
          />
        </div>
        <Button type="submit" disabled={searching || !query.trim()}>
          Search
        </Button>
        <Button type="button" variant="outline" size="icon" onClick={locate} aria-label="Use my location">
          <LocateFixedIcon />
        </Button>
      </form>

      {searchError && <p className="-mt-3 text-sm text-destructive">{searchError}</p>}
      {results && results.length > 0 && (
        <Card size="sm" className="-mt-3">
          <CardContent className="flex flex-col">
            {results.map((r) => (
              <button
                key={`${r.lat},${r.lon}`}
                type="button"
                onClick={() => pick(r)}
                className="flex items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted"
              >
                <MapPinIcon className="size-4 text-muted-foreground" />
                <span className="font-medium">{r.name}</span>
                {r.admin && <span className="text-muted-foreground">{r.admin}</span>}
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      <p className="-mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
        <MapPinIcon className="size-4 text-primary" />
        {place.name}
      </p>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading || !c || !cond ? (
        <Skeleton className="h-72 rounded-4xl" />
      ) : (
        <>
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
              <WeatherIcon code={c.code} isDay={c.isDay} className="size-14 text-muted-foreground" />
              <p className="text-6xl font-semibold tracking-tight tabular-nums">
                {Math.round(c.temp)}°C
              </p>
              <p className="text-sm text-muted-foreground">Feels like {Math.round(c.feels)}°C</p>
              <p className="text-sm font-medium">{cond.label}</p>
              <div className="mt-2 grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
                <Metric icon={<DropletsIcon className="size-4" />} value={`${Math.round(c.humidity)}%`} label="Humidity" />
                <Metric icon={<WindIcon className="size-4" />} value={`${c.wind.toFixed(1)} m/s`} label="Wind" />
                <Metric icon={<GaugeIcon className="size-4" />} value={`${Math.round(c.pressure)} hPa`} label="Pressure" />
                <Metric
                  icon={<EyeIcon className="size-4" />}
                  value={c.visibilityKm != null ? `${c.visibilityKm.toFixed(1)} km` : "--"}
                  label="Visibility"
                />
              </div>
            </CardContent>
          </Card>

          {advice && (
            <Card size="sm">
              <CardContent className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full",
                    advice.tone === "rain" && "bg-primary/15 text-primary",
                    advice.tone === "heat" && "bg-amber-500/15 text-amber-700 dark:text-amber-400",
                    advice.tone === "ok" && "bg-muted text-muted-foreground"
                  )}
                >
                  <UmbrellaIcon className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-medium">Irrigation advice</p>
                  <p className="text-sm text-muted-foreground">{advice.text}</p>
                </div>
              </CardContent>
            </Card>
          )}

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-medium">5-day forecast</h2>
            {weather!.daily.map((d, i) => (
              <Card key={d.date} size="sm">
                <CardContent className="flex items-center gap-3">
                  <span className="w-14 shrink-0 font-medium">{dayName(d.date, i)}</span>
                  <WeatherIcon code={d.code} className="size-6 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                    {describeCode(d.code).label}
                  </span>
                  <span
                    className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground"
                    title="Chance of rain"
                  >
                    <DropletsIcon className="size-3.5" />
                    {Math.round(d.rainChance)}%
                  </span>
                  <span className="w-20 shrink-0 text-right tabular-nums">
                    <span className="font-semibold">{Math.round(d.max)}°</span>{" "}
                    <span className="text-muted-foreground">{Math.round(d.min)}°</span>
                  </span>
                </CardContent>
              </Card>
            ))}
          </section>
          <p className="text-xs text-muted-foreground">Weather data by Open-Meteo.com.</p>
        </>
      )}
    </>
  )
}

function Metric({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-2xl bg-muted/60 px-2 py-3">
      {icon}
      <span className="font-semibold tabular-nums">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}
