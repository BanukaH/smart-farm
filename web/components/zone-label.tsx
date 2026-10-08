import type { ZoneView } from "@/lib/farm"

// "🍅 Zone 1": the zone's chosen icon next to its name.
export function ZoneLabel({ view }: { view: ZoneView }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden className="text-xl leading-none">
        {view.config.icon}
      </span>
      {view.name}
    </span>
  )
}
