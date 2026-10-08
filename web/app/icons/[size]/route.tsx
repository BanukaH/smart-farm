import { ImageResponse } from "next/og"

const ALLOWED = [180, 192, 512]

// Generates the app icon (a sprout on green) at the requested size.
// ?maskable=1 adds extra padding so Android's circular mask doesn't clip it.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size: raw } = await params
  const size = Number(raw)
  if (!ALLOWED.includes(size)) return new Response("Not found", { status: 404 })

  const maskable = new URL(request.url).searchParams.has("maskable")
  const glyph = Math.round(size * (maskable ? 0.5 : 0.62))

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#2f7d4f",
          borderRadius: maskable ? 0 : Math.round(size * 0.22),
        }}
      >
        <svg
          width={glyph}
          height={glyph}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M7 20h10" />
          <path d="M10 20c5.5-2.5.8-6.4 3-10" />
          <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z" />
          <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z" />
        </svg>
      </div>
    ),
    { width: size, height: size }
  )
}
