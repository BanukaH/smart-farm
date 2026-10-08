"use client"

import * as React from "react"
import { AlertTriangleIcon, CheckCheckIcon, CheckCircle2Icon, InfoIcon } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useFarm } from "@/hooks/use-farm"
import { describeAlert, timeAgo } from "@/lib/alerts"
import { ZONES } from "@/lib/farm"
import { cn } from "@/lib/utils"

export default function AlertsPage() {
  const { alerts, alertLog, unread, views, now, loaded, markRead, markAllRead } =
    useFarm()
  const names = React.useMemo(
    () => Object.fromEntries(ZONES.map((z, i) => [z.nodeId, views[i].name])),
    [views]
  )

  return (
    <>
      <PageHeader
        title="Alerts"
        description="What needs attention now, and what your nodes reported earlier."
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Active now</h2>
        {loaded && alerts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
              <CheckCircle2Icon className="size-9 text-primary" />
              <p className="font-medium">All zones look healthy</p>
              <p className="text-sm text-muted-foreground">
                No low moisture, heat, offline or sensor problems right now.
              </p>
            </CardContent>
          </Card>
        ) : (
          alerts.map((a) => (
            <Card key={a.id} size="sm">
              <CardContent className="flex items-start gap-3">
                <SeverityIcon severity={a.severity} />
                <p className="flex-1 text-sm">{a.message}</p>
              </CardContent>
            </Card>
          ))
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium">
            History{unread > 0 && <span className="ml-2 text-sm text-muted-foreground">{unread} unread</span>}
          </h2>
          <Button size="sm" variant="outline" disabled={unread === 0} onClick={() => markAllRead()}>
            <CheckCheckIcon />
            Mark all read
          </Button>
        </div>

        {alertLog.length === 0 ? (
          <p className="rounded-xl border bg-muted/50 p-3 text-sm text-muted-foreground">
            Nothing logged yet. Nodes save an alert when soil gets too dry, a
            sensor fails or it gets too hot.
          </p>
        ) : (
          alertLog.map((a) => (
            <Card key={a.id} size="sm" className={cn(a.read && "opacity-70")}>
              <CardContent className="flex items-start gap-3">
                <SeverityIcon severity={a.severity ?? "critical"} />
                <div className="flex flex-1 flex-col gap-1">
                  <p className="text-sm">{describeAlert(a, names)}</p>
                  <p className="text-xs text-muted-foreground">
                    {timeAgo(a.ts, now)} · {new Date(a.ts).toLocaleString()}
                  </p>
                </div>
                {a.read ? (
                  <Badge variant="outline">Read</Badge>
                ) : (
                  <Button size="xs" variant="outline" onClick={() => markRead(a.id)}>
                    Mark read
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </section>
    </>
  )
}

function SeverityIcon({ severity }: { severity: "critical" | "warning" }) {
  return (
    <span
      className={cn(
        "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
        severity === "critical"
          ? "bg-destructive/10 text-destructive"
          : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
      )}
    >
      {severity === "critical" ? (
        <AlertTriangleIcon className="size-4" />
      ) : (
        <InfoIcon className="size-4" />
      )}
    </span>
  )
}
