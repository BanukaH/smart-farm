import { DEFAULT_PLACE, type Place } from "@/lib/weather"

// The chosen farm location, remembered per device.
const KEY = "smartfarm.place"
const listeners = new Set<() => void>()
let cachedRaw: string | null = null
let cached: Place = DEFAULT_PLACE

export function subscribePlace(cb: () => void) {
  listeners.add(cb)
  window.addEventListener("storage", cb)
  return () => {
    listeners.delete(cb)
    window.removeEventListener("storage", cb)
  }
}

export function getPlaceSnapshot(): Place {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(KEY)
  } catch {
    return cached
  }
  if (raw === cachedRaw) return cached
  cachedRaw = raw
  try {
    const p = raw ? (JSON.parse(raw) as Place) : null
    cached = p && typeof p.lat === "number" && typeof p.lon === "number" ? p : DEFAULT_PLACE
  } catch {
    cached = DEFAULT_PLACE
  }
  return cached
}

export function getServerPlace(): Place {
  return DEFAULT_PLACE
}

export function savePlace(place: Place) {
  try {
    localStorage.setItem(KEY, JSON.stringify(place))
  } catch {
    /* storage unavailable: ignore */
  }
  listeners.forEach((l) => l())
}
