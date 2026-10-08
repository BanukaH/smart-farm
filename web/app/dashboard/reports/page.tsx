"use client"

import * as React from "react"
import {
  BellIcon,
  CloudSunIcon,
  DownloadIcon,
  DropletsIcon,
  FileTextIcon,
  LightbulbIcon,
  LineChartIcon,
  SheetIcon,
  TableIcon,
} from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useFarm } from "@/hooks/use-farm"
import { collectReportData } from "@/lib/report-data"
import { exportHistoryCsv } from "@/lib/report-csv"
import { buildReportPdf } from "@/lib/report-pdf"
import {
  addReport,
  getReportsSnapshot,
  getServerReports,
  subscribeReports,
} from "@/lib/report-store"
import { REPORT_WINDOW_MS, type ReportMeta, type ReportType } from "@/lib/report-types"

const CONTENTS = [
  { icon: TableIcon, title: "Zone summary table", text: "All zones: status, soil, temperature, humidity" },
  { icon: LineChartIcon, title: "Moisture trend chart", text: "Soil moisture graph per zone" },
  { icon: BellIcon, title: "Alerts log", text: "Alerts raised in the period" },
  { icon: LightbulbIcon, title: "Recommendations", text: "Irrigation advice from readings and forecast" },
  { icon: CloudSunIcon, title: "Weather summary", text: "5-day forecast and irrigation hint" },
  { icon: DropletsIcon, title: "Pump usage log", text: "How often and how long each zone ran" },
]

export default function ReportsPage() {
  const { views, alertLog } = useFarm()
  const recent = React.useSyncExternalStore(subscribeReports, getReportsSnapshot, getServerReports)
  const [busy, setBusy] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [note, setNote] = React.useState<string | null>(null)

  async function generate(type: ReportType, window?: { since: number; until: number }, key: string = type) {
    setBusy(key)
    setError(null)
    setNote(null)
    try {
      const data = await collectReportData(type, views, alertLog, window)
      await buildReportPdf(data)
      if (!window) {
        addReport({
          id: String(data.generatedAt),
          type,
          generatedAt: data.generatedAt,
          since: data.since,
          until: data.until,
          alerts: data.alerts.length,
        })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the report")
    } finally {
      setBusy(null)
    }
  }

  async function csv(days: 1 | 7) {
    const key = `csv${days}`
    setBusy(key)
    setError(null)
    setNote(null)
    try {
      const rows = await exportHistoryCsv(
        days * 86_400_000,
        days === 1 ? "24h" : "7d",
        views.map((v) => v.name)
      )
      setNote(rows === 0 ? "No readings in that period yet, so the CSV is empty." : `Exported ${rows} readings.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not export")
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <PageHeader title="Reports" description="Download a PDF summary of your farm, or the raw readings as CSV." />

      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
          <FileTextIcon className="size-10 text-muted-foreground" />
          <div>
            <p className="text-lg font-semibold">Generate a report</p>
            <p className="text-sm text-muted-foreground">Downloads a PDF to this device.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button size="lg" disabled={busy !== null} onClick={() => generate("daily")}>
              <DownloadIcon />
              {busy === "daily" ? "Creating..." : "Daily report"}
            </Button>
            <Button size="lg" variant="outline" disabled={busy !== null} onClick={() => generate("weekly")}>
              <DownloadIcon />
              {busy === "weekly" ? "Creating..." : "Weekly report"}
            </Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {note && <p className="text-sm text-muted-foreground">{note}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Report contents</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {CONTENTS.map((c) => (
            <div key={c.title} className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <c.icon className="size-4" />
              </span>
              <div>
                <p className="text-sm font-medium">{c.title}</p>
                <p className="text-xs text-muted-foreground">{c.text}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Export readings</CardTitle>
          <CardDescription>One row per saved reading, for spreadsheets.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={busy !== null} onClick={() => csv(1)}>
            <SheetIcon />
            {busy === "csv1" ? "Exporting..." : "CSV, last 24 hours"}
          </Button>
          <Button variant="outline" disabled={busy !== null} onClick={() => csv(7)}>
            <SheetIcon />
            {busy === "csv7" ? "Exporting..." : "CSV, last 7 days"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent reports</CardTitle>
          <CardDescription>Download again to rebuild the same period.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reports yet.</p>
          ) : (
            recent.map((r) => <RecentRow key={r.id} meta={r} busy={busy} onDownload={generate} />)
          )}
        </CardContent>
      </Card>
    </>
  )
}

function RecentRow({
  meta,
  busy,
  onDownload,
}: {
  meta: ReportMeta
  busy: string | null
  onDownload: (type: ReportType, window?: { since: number; until: number }, key?: string) => void
}) {
  const label = meta.type === "daily" ? "Daily report" : "Weekly report"
  const key = `r${meta.id}`
  return (
    <div className="flex items-center gap-3 rounded-2xl border p-3">
      <FileTextIcon className="size-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="truncate text-xs text-muted-foreground">
          {new Date(meta.until).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
          {" · "}
          {meta.alerts} {meta.alerts === 1 ? "alert" : "alerts"}
          {" · "}
          {Math.round(REPORT_WINDOW_MS[meta.type] / 86_400_000)} d window
        </p>
      </div>
      <Button
        size="icon"
        variant="ghost"
        aria-label={`Download ${label}`}
        disabled={busy !== null}
        onClick={() => onDownload(meta.type, { since: meta.since, until: meta.until }, key)}
      >
        <DownloadIcon />
      </Button>
    </div>
  )
}
