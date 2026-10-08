"use client"

import * as React from "react"

import { RangeField } from "@/components/range-field"
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
import type { ZoneView } from "@/lib/farm"

// Manual / Auto switch plus the auto thresholds for one zone (FR 8).
// In Auto the node itself turns the relay on below "low" and off at "high".
export function ZoneMode({ view }: { view: ZoneView }) {
  const { saveZone } = useFarm()
  const auto = view.config.mode === "auto"

  const [low, setLow] = React.useState(view.config.soilLow)
  const [high, setHigh] = React.useState(view.config.soilHigh)
  const [confirm, setConfirm] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Follow the saved values until the user starts editing a different pair.
  const savedKey = `${view.config.soilLow}/${view.config.soilHigh}`
  const [seen, setSeen] = React.useState(savedKey)
  if (seen !== savedKey) {
    setSeen(savedKey)
    setLow(view.config.soilLow)
    setHigh(view.config.soilHigh)
  }

  const dirty = low !== view.config.soilLow || high !== view.config.soilHigh

  async function run(patch: Parameters<typeof saveZone>[1]) {
    setBusy(true)
    setError(null)
    try {
      await saveZone(view.zone.nodeId, patch)
      setConfirm(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1"
        role="group"
        aria-label={`${view.name} mode`}
      >
        <Button
          size="sm"
          variant={auto ? "ghost" : "default"}
          aria-pressed={!auto}
          disabled={busy}
          onClick={() => auto && run({ mode: "manual" })}
        >
          Manual
        </Button>
        <Button
          size="sm"
          variant={auto ? "default" : "ghost"}
          aria-pressed={auto}
          disabled={busy}
          onClick={() => !auto && setConfirm(true)}
        >
          Auto
        </Button>
      </div>

      {auto ? (
        <p className="text-xs text-muted-foreground">
          The node turns this zone on when soil moisture falls below{" "}
          {view.config.soilLow}% and off at {view.config.soilHigh}%. It keeps
          working if the internet drops, and stops after 30 minutes.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          You switch this zone on and off yourself.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <RangeField
          label="Turn on below"
          unit="%"
          min={0}
          max={95}
          value={low}
          onChange={(v) => {
            setLow(v)
            if (high < v + 5) setHigh(Math.min(100, v + 5))
          }}
        />
        <RangeField
          label="Turn off at"
          unit="%"
          min={5}
          max={100}
          value={high}
          onChange={(v) => {
            setHigh(v)
            if (low > v - 5) setLow(Math.max(0, v - 5))
          }}
        />
      </div>
      {dirty && (
        <div className="flex items-center gap-2">
          <Button size="sm" disabled={busy} onClick={() => run({ soilLow: low, soilHigh: high })}>
            Save thresholds
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setLow(view.config.soilLow)
              setHigh(view.config.soilHigh)
            }}
          >
            Reset
          </Button>
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Switch {view.name} to automatic?</AlertDialogTitle>
            <AlertDialogDescription>
              The node will turn this zone on when soil moisture is below {low}%
              and off at {high}%. If the soil is already dry it starts
              straight away.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={() => run({ mode: "auto", soilLow: low, soilHigh: high })}
            >
              {busy ? "Saving..." : "Switch to auto"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
