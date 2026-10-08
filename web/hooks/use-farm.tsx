"use client"

import * as React from "react"
import {
  limitToLast,
  onValue,
  orderByChild,
  query,
  ref,
  set,
  update,
} from "firebase/database"

import { db } from "@/lib/firebase"
import type { AlertRecord } from "@/lib/alerts"
import {
  PUMP_PATH,
  SENSORS_PATH,
  ZONES,
  buildAlerts,
  buildZoneView,
  type Alert,
  type NodeReading,
  type ZoneConfig,
  type ZoneView,
} from "@/lib/farm"

type FarmContextValue = {
  views: ZoneView[]
  alerts: Alert[] // live, computed now
  alertLog: AlertRecord[] // saved by the nodes, newest first
  unread: number
  badge: number // unread saved alerts only
  now: number
  connected: boolean
  loaded: boolean
  error: string | null
  setZone: (nodeId: string, on: boolean) => Promise<void>
  stopAll: () => Promise<void>
  saveZone: (nodeId: string, patch: ZoneConfig) => Promise<void>
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
}

const FarmContext = React.createContext<FarmContextValue | null>(null)

export function FarmProvider({ children }: { children: React.ReactNode }) {
  const [readings, setReadings] = React.useState<Record<string, NodeReading>>({})
  const [commands, setCommands] = React.useState<Record<string, boolean>>({})
  const [configs, setConfigs] = React.useState<Record<string, ZoneConfig>>({})
  const [alertLog, setAlertLog] = React.useState<AlertRecord[]>([])
  const [connected, setConnected] = React.useState(false)
  const [loaded, setLoaded] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [now, setNow] = React.useState(() => Date.now())

  // Tick so "last seen" and offline detection update without new data.
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  React.useEffect(() => {
    const onError = (e: Error) => setError(e.message)
    const unsubs = [
      onValue(
        ref(db, SENSORS_PATH),
        (snap) => {
          setReadings((snap.val() as Record<string, NodeReading> | null) ?? {})
          setLoaded(true)
          setError(null)
        },
        onError
      ),
      onValue(
        ref(db, PUMP_PATH),
        (snap) =>
          setCommands((snap.val() as Record<string, boolean> | null) ?? {}),
        onError
      ),
      onValue(
        ref(db, "zones"),
        (snap) =>
          setConfigs((snap.val() as Record<string, ZoneConfig> | null) ?? {}),
        onError
      ),
      onValue(
        query(ref(db, "alerts"), orderByChild("ts"), limitToLast(100)),
        (snap) => {
          const list: AlertRecord[] = []
          snap.forEach((child) => {
            list.push({ ...(child.val() as Omit<AlertRecord, "id">), id: child.key! })
          })
          setAlertLog(list.sort((a, b) => b.ts - a.ts))
        },
        onError
      ),
      onValue(ref(db, ".info/connected"), (snap) =>
        setConnected(snap.val() === true)
      ),
    ]
    return () => unsubs.forEach((u) => u())
  }, [])

  const views = React.useMemo(
    () =>
      ZONES.map((z) =>
        buildZoneView(
          z,
          readings[z.nodeId],
          commands[z.nodeId] === true,
          now,
          configs[z.nodeId]
        )
      ),
    [readings, commands, configs, now]
  )

  const alerts = React.useMemo(() => buildAlerts(views), [views])
  const unread = React.useMemo(
    () => alertLog.filter((a) => !a.read).length,
    [alertLog]
  )

  const badge = unread

  const setZone = React.useCallback(async (nodeId: string, on: boolean) => {
    await set(ref(db, `${PUMP_PATH}/${nodeId}`), on)
  }, [])

  // Emergency stop also drops every zone to manual: a node in auto mode would
  // otherwise turn itself straight back on.
  const stopAll = React.useCallback(async () => {
    const patch: Record<string, boolean | string> = {}
    for (const z of ZONES) {
      patch[`${PUMP_PATH}/${z.nodeId}`] = false
      patch[`zones/${z.nodeId}/mode`] = "manual"
    }
    await update(ref(db), patch)
  }, [])

  const saveZone = React.useCallback(
    async (nodeId: string, patch: ZoneConfig) => {
      const clean = Object.fromEntries(
        Object.entries(patch).filter(([, v]) => v !== undefined)
      )
      await update(ref(db, `zones/${nodeId}`), clean)
    },
    []
  )

  const markRead = React.useCallback(async (id: string) => {
    await update(ref(db, `alerts/${id}`), { read: true })
  }, [])

  const markAllRead = React.useCallback(async () => {
    const patch: Record<string, boolean> = {}
    for (const a of alertLog) if (!a.read) patch[`${a.id}/read`] = true
    if (Object.keys(patch).length) await update(ref(db, "alerts"), patch)
  }, [alertLog])

  const value = React.useMemo(
    () => ({
      views,
      alerts,
      alertLog,
      unread,
      badge,
      now,
      connected,
      loaded,
      error,
      setZone,
      stopAll,
      saveZone,
      markRead,
      markAllRead,
    }),
    [views, alerts, alertLog, unread, badge, now, connected, loaded, error, setZone, stopAll, saveZone, markRead, markAllRead]
  )

  return <FarmContext.Provider value={value}>{children}</FarmContext.Provider>
}

export function useFarm() {
  const ctx = React.useContext(FarmContext)
  if (!ctx) throw new Error("useFarm must be used inside <FarmProvider>")
  return ctx
}
