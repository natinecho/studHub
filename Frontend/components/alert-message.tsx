"use client"

import type { ReactNode } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  WifiOff,
  XCircle,
} from "lucide-react"
import { errorMessage, isNetworkError } from "@/lib/api"

export type Tone = "error" | "warning" | "success" | "info"

const ICONS = {
  error: XCircle,
  warning: AlertTriangle,
  success: CheckCircle2,
  info: Info,
} as const

/**
 * The banner every screen uses to report an outcome.
 *
 * Three things make a message usable, and this owns all three so no screen has
 * to remember them: the tone colour (an error is red, not accent-blue), an
 * icon so the tone survives for anyone who can't see the colour, and a
 * structure of "what failed" over "what the server said about it".
 */
export function AlertMessage({
  tone = "error",
  title,
  children,
  icon,
  action,
  className = "",
}: {
  tone?: Tone
  title: string
  /** The detail line. Omit it when the title already says everything. */
  children?: ReactNode
  icon?: ReactNode
  /** A retry button, usually. */
  action?: ReactNode
  className?: string
}) {
  const Icon = ICONS[tone]
  return (
    <div className={`alert ${className}`} data-tone={tone} role="alert">
      <span className="alert-icon">
        {icon ?? <Icon size={16} strokeWidth={1.6} />}
      </span>
      <div className="grid gap-1">
        <p className="alert-title">{title}</p>
        {children && <p className="alert-body">{children}</p>}
        {action && <div className="mt-1.5 flex gap-2">{action}</div>}
      </div>
    </div>
  )
}

/**
 * The same banner, given the raw thrown value.
 *
 * `title` says what the app was trying to do; the detail underneath is the
 * normalised reason. Losing the connection gets its own icon because it is the
 * one failure the reader can fix themselves.
 */
export function ErrorAlert({
  error,
  title,
  action,
  className = "",
}: {
  error: unknown
  /** What failed, as a sentence: "Could not load your notes." */
  title: string
  action?: ReactNode
  className?: string
}) {
  const detail = errorMessage(error, title)
  const offline = isNetworkError(error)
  return (
    <AlertMessage
      tone={offline ? "warning" : "error"}
      title={title}
      icon={offline ? <WifiOff size={16} strokeWidth={1.6} /> : undefined}
      action={action}
      className={className}
    >
      {detail === title ? undefined : detail}
    </AlertMessage>
  )
}

/** The one-line form for a field or the foot of a modal. */
export function InlineError({ children }: { children: ReactNode }) {
  return (
    <p className="field-error" role="alert">
      <AlertTriangle
        size={13}
        strokeWidth={1.7}
        className="mt-[2px] flex-none"
      />
      <span>{children}</span>
    </p>
  )
}
