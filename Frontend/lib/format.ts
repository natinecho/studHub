// Small presentation helpers shared across the screens.

import type { Id } from "@/lib/api"

/** "Sarah Johnson" -> "SJ"; "natnael" -> "NA" */
export function initialsOf(name?: string | null): string {
  if (!name) return "?"
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * Mongo refs arrive either as a bare id string or a populated object, and what
 * the object holds depends on the endpoint — a user has `username`, a group
 * has `name`. Typed on the shape these need rather than on `UserRef`, so a
 * populated group ref does not have to be cast at every call site.
 */
type Ref = Id | { _id: Id; username?: string; name?: string } | null | undefined

export function refId(ref: Ref): Id | null {
  if (!ref) return null
  return typeof ref === "string" ? ref : ref._id
}

export function refName(ref: Ref): string {
  if (!ref) return "Unknown"
  if (typeof ref === "string") return "Unknown"
  return ref.username ?? ref.name ?? "Unknown"
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** "just now", "12m ago", "3h ago", "2d ago", then a date. */
export function relativeTime(input?: string | Date | null): string {
  if (!input) return ""
  const then = new Date(input).getTime()
  if (Number.isNaN(then)) return ""

  const diff = Date.now() - then
  if (diff < MINUTE) return "just now"
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}d ago`

  return new Date(then).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  })
}

/** Clock time for chat bubbles. */
export function clockTime(input?: string | Date | null): string {
  if (!input) return ""
  const date = new Date(input)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * Presence line for someone who isn't online: recent enough and we say when,
 * yesterday gets named, anything older falls back to a plain date.
 */
export function lastSeenLabel(input?: string | Date | null): string {
  if (!input) return "Offline"
  const then = new Date(input)
  const stamp = then.getTime()
  if (Number.isNaN(stamp)) return "Offline"

  const diff = Date.now() - stamp
  if (diff < MINUTE) return "Last seen just now"
  if (diff < HOUR) return `Last seen ${Math.floor(diff / MINUTE)}m ago`

  const time = clockTime(then)
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  if (stamp >= startOfToday.getTime()) return `Last seen today at ${time}`

  const startOfYesterday = new Date(startOfToday)
  startOfYesterday.setDate(startOfYesterday.getDate() - 1)
  if (stamp >= startOfYesterday.getTime()) {
    return `Last seen yesterday at ${time}`
  }

  return `Last seen ${then.getDate()}/${then.getMonth() + 1}/${then.getFullYear()}`
}

/** "21 Aug" for task due dates; empty when there is no deadline. */
export function shortDate(input?: string | Date | null): string {
  if (!input) return ""
  const date = new Date(input)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" })
}

/** yyyy-mm-dd for <input type="date"> round-tripping. */
export function dateInputValue(input?: string | Date | null): string {
  if (!input) return ""
  const date = new Date(input)
  if (Number.isNaN(date.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** "Thursday, 14 August" — the dashboard's date kicker. */
export function todayLabel(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
}

/** Signed percentage for the stat cards. */
export function changeLabel(change?: number): string {
  if (change === undefined || change === null || Number.isNaN(change)) return ""
  const rounded = Math.round(change * 10) / 10
  return `${rounded >= 0 ? "+" : ""}${rounded}%`
}

export function stripHtml(html?: string | null): string {
  if (!html) return ""
  return html
    .replace(/<[^>]*>?/gm, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** Split a comma/space separated tag field into a clean array. */
export function parseTags(input: string): string[] {
  return input
    .split(/[,\n]/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 8)
}
