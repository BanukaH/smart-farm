import { ZONES } from "@/lib/farm"
import { loadHistory } from "@/lib/history-api"
import { download } from "@/lib/download"

// One row per saved reading: timestamp, zone, node and the sensor values.
export async function exportHistoryCsv(sinceMs: number, label: string, names: string[]) {
  const since = Date.now() - sinceMs
  const all = await loadHistory(since)

  const rows = ["time,zone,node,soil_moisture_pct,temperature_c,humidity_pct,light_lux,output_on"]
  const merged = ZONES.flatMap((z, i) =>
    (all[z.nodeId] ?? []).map((r) => ({ r, zone: names[i], node: z.nodeId }))
  ).sort((a, b) => a.r.ts - b.r.ts)

  for (const { r, zone, node } of merged) {
    rows.push(
      [
        new Date(r.ts).toISOString(),
        `"${zone.replace(/"/g, '""')}"`,
        node,
        r.soilMoisture ?? "",
        r.temperature ?? "",
        r.humidity ?? "",
        r.light ?? "",
        r.relayOn == null ? "" : r.relayOn ? 1 : 0,
      ].join(",")
    )
  }

  download(
    new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" }),
    `smartfarm-history-${label}-${new Date().toISOString().slice(0, 10)}.csv`
  )
  return merged.length
}
