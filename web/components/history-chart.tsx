"use client"

import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { Point } from "@/lib/history"

type Metric = "soilMoisture" | "temperature" | "humidity" | "light"

function timeLabel(ts: number, spanMs: number) {
  const d = new Date(ts)
  if (spanMs > 2 * 86_400_000)
    return d.toLocaleDateString([], { weekday: "short", day: "numeric" })
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

// One metric, one series, one green: the title names it so no legend is needed.
export function HistoryChart({
  title,
  description,
  data,
  metric,
  unit,
  label,
  since,
  until,
  domain,
  threshold,
  emptyText = "No readings in this range yet.",
  className,
}: {
  title: string
  description?: string
  data: Point[]
  metric: Metric
  unit: string
  label: string
  since: number
  until: number
  domain?: [number, number]
  threshold?: { value: number; label: string }
  emptyText?: string
  className?: string
}) {
  const config = {
    [metric]: { label, color: "var(--chart-1)" },
  } satisfies ChartConfig
  const span = until - since
  const has = data.some((p) => p[metric] != null)

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {!has ? (
          <p className="flex h-40 items-center justify-center text-center text-sm text-muted-foreground">
            {emptyText}
          </p>
        ) : (
          <ChartContainer config={config} className="aspect-auto h-44 w-full sm:h-52">
            <AreaChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
              <defs>
                <linearGradient id={`fill-${metric}-${title}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={`var(--color-${metric})`} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={`var(--color-${metric})`} stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeOpacity={0.5} />
              <XAxis
                dataKey="ts"
                type="number"
                scale="time"
                domain={[since, until]}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={36}
                tickFormatter={(v: number) => timeLabel(v, span)}
              />
              <YAxis
                width={44}
                tickLine={false}
                axisLine={false}
                domain={domain ?? ["auto", "auto"]}
                tickFormatter={(v: number) => `${Math.round(v)}${unit}`}
              />
              {threshold && (
                <ReferenceLine
                  y={threshold.value}
                  stroke="var(--muted-foreground)"
                  strokeOpacity={0.7}
                  label={{
                    value: threshold.label,
                    position: "insideTopRight",
                    fill: "var(--muted-foreground)",
                    fontSize: 11,
                  }}
                />
              )}
              <ChartTooltip
                cursor={{ strokeOpacity: 0.4 }}
                content={
                  <ChartTooltipContent
                    indicator="line"
                    labelFormatter={(_, items) => {
                      const ts = items?.[0]?.payload?.ts as number | undefined
                      return ts
                        ? new Date(ts).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""
                    }}
                    formatter={(value) => (
                      <span className="font-medium tabular-nums">
                        {label}: {Number(value).toFixed(1)}
                        {unit}
                      </span>
                    )}
                  />
                }
              />
              <Area
                dataKey={metric}
                type="monotone"
                stroke={`var(--color-${metric})`}
                strokeWidth={2}
                fill={`url(#fill-${metric}-${title})`}
                connectNulls
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
