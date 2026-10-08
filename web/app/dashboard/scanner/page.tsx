"use client"

import * as React from "react"
import {
  CameraIcon,
  ImageIcon,
  Loader2Icon,
  MicroscopeIcon,
  RotateCcwIcon,
} from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { auth } from "@/lib/firebase"
import { resizeImage } from "@/lib/resize-image"
import { DETECTABLE, type ScanResult } from "@/lib/scan"
import { cn } from "@/lib/utils"

const SEVERITY: Record<ScanResult["severity"], { label: string; className: string }> = {
  none: { label: "No problem", className: "bg-primary/15 text-primary" },
  low: { label: "Low severity", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  medium: { label: "Medium severity", className: "bg-orange-500/15 text-orange-700 dark:text-orange-400" },
  high: { label: "High severity", className: "bg-destructive/10 text-destructive" },
}

export default function ScannerPage() {
  const cameraRef = React.useRef<HTMLInputElement>(null)
  const galleryRef = React.useRef<HTMLInputElement>(null)
  const [photo, setPhoto] = React.useState<{ blob: Blob; url: string } | null>(null)
  const [result, setResult] = React.useState<ScanResult | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    return () => {
      if (photo) URL.revokeObjectURL(photo.url)
    }
  }, [photo])

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = "" // allow picking the same file again
    if (!file) return
    setError(null)
    setResult(null)
    try {
      const blob = await resizeImage(file)
      setPhoto({ blob, url: URL.createObjectURL(blob) })
    } catch {
      setError("That file couldn't be opened as a photo.")
    }
  }

  async function scan() {
    if (!photo) return
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const token = await auth.currentUser?.getIdToken()
      const form = new FormData()
      form.append("image", photo.blob, "leaf.jpg")
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? "Scan failed")
      setResult(body as ScanResult)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed")
    } finally {
      setBusy(false)
    }
  }

  function reset() {
    setPhoto(null)
    setResult(null)
    setError(null)
  }

  return (
    <>
      <PageHeader
        title="Disease scanner"
        description="Take or choose a photo of a leaf and AI will look for common diseases."
      />

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={onPick} />
      <input ref={galleryRef} type="file" accept="image/*" hidden onChange={onPick} />

      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-6">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo.url}
              alt="Leaf photo to scan"
              className="max-h-80 w-full rounded-2xl bg-muted object-contain"
            />
          ) : (
            <button
              type="button"
              onClick={() => galleryRef.current?.click()}
              className="flex h-52 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-muted-foreground transition-colors hover:bg-muted/50"
            >
              <CameraIcon className="size-10" />
              <span className="text-sm font-medium">Tap to select a leaf photo</span>
              <span className="text-xs">Camera or gallery</span>
            </button>
          )}

          <div className="grid w-full grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => cameraRef.current?.click()} disabled={busy}>
              <CameraIcon />
              Camera
            </Button>
            <Button variant="outline" onClick={() => galleryRef.current?.click()} disabled={busy}>
              <ImageIcon />
              Gallery
            </Button>
          </div>

          <div className="flex w-full gap-2">
            <Button size="lg" className="flex-1" onClick={scan} disabled={!photo || busy}>
              {busy ? <Loader2Icon className="animate-spin" /> : <MicroscopeIcon />}
              {busy ? "Scanning..." : "Scan leaf"}
            </Button>
            {photo && (
              <Button size="lg" variant="ghost" onClick={reset} disabled={busy} aria-label="Clear photo">
                <RotateCcwIcon />
              </Button>
            )}
          </div>

          {error && (
            <p role="alert" className="w-full rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2 text-xl">
              {result.disease}
              <Badge variant="secondary" className={cn(SEVERITY[result.severity]?.className)}>
                {SEVERITY[result.severity]?.label ?? result.severity}
              </Badge>
            </CardTitle>
            <CardDescription>{result.plant}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Confidence</span>
                <span className="font-medium tabular-nums">{result.confidence}%</span>
              </div>
              <Progress value={result.confidence} />
            </div>
            <Detail label="What the AI sees" text={result.symptoms} />
            <Detail label="Suggested treatment" text={result.advice} />
            <p className="text-sm text-muted-foreground">
              Scan again in about {result.recheckDays} {result.recheckDays === 1 ? "day" : "days"}.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Detectable diseases</CardTitle>
          <CardDescription>
            The AI is asked to pick from this list. Its answers are advice, not a diagnosis. Confirm with an
            agricultural officer before treating.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {DETECTABLE.map((d) => (
            <div key={d.name} className="flex items-center gap-2.5 text-sm">
              <span className={cn("size-2.5 rounded-full", d.dot)} />
              {d.name}
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  )
}

function Detail({ label, text }: { label: string; text: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</span>
      <p className="text-sm">{text}</p>
    </div>
  )
}
