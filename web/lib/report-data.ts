import { loadHistory } from "@/lib/history-api"
import type { AlertRecord } from "@/lib/alerts"
import type { ZoneView } from "@/lib/farm"
import type { HistoryRecord } from "@/lib/history"
import { getPlaceSnapshot } from "@/lib/place-store"
import { REPORT_WINDOW_MS, type ReportType } from "@/lib/report-types"
import { fetchWeather, type Place, type Weather } from "@/lib/weather"

export type ReportData = {
  type: ReportType
  since: number
  until: number
  generatedAt: number
  views: ZoneView[]
  records: Record<string, HistoryRecord[]>
  alerts: AlertRecord[]
  place: Place
  weather: Weather | null
}

// Gathers everything a report needs. Weather is best effort: the report still builds without it.
export async function collectReportData(
  type: ReportType,
  views: ZoneView[],
  alertLog: AlertRecord[],
  window?: { since: number; until: number }
): Promise<ReportData> {
  const until = window?.until ?? Date.now()
  const since = window?.since ?? until - REPORT_WINDOW_MS[type]
  const place = getPlaceSnapshot()

  const [allRecords, weather] = await Promise.all([
    loadHistory(since),
    fetchWeather(place).catch(() => null),
  ])
  const records = Object.fromEntries(
    Object.entries(allRecords).map(([k, v]) => [k, v.filter((r) => r.ts <= until)])
  )

  return {
    type,
    since,
    until,
    generatedAt: Date.now(),
    views,
    records,
    alerts: alertLog.filter((a) => a.ts >= since && a.ts <= until),
    place,
    weather,
  }
}
