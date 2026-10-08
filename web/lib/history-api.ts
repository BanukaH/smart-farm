import { get, orderByChild, query, ref, startAt } from "firebase/database"

import { db } from "@/lib/firebase"
import { ZONES } from "@/lib/farm"
import type { HistoryRecord } from "@/lib/history"

// All nodes' history records newer than `since`, oldest first, keyed by node id.
export async function loadHistory(since: number): Promise<Record<string, HistoryRecord[]>> {
  const entries = await Promise.all(
    ZONES.map(async (z) => {
      const snap = await get(
        query(ref(db, `history/${z.nodeId}`), orderByChild("ts"), startAt(since))
      )
      const list: HistoryRecord[] = []
      snap.forEach((child) => {
        list.push(child.val() as HistoryRecord)
      })
      list.sort((a, b) => a.ts - b.ts)
      return [z.nodeId, list] as const
    })
  )
  return Object.fromEntries(entries)
}
