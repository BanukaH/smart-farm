"use client"

import * as React from "react"
import { OctagonXIcon } from "lucide-react"

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
import { Button } from "@/components/ui/button"
import { useFarm } from "@/hooks/use-farm"

export function StopAllButton({ className }: { className?: string }) {
  const { stopAll, views } = useFarm()
  const [open, setOpen] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const anyOn = views.some((v) => v.command || v.reading?.relayOn)

  async function confirm() {
    setBusy(true)
    setError(null)
    try {
      await stopAll()
      setOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send command")
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button
        variant="destructive"
        className={className}
        onClick={() => setOpen(true)}
        disabled={!anyOn}
      >
        <OctagonXIcon />
        Emergency stop
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Stop all zones?</AlertDialogTitle>
            <AlertDialogDescription>
              This turns off every zone immediately and switches them all to manual, so no zone restarts by itself.
              {error && (
                <span className="mt-2 block text-destructive">{error}</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={confirm}
              disabled={busy}
            >
              {busy ? "Stopping..." : "Stop all"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
