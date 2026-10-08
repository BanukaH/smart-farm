"use client"

import * as React from "react"

import { HistoryChart } from "@/components/history-chart"
import { PageHeader } from "@/components/page-header"
import { ZoneCompareChart } from "@/components/zone-compare-chart"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useHistory } from "@/hooks/use-history"
import { ZONES } from "@/lib/farm"
import { bucketize, RANGES, stats, type RangeId } from "@/lib/history"
import { useFarm } from "@/hooks/use-farm"

export default function AnalyticsPage() {
  const [range, setRange] = React.useState<RangeId>("24h")
  const { records, since, until, loading, error } = useHistory(range)
  const { views } = useFarm()
  const rangeLabel = RANGES.find((r) => r.id === range)!.label

  const series = React.useMemo(
    () =>
      Object.fromEntries(
        ZONES.map((z) => [z.nodeId, bucketize(records[z.nodeId] ?? [], since, until)])
      ),
    [records, since, until]
  )

  // Zone 1 carries the shared DHT22 and BH1750.
  const climate = series[ZONES[0].nodeId] ?? []
  const total = Object.values(records).reduce((n, r) => n + r.length, 0)

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Sensor history from your nodes, one reading per minute."
      />

      <div className="flex flex-wrap gap-2" role="group" aria-label="Time range">
        {RANGES.map((r) => (
          <Button
            key={r.id}
            size="sm"
            variant={range === r.id ? "default" : "outline"}
            aria-pressed={range === r.id}
            onClick={() => setRange(r.id)}
          >
            {r.label}
          </Button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          Can&apos;t load history: {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 rounded-4xl" />
          ))}
        </div>
      ) : (
        <>
          {total === 0 && !error && (
            <div className="rounded-xl border bg-muted/50 p-3 text-sm text-muted-foreground">
              No history yet. Nodes save one reading a minute, so charts fill in
              after the nodes have run for a few minutes with the latest firmware.
            </div>
          )}

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-medium">Soil moisture by zone</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {ZONES.map((z, i) => (
                <HistoryChart
                  key={z.id}
                  title={`${views[i].config.icon} ${views[i].name}`}
                  description={z.nodeId}
                  data={series[z.nodeId] ?? []}
                  metric="soilMoisture"
                  unit="%"
                  label="Soil moisture"
                  since={since}
                  until={until}
                  domain={[0, 100]}
                  threshold={{
                    value: views[i].config.soilAlert,
                    label: `Alert ${views[i].config.soilAlert}%`,
                  }}
                />
              ))}
            </div>
          </section>

          <ZoneCompareChart
            rangeLabel={rangeLabel}
            rows={ZONES.map((z, i) => ({
              zone: views[i].name,
              avg: stats(records[z.nodeId] ?? [], "soilMoisture")?.avg ?? null,
            }))}
          />

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-medium">Climate</h2>
            <p className="-mt-2 text-sm text-muted-foreground">
              Shared sensors on {views[0].name}.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <HistoryChart
                title="Temperature"
                data={climate}
                metric="temperature"
                unit="°C"
                label="Temperature"
                since={since}
                until={until}
                threshold={{
                  value: views[0].config.tempAlert,
                  label: `Alert ${views[0].config.tempAlert}°C`,
                }}
              />
              <HistoryChart
                title="Humidity"
                data={climate}
                metric="humidity"
                unit="%"
                label="Humidity"
                since={since}
                until={until}
                domain={[0, 100]}
              />
              <HistoryChart
                title="Light"
                data={climate}
                metric="light"
                unit=" lx"
                label="Light"
                since={since}
                until={until}
                emptyText="No light readings. The BH1750 sensor isn't fitted yet."
                className="md:col-span-2"
              />
            </div>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Summary table</CardTitle>
              <CardDescription>
                Soil moisture, last {rangeLabel}
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Zone</th>
                    <th className="py-2 pr-4 text-right font-medium">Min</th>
                    <th className="py-2 pr-4 text-right font-medium">Avg</th>
                    <th className="py-2 pr-4 text-right font-medium">Max</th>
                    <th className="py-2 text-right font-medium">Readings</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {ZONES.map((z, i) => {
                    const s = stats(records[z.nodeId] ?? [], "soilMoisture")
                    return (
                      <tr key={z.id} className="border-t">
                        <td className="py-2 pr-4 font-medium">{views[i].name}</td>
                        <td className="py-2 pr-4 text-right">{s ? `${s.min.toFixed(0)}%` : "--"}</td>
                        <td className="py-2 pr-4 text-right">{s ? `${s.avg.toFixed(0)}%` : "--"}</td>
                        <td className="py-2 pr-4 text-right">{s ? `${s.max.toFixed(0)}%` : "--"}</td>
                        <td className="py-2 text-right">{s ? s.count : 0}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </>
  )
}
