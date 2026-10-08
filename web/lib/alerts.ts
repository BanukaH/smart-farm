// Alerts saved by the nodes at /alerts/<id>. A node writes one when a problem starts.

export type AlertRecord = {
  id: string
  ts: number
  node: string
  type: string // soil_low | sensor_fault | temp_high
  severity?: "critical" | "warning"
  value?: number
  read?: boolean
}

export function describeAlert(a: AlertRecord, names: Record<string, string>) {
  const zone = names[a.node] ?? a.node
  switch (a.type) {
    case "soil_low":
      return `${zone}: Soil moisture low (${a.value?.toFixed(0) ?? "?"}%). Irrigate now.`
    case "temp_high":
      return `${zone}: Temperature exceeds safe threshold (${a.value?.toFixed(1) ?? "?"} °C).`
    case "sensor_fault":
      return `${zone}: Soil sensor fault. Output is held OFF.`
    default:
      return `${zone}: ${a.type}`
  }
}

export function timeAgo(ts: number, now: number) {
  const s = Math.max(0, Math.round((now - ts) / 1000))
  if (s < 60) return "just now"
  if (s < 3600) return `${Math.round(s / 60)} min ago`
  if (s < 86_400) return `${Math.round(s / 3600)} h ago`
  return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" })
}
