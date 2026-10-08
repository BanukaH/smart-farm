// Shared by the scanner page and the /api/scan route.

export type ScanResult = {
  plant: string
  disease: string
  healthy: boolean
  confidence: number // 0-100
  severity: "none" | "low" | "medium" | "high"
  symptoms: string
  advice: string
  recheckDays: number
}

// The conditions the report lists as detectable (Section 4.7.2 / disease scanner screen).
export const DETECTABLE = [
  { name: "Early blight", dot: "bg-amber-600" },
  { name: "Bacterial blight", dot: "bg-red-500" },
  { name: "Powdery mildew", dot: "bg-slate-300" },
  { name: "Leaf rust", dot: "bg-orange-500" },
  { name: "Yellow mosaic virus", dot: "bg-yellow-400" },
  { name: "Downy mildew", dot: "bg-lime-500" },
  { name: "Late blight", dot: "bg-blue-500" },
  { name: "Healthy leaf", dot: "bg-primary" },
] as const

export const PROMPT = `You are an expert plant pathologist helping small-scale farmers in Sri Lanka.
Look at this photo of a plant leaf and assess its health.

Choose "disease" from: Early blight, Bacterial blight, Powdery mildew, Leaf rust, Yellow mosaic virus, Downy mildew, Late blight, Healthy leaf. If the leaf clearly shows a different problem, name it briefly. If the photo is not a plant leaf or is too unclear to judge, use "Unclear image".

Rules:
- Be honest about uncertainty: lower "confidence" when the photo is blurry, dark or shows several problems.
- "healthy" is true only when the disease is "Healthy leaf".
- "advice" is practical treatment advice in at most three short sentences, using steps a small farmer can do.
- "symptoms" is one short sentence describing what you see on the leaf.
- "recheckDays" is when to photograph the plant again.`
