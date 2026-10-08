export type ReportType = "daily" | "weekly"

export const REPORT_WINDOW_MS: Record<ReportType, number> = {
  daily: 86_400_000,
  weekly: 7 * 86_400_000,
}

// Saved so the "Recent reports" list can regenerate the same period later.
export type ReportMeta = {
  id: string
  type: ReportType
  generatedAt: number
  since: number
  until: number
  alerts: number
}
