import type * as React from "react"
import {
  BellIcon,
  ChartAreaIcon,
  CloudSunIcon,
  DropletsIcon,
  FileTextIcon,
  LayoutDashboardIcon,
  MicroscopeIcon,
  SettingsIcon,
} from "lucide-react"

export const NAV = [
  { title: "Overview", href: "/dashboard", icon: LayoutDashboardIcon, bottom: true },
  { title: "Irrigation", href: "/dashboard/irrigation", icon: DropletsIcon, bottom: true },
  { title: "Analytics", href: "/dashboard/analytics", icon: ChartAreaIcon, bottom: true },
  { title: "Weather", href: "/dashboard/weather", icon: CloudSunIcon },
  { title: "Alerts", href: "/dashboard/alerts", icon: BellIcon, bottom: true },
  { title: "Reports", href: "/dashboard/reports", icon: FileTextIcon },
  { title: "Disease scanner", href: "/dashboard/scanner", icon: MicroscopeIcon },
  { title: "Settings", href: "/dashboard/settings", icon: SettingsIcon },
] as readonly {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  bottom?: boolean
}[]

export function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href)
}
