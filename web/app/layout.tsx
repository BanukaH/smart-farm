import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

import { SwRegister } from "@/components/sw-register"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AuthProvider } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: { default: "Smart Farm", template: "%s | Smart Farm" },
  description:
    "Monitor soil moisture and control four farm zones from your phone.",
  applicationName: "Smart Farm",
  appleWebApp: { capable: true, title: "Smart Farm", statusBarStyle: "default" },
  icons: { apple: "/icons/180" },
}

export const viewport: Viewport = {
  themeColor: "#2f7d4f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={cn("h-full antialiased font-sans", inter.variable)}>
      <body className="min-h-full flex flex-col bg-background">
        <AuthProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </AuthProvider>
        <SwRegister />
      </body>
    </html>
  )
}
