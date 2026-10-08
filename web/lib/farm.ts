// Zone layout and status logic. Paths follow the dissertation (Table 4.4, Appendix A.5).

export const SENSORS_PATH = "sensors"
export const PUMP_PATH = "pump/active"

export const ZONES = [
  { id: 1, nodeId: "ESP32_NODE_001", name: "Zone 1" },
  { id: 2, nodeId: "ESP32_NODE_002", name: "Zone 2" },
  { id: 3, nodeId: "ESP32_NODE_003", name: "Zone 3" },
  { id: 4, nodeId: "ESP32_NODE_004", name: "Zone 4" },
] as const

export type Zone = (typeof ZONES)[number]

// Per-zone settings stored at /zones/<node> (edited in the app, read by the node too).
export type ZoneMode = "manual" | "auto"

export type ZoneConfig = {
  name?: string
  crop?: string
  icon?: string // emoji shown for the zone, e.g. 🍅
  soilAlert?: number // alert below this %
  tempAlert?: number // alert above this °C (report: about 36)
  mode?: ZoneMode
  soilLow?: number // auto: turn ON below this %
  soilHigh?: number // auto: turn OFF at or above this %
}

export type ResolvedConfig = {
  crop: string
  icon: string
  soilAlert: number
  tempAlert: number
  mode: ZoneMode
  soilLow: number
  soilHigh: number
}

export const DEFAULT_ICON = "🌱"

export const DEFAULT_CONFIG: ResolvedConfig = {
  crop: "",
  icon: DEFAULT_ICON,
  soilAlert: 30,
  tempAlert: 36,
  mode: "manual",
  soilLow: 30,
  soilHigh: 60,
}

export function resolveConfig(cfg: ZoneConfig | undefined): ResolvedConfig {
  return {
    crop: cfg?.crop ?? DEFAULT_CONFIG.crop,
    icon: cfg?.icon || DEFAULT_ICON,
    soilAlert: cfg?.soilAlert ?? DEFAULT_CONFIG.soilAlert,
    tempAlert: cfg?.tempAlert ?? DEFAULT_CONFIG.tempAlert,
    mode: cfg?.mode === "auto" ? "auto" : "manual",
    soilLow: cfg?.soilLow ?? DEFAULT_CONFIG.soilLow,
    soilHigh: cfg?.soilHigh ?? DEFAULT_CONFIG.soilHigh,
  }
}

export type NodeReading = {
  nodeId?: string
  soilMoisture?: number
  temperature?: number
  humidity?: number
  light?: number
  battery?: number
  status?: string
  timestamp?: number
  relayOn?: boolean
  dhtFault?: boolean
  mode?: ZoneMode
}

// Report 4.8.5: a node silent for more than 3 sampling intervals is offline.
// Nodes write every 5 s, so 20 s leaves a little slack for slow Wi-Fi.
export const OFFLINE_AFTER_MS = 20_000

export type ZoneStatus =
  | "offline"
  | "fault"
  | "off"
  | "starting"
  | "running"
  | "stopping"

export type ZoneView = {
  zone: Zone
  name: string
  config: ResolvedConfig
  reading: NodeReading | undefined
  command: boolean
  status: ZoneStatus
  online: boolean
  ageSeconds: number | null
}

export function buildZoneView(
  zone: Zone,
  reading: NodeReading | undefined,
  command: boolean,
  now: number,
  cfg?: ZoneConfig
): ZoneView {
  const age =
    reading?.timestamp != null ? Math.max(0, now - reading.timestamp) : null
  const online = age != null && age <= OFFLINE_AFTER_MS
  const relayOn = reading?.relayOn === true

  let status: ZoneStatus
  if (!online) status = "offline"
  else if (reading?.status === "fault") status = "fault"
  else if (command && relayOn) status = "running"
  else if (command && !relayOn) status = "starting"
  else if (!command && relayOn) status = "stopping"
  else status = "off"

  return {
    zone,
    name: cfg?.name?.trim() || zone.name,
    config: resolveConfig(cfg),
    reading,
    command,
    status,
    online,
    ageSeconds: age == null ? null : Math.round(age / 1000),
  }
}

export const STATUS_LABEL: Record<ZoneStatus, string> = {
  offline: "Offline",
  fault: "Sensor fault",
  off: "Off",
  starting: "Starting",
  running: "Running",
  stopping: "Stopping",
}

// ---- Live alerts (computed now from current readings) ----
// Saved alerts raised by the nodes live in lib/alerts.ts.

export type Alert = {
  id: string
  kind: "offline" | "fault" | "soil" | "temp" | "dht"
  severity: "critical" | "warning"
  zone: string
  message: string
}

export function buildAlerts(views: ZoneView[]): Alert[] {
  const alerts: Alert[] = []
  for (const v of views) {
    const name = v.name
    if (!v.online) {
      alerts.push({
        id: `${v.zone.nodeId}-offline`,
        kind: "offline",
        severity: "warning",
        zone: name,
        message: `${name}: Node offline. Last update ${
          v.ageSeconds == null ? "never" : `${v.ageSeconds}s ago`
        }.`,
      })
      continue
    }
    if (v.status === "fault") {
      alerts.push({
        id: `${v.zone.nodeId}-fault`,
        kind: "fault",
        severity: "critical",
        zone: name,
        message: `${name}: Soil sensor fault. Output is held OFF.`,
      })
    }
    const soil = v.reading?.soilMoisture
    if (soil != null && soil < v.config.soilAlert) {
      alerts.push({
        id: `${v.zone.nodeId}-soil`,
        kind: "soil",
        severity: "critical",
        zone: name,
        message: `${name}: Soil moisture low (${soil.toFixed(0)}%). Irrigate now.`,
      })
    }
    const temp = v.reading?.temperature
    if (temp != null && temp > v.config.tempAlert) {
      alerts.push({
        id: `${v.zone.nodeId}-temp`,
        kind: "temp",
        severity: "critical",
        zone: name,
        message: `${name}: Temperature exceeds safe threshold (${temp.toFixed(1)} °C).`,
      })
    }
    if (v.reading?.dhtFault) {
      alerts.push({
        id: `${v.zone.nodeId}-dht`,
        kind: "dht",
        severity: "warning",
        zone: name,
        message: `${name}: Temperature/humidity sensor read failed. Showing last values.`,
      })
    }
  }
  return alerts
}
