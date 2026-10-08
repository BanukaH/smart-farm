"use client"

import * as React from "react"

import { loadHistory } from "@/lib/history-api"
import { RANGES, type HistoryRecord, type RangeId } from "@/lib/history"

const REFRESH_MS = 60_000

export type HistoryState = {
  records: Record<string, HistoryRecord[]>
  since: number
  until: number
  loading: boolean
  error: string | null
}

// Loads each node's history for the chosen range and refreshes once a minute.
export function useHistory(range: RangeId): HistoryState {
  const [state, setState] = React.useState<HistoryState>({
    records: {},
    since: 0,
    until: 0,
    loading: true,
    error: null,
  })

  React.useEffect(() => {
    let cancelled = false
    const ms = RANGES.find((r) => r.id === range)!.ms

    async function load() {
      const until = Date.now()
      const since = until - ms
      try {
        const records = await loadHistory(since)
        if (!cancelled) setState({ records, since, until, loading: false, error: null })
      } catch (e) {
        if (!cancelled)
          setState((s) => ({
            ...s,
            loading: false,
            error: e instanceof Error ? e.message : "Could not load history",
          }))
      }
    }

    load()
    const t = setInterval(load, REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [range])

  return state
}
