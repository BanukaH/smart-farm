import { GoogleGenAI, Type } from "@google/genai"

import { firebaseConfig } from "@/lib/firebase-config"
import { PROMPT, type ScanResult } from "@/lib/scan"

export const runtime = "nodejs"

const MAX_BYTES = 4 * 1024 * 1024
const TYPES = ["image/jpeg", "image/png", "image/webp"]

function fail(status: number, error: string) {
  return Response.json({ error }, { status })
}

// Only signed-in users may spend the Gemini quota: verify the Firebase ID token.
async function isSignedIn(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) return false
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token }),
    }
  )
  return res.ok
}

export async function POST(req: Request) {
  if (!(await isSignedIn(req))) return fail(401, "Please sign in again.")

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return fail(503, "The scanner isn't set up yet. Add GEMINI_API_KEY to web/.env.local and restart the server.")
  }

  let file: File | null = null
  try {
    const form = await req.formData()
    const f = form.get("image")
    file = f instanceof File ? f : null
  } catch {
    return fail(400, "Could not read the upload.")
  }
  if (!file) return fail(400, "No image was sent.")
  if (!TYPES.includes(file.type)) return fail(400, "Use a JPEG, PNG or WebP photo.")
  if (file.size > MAX_BYTES) return fail(413, "That photo is too large. Try a smaller one.")

  const data = Buffer.from(await file.arrayBuffer()).toString("base64")
  const ai = new GoogleGenAI({ apiKey })

  try {
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ inlineData: { mimeType: file.type, data } }, { text: PROMPT }],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            plant: { type: Type.STRING },
            disease: { type: Type.STRING },
            healthy: { type: Type.BOOLEAN },
            confidence: { type: Type.NUMBER },
            severity: { type: Type.STRING, enum: ["none", "low", "medium", "high"] },
            symptoms: { type: Type.STRING },
            advice: { type: Type.STRING },
            recheckDays: { type: Type.NUMBER },
          },
          required: ["plant", "disease", "healthy", "confidence", "severity", "symptoms", "advice", "recheckDays"],
        },
      },
    })

    const parsed = JSON.parse(response.text ?? "") as ScanResult
    const result: ScanResult = {
      ...parsed,
      confidence: Math.min(100, Math.max(0, Math.round(parsed.confidence))),
      recheckDays: Math.max(1, Math.round(parsed.recheckDays)),
    }
    return Response.json(result)
  } catch (e) {
    console.error("scan failed", e)
    return fail(502, "The AI service couldn't read this photo. Try again with a clearer picture.")
  }
}
