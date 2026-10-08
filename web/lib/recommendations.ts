import type { ZoneView } from "@/lib/farm"
import { stats, type HistoryRecord } from "@/lib/history"
import { dayName, type Weather } from "@/lib/weather"

// Rule-based advice for the report, from current values, the period's history and the forecast.
export function buildRecommendations(
  views: ZoneView[],
  records: Record<string, HistoryRecord[]>,
  weather: Weather | null,
  displayName: (v: ZoneView) => string
): string[] {
  const out: string[] = []

  for (const v of views) {
    const name = displayName(v)
    if (!v.online) {
      out.push(`${name}: the node is offline. Check its power and Wi-Fi.`)
      continue
    }
    if (v.status === "fault")
      out.push(`${name}: soil sensor fault. Check the probe wiring; the output is held off.`)

    const avg = stats(records[v.zone.nodeId] ?? [], "soilMoisture")?.avg
    const now = v.reading?.soilMoisture
    if (avg != null && avg < v.config.soilAlert)
      out.push(
        `${name}: average soil moisture was ${avg.toFixed(0)}%, below your ${v.config.soilAlert}% alert level. Irrigate, or switch the zone to Auto.`
      )
    else if (now != null && now < v.config.soilAlert)
      out.push(`${name}: soil moisture is ${now.toFixed(0)}% right now, below your ${v.config.soilAlert}% alert level.`)
    else if (now != null && now > 90)
      out.push(`${name}: soil is very wet (${now.toFixed(0)}%). Hold off irrigating to avoid waterlogging.`)

    const t = v.reading?.temperature
    if (t != null && t > v.config.tempAlert)
      out.push(`${name}: temperature is ${t.toFixed(1)} °C, above ${v.config.tempAlert} °C. Water early in the morning and consider shade.`)
  }

  if (weather) {
    const wet = weather.daily.findIndex((d) => d.rainChance >= 60 || d.rainMm >= 5)
    if (wet !== -1)
      out.push(
        `Rain is likely ${wet === 0 ? "today" : wet === 1 ? "tomorrow" : `on ${dayName(weather.daily[wet].date, wet)}`} (${Math.round(weather.daily[wet].rainChance)}% chance). You can skip irrigation until then.`
      )
  }

  if (out.length === 0) out.push("All zones are within their ranges. No action needed.")
  return out
}
