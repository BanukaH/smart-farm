import type { jsPDF as JsPdf } from "jspdf"

import { describeAlert } from "@/lib/alerts"
import { STATUS_LABEL, ZONES, type ZoneView } from "@/lib/farm"
import { bucketize, stats } from "@/lib/history"
import { buildRecommendations } from "@/lib/recommendations"
import type { ReportData } from "@/lib/report-data"
import { describeCode, irrigationAdvice, dayName } from "@/lib/weather"
import { download } from "@/lib/download"

const GREEN: [number, number, number] = [47, 125, 79]
const GRID: [number, number, number] = [225, 228, 226]
const MUTED: [number, number, number] = [110, 118, 114]
const PAGE_W = 210
const MARGIN = 14
const BOTTOM = 282

// jsPDF's built-in fonts have no emoji, so drop them from names.
const plain = (s: string) => s.replace(/[^\x20-\x7E]/g, "").trim()

function fmtDate(ts: number) {
  return new Date(ts).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

type Doc = JsPdf & { lastAutoTable?: { finalY: number } }

export async function buildReportPdf(data: ReportData) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([import("jspdf"), import("jspdf-autotable")])
  const autoTable = autoTableModule.default
  const doc = new jsPDF({ unit: "mm", format: "a4" }) as Doc

  const name = (v: ZoneView) => plain(v.name) || v.zone.name
  const title = data.type === "daily" ? "Daily Report" : "Weekly Report"
  let y = 0

  const ensure = (h: number) => {
    if (y + h > BOTTOM) {
      doc.addPage()
      y = 20
    }
  }
  const heading = (text: string) => {
    ensure(14)
    doc.setFont("helvetica", "bold").setFontSize(13).setTextColor(30, 40, 35)
    doc.text(text, MARGIN, y)
    doc.setDrawColor(...GREEN).setLineWidth(0.6).line(MARGIN, y + 1.8, MARGIN + 12, y + 1.8)
    y += 8
  }
  const body = (text: string, size = 10) => {
    doc.setFont("helvetica", "normal").setFontSize(size).setTextColor(60, 66, 63)
    const lines = doc.splitTextToSize(text, PAGE_W - MARGIN * 2) as string[]
    ensure(lines.length * 5 + 2)
    doc.text(lines, MARGIN, y)
    y += lines.length * 5 + 2
  }
  const afterTable = () => {
    y = (doc.lastAutoTable?.finalY ?? y) + 8
  }
  const tableStyle = {
    theme: "striped" as const,
    headStyles: { fillColor: GREEN, textColor: 255, fontSize: 9 },
    styles: { fontSize: 9, cellPadding: 2.2 },
    alternateRowStyles: { fillColor: [244, 248, 245] as [number, number, number] },
    margin: { left: MARGIN, right: MARGIN },
  }

  // ---- header band ----
  doc.setFillColor(...GREEN).rect(0, 0, PAGE_W, 30, "F")
  doc.setTextColor(255).setFont("helvetica", "bold").setFontSize(20)
  doc.text(`Smart Farm ${title}`, MARGIN, 14)
  doc.setFont("helvetica", "normal").setFontSize(10)
  doc.text(`${fmtDate(data.since)}  to  ${fmtDate(data.until)}`, MARGIN, 22)
  doc.text(`Generated ${fmtDate(data.generatedAt)}`, PAGE_W - MARGIN, 22, { align: "right" })
  y = 42

  // ---- 1. zone summary ----
  heading("Zone summary")
  autoTable(doc, {
    ...tableStyle,
    startY: y,
    head: [["Zone", "Crop", "Status", "Soil now", "Soil avg", "Min - Max", "Temp", "Humidity"]],
    body: data.views.map((v) => {
      const s = stats(data.records[v.zone.nodeId] ?? [], "soilMoisture")
      const r = v.reading
      return [
        name(v),
        plain(v.config.crop) || "-",
        STATUS_LABEL[v.status],
        r?.soilMoisture != null ? `${r.soilMoisture.toFixed(0)}%` : "-",
        s ? `${s.avg.toFixed(0)}%` : "-",
        s ? `${s.min.toFixed(0)}% - ${s.max.toFixed(0)}%` : "-",
        r?.temperature != null ? `${r.temperature.toFixed(1)} C` : "-",
        r?.humidity != null ? `${r.humidity.toFixed(0)}%` : "-",
      ]
    }),
  })
  afterTable()

  // ---- 2. moisture trend ----
  heading("Moisture trend")
  const cw = (PAGE_W - MARGIN * 2 - 8) / 2
  const ch = 46
  ensure(ch * 2 + 14)
  data.views.forEach((v, i) => {
    const x = MARGIN + (i % 2) * (cw + 8)
    const top = y + Math.floor(i / 2) * (ch + 10)
    drawTrend(doc, x, top, cw, ch, name(v), bucketize(data.records[v.zone.nodeId] ?? [], data.since, data.until), data.since, data.until, data.type)
  })
  y += ch * 2 + 20

  // ---- 3. alerts log ----
  heading("Alerts log")
  if (data.alerts.length === 0) {
    body("No alerts were raised in this period.")
  } else {
    const names = Object.fromEntries(ZONES.map((z, i) => [z.nodeId, name(data.views[i])]))
    autoTable(doc, {
      ...tableStyle,
      startY: y,
      head: [["Time", "Severity", "Alert"]],
      body: [...data.alerts]
        .sort((a, b) => b.ts - a.ts)
        .slice(0, 40)
        .map((a) => [fmtDate(a.ts), a.severity ?? "critical", plain(describeAlert(a, names))]),
      columnStyles: { 0: { cellWidth: 38 }, 1: { cellWidth: 22 } },
    })
    afterTable()
  }

  // ---- 4. recommendations ----
  heading("Recommendations")
  for (const line of buildRecommendations(data.views, data.records, data.weather, name)) body(`-  ${plain(line)}`)
  y += 2

  // ---- 5. weather ----
  heading("Weather summary")
  if (!data.weather) {
    body("Weather data was unavailable when this report was generated.")
  } else {
    const w = data.weather
    body(
      `${plain(data.place.name)}: ${Math.round(w.current.temp)} C now, ${describeCode(w.current.code).label.toLowerCase()}, humidity ${Math.round(w.current.humidity)}%.`
    )
    autoTable(doc, {
      ...tableStyle,
      startY: y,
      head: [["Day", "Conditions", "High", "Low", "Rain chance"]],
      body: w.daily.map((d, i) => [
        dayName(d.date, i),
        describeCode(d.code).label,
        `${Math.round(d.max)} C`,
        `${Math.round(d.min)} C`,
        `${Math.round(d.rainChance)}%`,
      ]),
    })
    afterTable()
    body(`Irrigation advice: ${irrigationAdvice(w).text}`)
    y += 2
  }

  // ---- 6. pump usage ----
  heading("Pump usage log")
  autoTable(doc, {
    ...tableStyle,
    startY: y,
    head: [["Zone", "Mode", "Runs", "Time on"]],
    body: data.views.map((v) => {
      const u = usage(data.records[v.zone.nodeId] ?? [])
      return [name(v), v.config.mode === "auto" ? "Auto" : "Manual", u.runs, u.minutes === 0 ? "-" : fmtMinutes(u.minutes)]
    }),
  })
  afterTable()
  body(
    "Estimated from one-minute readings. The demo drives a relay and LED, not a water pump, so no water volume is recorded.",
    8
  )

  // ---- footer on every page ----
  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(...MUTED)
    doc.text("Smart Farm demo report", MARGIN, 290)
    doc.text(`Page ${p} of ${pages}`, PAGE_W - MARGIN, 290, { align: "right" })
  }

  const day = new Date(data.until).toISOString().slice(0, 10)
  download(doc.output("blob"), `smartfarm-${data.type}-report-${day}.pdf`)
}

function usage(records: { ts: number; relayOn?: boolean }[]) {
  let runs = 0
  let minutes = 0
  let prev = false
  for (const r of records) {
    const on = r.relayOn === true
    if (on) minutes += 1 // one record per minute
    if (on && !prev) runs += 1
    prev = on
  }
  return { runs, minutes }
}

function fmtMinutes(m: number) {
  if (m < 60) return `${m} min`
  return `${Math.floor(m / 60)} h ${m % 60} min`
}

// A small area-free line chart drawn with plain PDF primitives, y fixed at 0-100%.
function drawTrend(
  doc: Doc,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  points: { ts: number; soilMoisture?: number }[],
  since: number,
  until: number,
  type: "daily" | "weekly"
) {
  doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(40, 48, 44)
  doc.text(label, x, y)

  const left = x + 9
  const top = y + 3
  const pw = w - 11
  const ph = h - 12

  doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(...MUTED)
  doc.setDrawColor(...GRID).setLineWidth(0.2)
  for (const v of [0, 50, 100]) {
    const gy = top + ph - (v / 100) * ph
    doc.line(left, gy, left + pw, gy)
    doc.text(`${v}%`, left - 1.5, gy + 1, { align: "right" })
  }

  const pts = points.filter((p) => p.soilMoisture != null)
  if (pts.length === 0) {
    doc.text("No data in this period", left + pw / 2, top + ph / 2, { align: "center" })
  } else {
    const px = (ts: number) => left + ((ts - since) / (until - since)) * pw
    const py = (v: number) => top + ph - (Math.min(100, Math.max(0, v)) / 100) * ph
    doc.setDrawColor(...GREEN).setLineWidth(0.6)
    for (let i = 1; i < pts.length; i++) {
      doc.line(px(pts[i - 1].ts), py(pts[i - 1].soilMoisture!), px(pts[i].ts), py(pts[i].soilMoisture!))
    }
    if (pts.length === 1) doc.circle(px(pts[0].ts), py(pts[0].soilMoisture!), 0.6, "F")
  }

  doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(...MUTED)
  const fmt = (ts: number) =>
    type === "daily"
      ? new Date(ts).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
      : new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" })
  doc.text(fmt(since), left, top + ph + 4)
  doc.text(fmt(until), left + pw, top + ph + 4, { align: "right" })
}
