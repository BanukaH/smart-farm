"use client"

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"

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

const config = {
  avg: { label: "Average soil moisture", color: "var(--chart-1)" },
} satisfies ChartConfig

// Ranking zones by one measure: horizontal bars, one color, values on the bars.
export function ZoneCompareChart({
  rows,
  rangeLabel,
}: {
  rows: { zone: string; avg: number | null }[]
  rangeLabel: string
}) {
  const data = rows.map((r) => ({ zone: r.zone, avg: r.avg == null ? 0 : Math.round(r.avg * 10) / 10, has: r.avg != null }))
  const has = data.some((d) => d.has)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Zone comparison</CardTitle>
        <CardDescription>
          Average soil moisture per zone, last {rangeLabel}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!has ? (
          <p className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            No readings in this range yet.
          </p>
        ) : (
          <ChartContainer config={config} className="aspect-auto h-44 w-full">
            <BarChart data={data} layout="vertical" margin={{ left: 0, right: 40 }}>
              <CartesianGrid horizontal={false} strokeOpacity={0.5} />
              <YAxis
                dataKey="zone"
                type="category"
                tickLine={false}
                axisLine={false}
                width={56}
              />
              <XAxis type="number" domain={[0, 100]} hide />
              <ChartTooltip
                cursor={{ fillOpacity: 0.08 }}
                content={<ChartTooltipContent hideLabel />}
              />
              <Bar dataKey="avg" fill="var(--color-avg)" radius={[0, 4, 4, 0]} barSize={18}>
                <LabelList
                  dataKey="avg"
                  position="right"
                  className="fill-foreground text-xs"
                  formatter={(v: unknown) => `${Number(v).toFixed(0)}%`}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
