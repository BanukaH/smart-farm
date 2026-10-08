"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { IconPicker } from "@/components/icon-picker"
import { PageHeader } from "@/components/page-header"
import { RangeField } from "@/components/range-field"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/use-auth"
import { useFarm } from "@/hooks/use-farm"
import type { ZoneView } from "@/lib/farm"

export default function SettingsPage() {
  const { user, signOut } = useAuth()
  const { views } = useFarm()
  const router = useRouter()

  return (
    <>
      <PageHeader
        title="Settings"
        description="Name your zones and set the alert levels for each one."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {views.map((v) => (
          <ZoneEditor key={v.zone.id} view={v} />
        ))}
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">
        Real thresholds depend on the crop and soil. Ask an agricultural
        officer. Zones are tied to their boards, so you can rename them but not
        add new ones.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>{user?.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={async () => {
              await signOut()
              router.replace("/login")
            }}
          >
            Sign out
          </Button>
        </CardContent>
      </Card>
    </>
  )
}

function ZoneEditor({ view }: { view: ZoneView }) {
  const { saveZone } = useFarm()
  const hasTemp = view.zone.id === 1 // only zone 1 carries the DHT22

  const [name, setName] = React.useState(view.name)
  const [crop, setCrop] = React.useState(view.config.crop)
  const [icon, setIcon] = React.useState(view.config.icon)
  const [soilAlert, setSoilAlert] = React.useState(view.config.soilAlert)
  const [tempAlert, setTempAlert] = React.useState(view.config.tempAlert)
  const [busy, setBusy] = React.useState(false)
  const [state, setState] = React.useState<"idle" | "saved" | "error">("idle")

  // Pick up saved values that arrive after first render (data loads async).
  const savedKey = [view.name, view.config.crop, view.config.icon, view.config.soilAlert, view.config.tempAlert].join("|")
  const [seen, setSeen] = React.useState(savedKey)
  if (seen !== savedKey) {
    setSeen(savedKey)
    setName(view.name)
    setCrop(view.config.crop)
    setIcon(view.config.icon)
    setSoilAlert(view.config.soilAlert)
    setTempAlert(view.config.tempAlert)
  }

  const dirty =
    name.trim() !== view.name ||
    crop.trim() !== view.config.crop ||
    icon !== view.config.icon ||
    soilAlert !== view.config.soilAlert ||
    tempAlert !== view.config.tempAlert

  async function save() {
    setBusy(true)
    setState("idle")
    try {
      await saveZone(view.zone.nodeId, {
        name: name.trim() || view.zone.name,
        crop: crop.trim(),
        icon,
        soilAlert,
        ...(hasTemp ? { tempAlert } : {}),
      })
      setState("saved")
    } catch {
      setState("error")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span aria-hidden className="mr-2 text-xl">{icon}</span>
          {view.zone.name}
        </CardTitle>
        <CardDescription className="font-mono text-xs">
          {view.zone.nodeId}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Name
            <Input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Crop
            <Input
              value={crop}
              maxLength={40}
              placeholder="e.g. Rice"
              onChange={(e) => setCrop(e.target.value)}
            />
          </label>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Icon</span>
          <IconPicker value={icon} onChange={setIcon} />
        </div>
        <RangeField
          label="Low soil moisture alert"
          hint="Alert when soil moisture falls below"
          unit="%"
          min={0}
          max={100}
          value={soilAlert}
          onChange={setSoilAlert}
        />
        {hasTemp && (
          <RangeField
            label="High temperature alert"
            hint="Alert when temperature rises above"
            unit="°C"
            min={20}
            max={50}
            value={tempAlert}
            onChange={setTempAlert}
          />
        )}
        <div className="flex items-center gap-3">
          <Button disabled={!dirty || busy} onClick={save}>
            {busy ? "Saving..." : "Save"}
          </Button>
          {state === "saved" && !dirty && (
            <span className="text-sm text-primary">Saved</span>
          )}
          {state === "error" && (
            <span className="text-sm text-destructive">Could not save</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
