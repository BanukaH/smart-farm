import type { ReportMeta } from "@/lib/report-types"

const KEY = "smartfarm.reports"
const MAX = 8
const EMPTY: ReportMeta[] = []
const listeners = new Set<() => void>()
let cachedRaw: string | null = null
let cached: ReportMeta[] = EMPTY

export function subscribeReports(cb: () => void) {
  listeners.add(cb)
  window.addEventListener("storage", cb)
  return () => {
    listeners.delete(cb)
    window.removeEventListener("storage", cb)
  }
}

export function getReportsSnapshot(): ReportMeta[] {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(KEY)
  } catch {
    return cached
  }
  if (raw === cachedRaw) return cached
  cachedRaw = raw
  try {
    cached = raw ? (JSON.parse(raw) as ReportMeta[]) : EMPTY
  } catch {
    cached = EMPTY
  }
  return cached
}

export function getServerReports(): ReportMeta[] {
  return EMPTY
}

export function addReport(meta: ReportMeta) {
  const next = [meta, ...getReportsSnapshot()].slice(0, MAX)
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* storage unavailable: ignore */
  }
  listeners.forEach((l) => l())
}
