"use client"

import * as React from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Switch } from "@/components/ui/switch"
import { useFarm } from "@/hooks/use-farm"
import type { ZoneView } from "@/lib/farm"

// Switch + confirmation dialog (report 4.7.1: "safety by confirmation").
// Turning ON needs the node online; turning OFF is always allowed.
export function ZoneToggle({ view }: { view: ZoneView }) {
  const { setZone } = useFarm()
  const [pending, setPending] = React.useState<boolean | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const auto = view.config.mode === "auto"
  const disabled = auto || (!view.command && !view.online)
  const name = view.name

  async function confirm() {
    if (pending == null) return
    setBusy(true)
    setError(null)
    try {
      await setZone(view.zone.nodeId, pending)
      setPending(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send command")
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Switch
        checked={view.command}
        disabled={disabled}
        aria-label={`${name} on or off`}
        onCheckedChange={(checked) => {
          setError(null)
          setPending(checked)
        }}
      />
      <AlertDialog
        open={pending != null}
        onOpenChange={(open) => !open && setPending(null)}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending ? `Turn ${name} on?` : `Turn ${name} off?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending
                ? `This switches the relay and LED on ${view.zone.nodeId}.`
                : `This releases the relay and LED on ${view.zone.nodeId}.`}
              {error && (
                <span className="mt-2 block text-destructive">{error}</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirm} disabled={busy}>
              {busy ? "Sending..." : pending ? "Turn on" : "Turn off"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
