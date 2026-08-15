// One place that turns whatever a failed call threw into a sentence a student
// can act on.
//
// The rule: say what did not happen, then what to do about it. Never leak the
// plumbing — a URL, a port, a stack or a Mongo validator name tells the reader
// nothing they can use and reads as a crash. Anything the backend phrases for
// its own developers gets swapped for our wording here rather than at each of
// the forty-odd call sites.

import { ApiError } from "./client"

/** `status: 0` is our own marker for "the request never reached the server". */
export const NETWORK_ERROR_STATUS = 0

const OFFLINE_MESSAGE =
  "Can't reach Student Hub. Check your connection and try again."

const BY_STATUS: Record<number, string> = {
  400: "That didn't look right — please check the details and try again.",
  401: "Your session has expired. Please sign in again.",
  403: "You don't have permission to do that.",
  404: "That's no longer here — it may have been deleted.",
  409: "Someone else changed this first. Reload and try again.",
  413: "That's too large to upload.",
  422: "Some details are missing or invalid.",
  429: "Too many attempts. Wait a moment and try again.",
}

/**
 * Backend messages written for a developer rather than a student. Matched
 * case-insensitively on the whole trimmed message.
 */
const REPHRASED: [RegExp, string][] = [
  [/^no such (post|note|comment|todo|group|user)$/i, "That's no longer here — it may have been deleted."],
  [/^(post|note|comment|todo|group|user) not found$/i, "That's no longer here — it may have been deleted."],
  [/authorization token (missing|malformed)/i, "Please sign in to continue."],
  [/invalid or expired token/i, "Your session has expired. Please sign in again."],
  [/^failed to (create|update|delete|fetch|upvote|vote on)\b/i, ""],
  [/^(cast to objectid failed|validation failed)/i, ""],
  [/^request failed \(\d+\)$/i, ""],
  [/^internal server error$/i, ""],
]

/** True when the request never made it to the server (offline, DNS, CORS). */
export function isNetworkError(caught: unknown): boolean {
  return caught instanceof ApiError && caught.status === NETWORK_ERROR_STATUS
}

/** True when the server rejected our credentials. */
export function isAuthError(caught: unknown): boolean {
  return caught instanceof ApiError && caught.status === 401
}

/**
 * The sentence to show the user.
 *
 * @param fallback What failed, in the caller's own words — "Could not save
 *   your note." It is used whenever the server's own message is unusable, so
 *   write it as a complete sentence rather than a label.
 */
export function errorMessage(caught: unknown, fallback: string): string {
  if (!(caught instanceof ApiError)) {
    // A thrown non-ApiError is a bug on our side, not something the server
    // said — there is nothing here worth quoting at the user.
    return fallback
  }

  if (caught.status === NETWORK_ERROR_STATUS) return OFFLINE_MESSAGE

  const raw = (caught.message ?? "").trim()

  for (const [pattern, replacement] of REPHRASED) {
    if (pattern.test(raw)) return replacement || BY_STATUS[caught.status] || fallback
  }

  // A message the server wrote deliberately — a validation complaint, a
  // "username already taken" — is more specific than anything we can guess,
  // so it wins, as long as it reads like prose and not like a stack frame.
  if (isPresentable(raw)) return raw

  return BY_STATUS[caught.status] ?? fallback
}

/** Rejects anything that looks like plumbing rather than a sentence. */
function isPresentable(message: string): boolean {
  if (message.length < 3 || message.length > 200) return false
  if (/https?:\/\/|localhost|:\d{4}\b/.test(message)) return false
  if (/\b(at\s+\w+\.\w+|Error:|undefined|null|NaN|ObjectId|ECONN|ENOTFOUND)\b/.test(message)) {
    return false
  }
  if (/^<|[{}]|^\s*$/.test(message)) return false
  return true
}
