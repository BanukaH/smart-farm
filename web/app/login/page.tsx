"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { Brand } from "@/components/brand"
import { LoginForm } from "@/components/login-form"
import { useAuth } from "@/hooks/use-auth"

export default function LoginPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  React.useEffect(() => {
    if (!loading && user) router.replace("/dashboard")
  }, [loading, user, router])

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Brand className="self-center text-lg" />
        <LoginForm />
      </div>
    </div>
  )
}
