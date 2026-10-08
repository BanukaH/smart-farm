// Weather from Open-Meteo (free, no API key, CORS enabled): https://open-meteo.com

export type Place = { name: string; lat: number; lon: number }

// Report default farm location text: Negombo, Western Province, Sri Lanka.
export const DEFAULT_PLACE: Place = {
  name: "Negombo, Sri Lanka",
  lat: 7.2083,
  lon: 79.8358,
}

export type Weather = {
  current: {
    temp: number
    feels: number
    humidity: number
    wind: number // m/s
    pressure: number // hPa
    visibilityKm: number | null
    code: number
    isDay: boolean
  }
  daily: {
    date: string // YYYY-MM-DD
    code: number
    max: number
    min: number
    rainChance: number // %
    rainMm: number
  }[]
}

export type GeoResult = Place & { admin?: string }

export async function searchPlaces(name: string, signal?: AbortSignal): Promise<GeoResult[]> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    name
  )}&count=5&language=en&format=json`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error("Place search failed")
  const data = (await res.json()) as {
    results?: { name: string; latitude: number; longitude: number; country?: string; admin1?: string }[]
  }
  return (data.results ?? []).map((r) => ({
    name: [r.name, r.country].filter(Boolean).join(", "),
    admin: r.admin1,
    lat: r.latitude,
    lon: r.longitude,
  }))
}

export async function fetchWeather(place: Place, signal?: AbortSignal): Promise<Weather> {
  const params = new URLSearchParams({
    latitude: String(place.lat),
    longitude: String(place.lon),
    current:
      "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,surface_pressure,is_day",
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum",
    hourly: "visibility",
    forecast_hours: "1",
    forecast_days: "5",
    wind_speed_unit: "ms",
    timezone: "auto",
  })
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal })
  if (!res.ok) throw new Error("Weather service unavailable")
  const d = await res.json()

  return {
    current: {
      temp: d.current.temperature_2m,
      feels: d.current.apparent_temperature,
      humidity: d.current.relative_humidity_2m,
      wind: d.current.wind_speed_10m,
      pressure: d.current.surface_pressure,
      visibilityKm: d.hourly?.visibility?.[0] != null ? d.hourly.visibility[0] / 1000 : null,
      code: d.current.weather_code,
      isDay: d.current.is_day === 1,
    },
    daily: (d.daily.time as string[]).map((date, i) => ({
      date,
      code: d.daily.weather_code[i],
      max: d.daily.temperature_2m_max[i],
      min: d.daily.temperature_2m_min[i],
      rainChance: d.daily.precipitation_probability_max[i] ?? 0,
      rainMm: d.daily.precipitation_sum[i] ?? 0,
    })),
  }
}

export type Condition = {
  label: string
  kind: "clear" | "partly" | "cloudy" | "fog" | "drizzle" | "rain" | "snow" | "storm"
}

// WMO weather codes used by Open-Meteo.
export function describeCode(code: number): Condition {
  if (code === 0) return { label: "Clear sky", kind: "clear" }
  if (code === 1 || code === 2) return { label: code === 1 ? "Mostly clear" : "Partly cloudy", kind: "partly" }
  if (code === 3) return { label: "Overcast", kind: "cloudy" }
  if (code === 45 || code === 48) return { label: "Fog", kind: "fog" }
  if (code >= 51 && code <= 57) return { label: "Drizzle", kind: "drizzle" }
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82))
    return { label: code >= 80 ? "Rain showers" : "Rain", kind: "rain" }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { label: "Snow", kind: "snow" }
  if (code >= 95) return { label: "Thunderstorm", kind: "storm" }
  return { label: "Unknown", kind: "cloudy" }
}

// Plain-language irrigation hint from the forecast (advice only; auto mode doesn't use it).
export function irrigationAdvice(w: Weather): { text: string; tone: "rain" | "heat" | "ok" } {
  const wet = w.daily.slice(0, 2).findIndex((d) => d.rainChance >= 60 || d.rainMm >= 5)
  if (wet !== -1) {
    const when = wet === 0 ? "today" : "tomorrow"
    return { text: `Rain expected ${when}. You can skip irrigation.`, tone: "rain" }
  }
  if (w.daily[0] && w.daily[0].max >= 35)
    return { text: "Hot day ahead. Water early in the morning.", tone: "heat" }
  return { text: "No rain expected soon. Irrigate as needed.", tone: "ok" }
}

export function dayName(date: string, index: number) {
  if (index === 0) return "Today"
  return new Date(`${date}T12:00:00`).toLocaleDateString([], { weekday: "short" })
}
