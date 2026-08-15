"use client"

import { useState, type FormEvent } from "react"
import { toast } from "sonner"
import { InlineError } from "@/components/alert-message"
import { PasswordInput } from "@/components/password-input"
import { useAuth } from "@/lib/auth-context"
import { errorMessage, usersApi } from "@/lib/api"

const HIGHLIGHTS = [
  "Write notes together and see who is editing, live.",
  "Track personal and group tasks in one queue.",
  "Chat, ask the forum, or ask the AI assistant.",
]

function LogoMark({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z" />
      <path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12" />
      <path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17" />
    </svg>
  )
}

export function AuthPage() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<"login" | "signup">("login")
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isSignup = mode === "signup"

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (busy) return

    setError(null)
    setBusy(true)
    try {
      if (isSignup) {
        await register(username.trim(), email.trim(), password)
      } else {
        await login(email.trim(), password)
      }
    } catch (caught) {
      const message =
        errorMessage(caught, "Something went wrong. Please try again.")
      setError(message)
    } finally {
      setBusy(false)
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setError("Enter your email address first, then choose Reset it.")
      return
    }
    try {
      await usersApi.forgotPassword(email.trim())
      toast.success("Check your inbox for a reset link.")
    } catch (caught) {
      setError(
        errorMessage(caught, "Could not send the email.")
      )
    }
  }

  return (
    <div className="grid min-h-screen [grid-template-columns:repeat(auto-fit,minmax(min(420px,100%),1fr))] bg-[var(--color-bg)] text-[var(--color-text)]">
      {/* Left: the steel field, type reversed to paper. */}
      <div
        className="flex flex-col justify-between gap-10 p-[clamp(28px,5vw,64px)]"
        style={{
          background: "var(--color-accent-900)",
          color: "var(--color-bg)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="grid h-[26px] w-[26px] place-items-center"
            style={{
              border:
                "1px solid color-mix(in srgb, #f2f2f3 60%, transparent)",
            }}
          >
            <LogoMark />
          </span>
          <span
            className="text-[17px] uppercase"
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              letterSpacing: ".04em",
            }}
          >
            Student Hub
          </span>
        </div>

        <div className="flex max-w-[420px] flex-col gap-6">
          <p className="m-0 text-[10px] uppercase opacity-70 [letter-spacing:.18em]">
            Collaborative workspace · v2
          </p>
          <h1
            className="m-0 text-[clamp(38px,4.4vw,56px)]"
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              lineHeight: 1.02,
              letterSpacing: "-.01em",
            }}
          >
            Notes, tasks and study groups on one board.
          </h1>
          <div
            className="grid gap-3.5 pt-5"
            style={{
              borderTop:
                "1px solid color-mix(in srgb, #f2f2f3 28%, transparent)",
            }}
          >
            {HIGHLIGHTS.map((text, index) => (
              <div
                key={text}
                className="grid grid-cols-[28px_1fr] items-baseline gap-3"
              >
                <span
                  className="text-[13px] opacity-60"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-sm opacity-90">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="m-0 text-[11px] opacity-55 [letter-spacing:.06em]">
          Notes, tasks, chat, forum and groups — in one workspace.
        </p>
      </div>

      {/* Right: the form card. */}
      <div className="grid place-items-center p-[clamp(28px,5vw,64px)]">
        <form
          onSubmit={handleSubmit}
          className="bp flex w-full max-w-[380px] flex-col gap-5 p-7"
          style={{ background: "var(--color-bg)" }}
        >
          <div>
            <p className="kicker mb-1.5">Account</p>
            <h2
              className="m-0 text-[27px]"
              style={{ fontFamily: "var(--font-heading)", fontWeight: 600 }}
            >
              {isSignup ? "Create your account" : "Sign in to continue"}
            </h2>
          </div>

          <div className="seg-group">
            <button
              type="button"
              className="seg-btn flex-1"
              data-active={!isSignup}
              onClick={() => {
                setMode("login")
                setError(null)
              }}
            >
              Log in
            </button>
            <button
              type="button"
              className="seg-btn flex-1"
              data-active={isSignup}
              onClick={() => {
                setMode("signup")
                setError(null)
              }}
            >
              Sign up
            </button>
          </div>

          {isSignup && (
            <label className="field-label">
              Username
              <input
                className="field-input h-10"
                placeholder="natnael"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
                autoComplete="username"
              />
            </label>
          )}

          <label className="field-label">
            Email
            <input
              className="field-input h-10"
              type="email"
              placeholder="you@university.edu"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
            />
          </label>

          <label className="field-label">
            Password
            <PasswordInput
              placeholder="••••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              autoComplete={isSignup ? "new-password" : "current-password"}
            />
          </label>

          {error && (
            <InlineError>{error}</InlineError>
          )}

          <button
            type="submit"
            className="action-btn h-[42px]"
            data-active={!busy}
            disabled={busy}
          >
            {busy
              ? isSignup
                ? "Creating account…"
                : "Signing in…"
              : isSignup
                ? "Create account"
                : "Log in"}
          </button>

          <p
            className="m-0 text-xs"
            style={{
              color: "color-mix(in srgb, var(--color-text) 55%, transparent)",
            }}
          >
            Forgot your password?{" "}
            <button
              type="button"
              onClick={handleForgotPassword}
              style={{ color: "var(--color-accent-700)" }}
              className="underline underline-offset-[3px]"
            >
              Reset it
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}
