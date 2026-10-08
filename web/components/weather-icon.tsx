import {
  CloudDrizzleIcon,
  CloudFogIcon,
  CloudIcon,
  CloudLightningIcon,
  CloudRainIcon,
  CloudSnowIcon,
  CloudSunIcon,
  MoonIcon,
  SunIcon,
} from "lucide-react"

import { describeCode } from "@/lib/weather"

export function WeatherIcon({
  code,
  isDay = true,
  className,
}: {
  code: number
  isDay?: boolean
  className?: string
}) {
  const { kind } = describeCode(code)
  const Icon =
    kind === "clear"
      ? isDay
        ? SunIcon
        : MoonIcon
      : kind === "partly"
        ? CloudSunIcon
        : kind === "fog"
          ? CloudFogIcon
          : kind === "drizzle"
            ? CloudDrizzleIcon
            : kind === "rain"
              ? CloudRainIcon
              : kind === "snow"
                ? CloudSnowIcon
                : kind === "storm"
                  ? CloudLightningIcon
                  : CloudIcon
  return <Icon className={className} aria-hidden />
}
