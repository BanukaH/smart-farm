// History records written by the nodes under /history/<node> (one per minute).

export type HistoryRecord = {
  ts: number
  soilMoisture?: number
  temperature?: number
  humidity?: number
  light?: number
  relayOn?: boolean // whether the zone output was on at that moment
}

export const RANGES = [
  { id: "1h", label: "1 hour", ms: 3_600_000 },
  { id: "24h", label: "24 hours", ms: 86_400_000 },
  { id: "7d", label: "7 days", ms: 7 * 86_400_000 },
] as const

export type RangeId = (typeof RANGES)[number]["id"]

const MAX_POINTS = 120
type Metric = "soilMoisture" | "temperature" | "humidity" | "light"
const METRICS: Metric[] = ["soilMoisture", "temperature", "humidity", "light"]

export type Point = { ts: number } & Partial<Record<Metric, number>>

// Average records into equal time buckets so a 7-day range stays light to draw.
export function bucketize(
  records: HistoryRecord[],
  since: number,
  until: number
): Point[] {
  if (records.length === 0) return []
  const size = Math.max(60_000, Math.ceil((until - since) / MAX_POINTS))
  const buckets = new Map<number, { sum: Partial<Record<Metric, number>>; n: Partial<Record<Metric, number>> }>()

  for (const r of records) {
    if (r.ts < since || r.ts > until) continue
    const key = since + Math.floor((r.ts - since) / size) * size
    const b = buckets.get(key) ?? { sum: {}, n: {} }
    for (const m of METRICS) {
      const v = r[m]
      if (typeof v === "number" && Number.isFinite(v)) {
        b.sum[m] = (b.sum[m] ?? 0) + v
        b.n[m] = (b.n[m] ?? 0) + 1
      }
    }
    buckets.set(key, b)
  }

  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([ts, b]) => {
      const p: Point = { ts }
      for (const m of METRICS) {
        if (b.n[m]) p[m] = Math.round((b.sum[m]! / b.n[m]!) * 10) / 10
      }
      return p
    })
}

export function stats(records: HistoryRecord[], metric: Metric) {
  const vals = records
    .map((r) => r[metric])
    .filter((v): v is number => typeof v === "number")
  if (vals.length === 0) return null
  return {
    min: Math.min(...vals),
    max: Math.max(...vals),
    avg: vals.reduce((a, b) => a + b, 0) / vals.length,
    count: vals.length,
  }
}
