"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { MenuIcon } from "lucide-react"

import { isActive, NAV } from "@/components/nav"
import { useSidebar } from "@/components/ui/sidebar"
import { useFarm } from "@/hooks/use-farm"
import { cn } from "@/lib/utils"

// Thumb-reach navigation for phones; the sidebar covers desktop.
export function BottomNav() {
  const pathname = usePathname()
  const { badge } = useFarm()
  const { setOpenMobile } = useSidebar()

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-5">
        {NAV.filter((n) => n.bottom).map((item) => {
          const active = isActive(pathname, item.href)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className="size-5" />
                {item.title}
                {item.title === "Alerts" && badge > 0 && (
                  <span className="absolute top-1.5 left-1/2 ml-2 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-4 text-white">
                    {badge}
                  </span>
                )}
              </Link>
            </li>
          )
        })}
        <li>
          <button
            type="button"
            onClick={() => setOpenMobile(true)}
            className="flex w-full flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground"
          >
            <MenuIcon className="size-5" />
            More
          </button>
        </li>
      </ul>
    </nav>
  )
}
