"use client"

import * as React from "react"

// Registers the service worker in production only, so dev never serves stale caches.
export function SwRegister() {
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production") return
    if (!("serviceWorker" in navigator)) return
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch(() => {})
  }, [])
  return null
}
