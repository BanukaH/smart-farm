"use client"

import * as React from "react"

import {
  getPlaceSnapshot,
  getServerPlace,
  savePlace,
  subscribePlace,
} from "@/lib/place-store"
import { fetchWeather, type Place, type Weather } from "@/lib/weather"

const REFRESH_MS = 15 * 60_000

export function useWeather() {
  const place = React.useSyncExternalStore(subscribePlace, getPlaceSnapshot, getServerPlace)
  const [weather, setWeather] = React.useState<Weather | null>(null)
  const [loadedFor, setLoadedFor] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const key = `${place.lat},${place.lon}`

  React.useEffect(() => {
    const ctrl = new AbortController()
    async function load() {
      try {
        const w = await fetchWeather(place, ctrl.signal)
        setWeather(w)
        setLoadedFor(key)
        setError(null)
      } catch (e) {
        if (ctrl.signal.aborted) return
        setError(e instanceof Error ? e.message : "Could not load weather")
        setLoadedFor(key)
      }
    }
    load()
    const t = setInterval(load, REFRESH_MS)
    return () => {
      ctrl.abort()
      clearInterval(t)
    }
  }, [place, key])

  return {
    place,
    weather: loadedFor === key ? weather : null,
    loading: loadedFor !== key,
    error: loadedFor === key ? error : null,
    setPlace: (p: Place) => savePlace(p),
  }
}
