"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { FirebaseError } from "firebase/app"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"

type Mode = "signin" | "register" | "reset"

const COPY: Record<Mode, { title: string; description: string; button: string }> = {
  signin: {
    title: "Welcome back",
    description: "Sign in to monitor and control your zones",
    button: "Sign in",
  },
  register: {
    title: "Create your account",
    description: "Use an email and a password of at least 6 characters",
    button: "Create account",
  },
  reset: {
    title: "Reset your password",
    description: "We will email you a link to choose a new one",
    button: "Send reset link",
  },
}

function friendlyError(e: unknown) {
  if (e instanceof FirebaseError) {
    switch (e.code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "Wrong email or password. Please try again."
      case "auth/email-already-in-use":
        return "This email already has an account. Sign in instead."
      case "auth/weak-password":
        return "Password is too weak. Use at least 6 characters."
      case "auth/invalid-email":
        return "That email address doesn't look right."
      case "auth/too-many-requests":
        return "Too many attempts. Wait a minute and try again."
      case "auth/network-request-failed":
        return "No network connection."
      default:
        return e.message
    }
  }
  return "Something went wrong. Please try again."
}

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { signIn, register, resetPassword } = useAuth()
  const router = useRouter()
  const [mode, setMode] = React.useState<Mode>("signin")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [confirm, setConfirm] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [notice, setNotice] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
    setNotice(null)
    setPassword("")
    setConfirm("")
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    if (mode === "register" && password !== confirm) {
      setError("Passwords don't match.")
      return
    }
    setBusy(true)
    try {
      if (mode === "signin") {
        await signIn(email.trim(), password)
        router.replace("/dashboard")
        return
      }
      if (mode === "register") {
        await register(email.trim(), password)
        router.replace("/dashboard")
        return
      }
      await resetPassword(email.trim())
      setNotice(
        "If an account exists for that email, a reset link is on its way. Check your inbox and spam folder."
      )
    } catch (err) {
      // Don't reveal whether an account exists when resetting.
      if (mode === "reset" && err instanceof FirebaseError && err.code === "auth/user-not-found") {
        setNotice(
          "If an account exists for that email, a reset link is on its way. Check your inbox and spam folder."
        )
      } else {
        setError(friendlyError(err))
      }
    }
    setBusy(false)
  }

  const copy = COPY[mode]

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{copy.title}</CardTitle>
          <CardDescription>{copy.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Field>
              {mode !== "reset" && (
                <Field>
                  <div className="flex items-center">
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    {mode === "signin" && (
                      <button
                        type="button"
                        onClick={() => switchMode("reset")}
                        className="ml-auto text-sm underline-offset-4 hover:underline"
                      >
                        Forgot your password?
                      </button>
                    )}
                  </div>
                  <Input
                    id="password"
                    type="password"
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    minLength={mode === "register" ? 6 : undefined}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </Field>
              )}
              {mode === "register" && (
                <Field>
                  <FieldLabel htmlFor="confirm">Confirm password</FieldLabel>
                  <Input
                    id="confirm"
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                  />
                </Field>
              )}
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              {notice && (
                <p role="status" className="text-sm text-primary">
                  {notice}
                </p>
              )}
              <Field>
                <Button type="submit" disabled={busy}>
                  {busy ? "Please wait..." : copy.button}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  {mode === "signin" ? (
                    <>
                      New here?{" "}
                      <button
                        type="button"
                        onClick={() => switchMode("register")}
                        className="text-foreground underline underline-offset-4"
                      >
                        Create an account
                      </button>
                    </>
                  ) : (
                    <>
                      Back to{" "}
                      <button
                        type="button"
                        onClick={() => switchMode("signin")}
                        className="text-foreground underline underline-offset-4"
                      >
                        sign in
                      </button>
                    </>
                  )}
                </p>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
