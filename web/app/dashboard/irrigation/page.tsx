"use client"

import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { StopAllButton } from "@/components/stop-all-button"
import { ZoneLabel } from "@/components/zone-label"
import { ZoneMode } from "@/components/zone-mode"
import { ZoneToggle } from "@/components/zone-toggle"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useFarm } from "@/hooks/use-farm"

export default function IrrigationPage() {
  const { views } = useFarm()

  return (
    <>
      <PageHeader
        title="Irrigation"
        description="Run each zone by hand, or let its node water automatically."
        actions={<StopAllButton />}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {views.map((v) => (
          <Card key={v.zone.id}>
            <CardHeader>
              <CardTitle>
                <ZoneLabel view={v} />
              </CardTitle>
              <CardDescription className="text-xs">
                <span className="font-mono">{v.zone.nodeId}</span>
                {v.reading?.soilMoisture != null &&
                  ` · soil ${v.reading.soilMoisture.toFixed(0)}%`}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="flex items-center justify-between gap-3">
                <StatusBadge status={v.status} />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {v.config.mode === "auto" ? "Controlled by node" : "Manual switch"}
                  <ZoneToggle view={v} />
                </div>
              </div>
              <ZoneMode view={v} />
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Demo hardware: each zone drives a relay and an LED. No water pump is
        connected. In manual mode a zone can only be turned on while its node
        is online. Emergency stop turns every zone off and sets them to manual.
      </p>
    </>
  )
}
