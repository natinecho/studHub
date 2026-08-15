// Core fetch wrapper: base URL, JWT header, JSON handling and typed errors.

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"

const TOKEN_KEY = "studenthub.token"

export class ApiError extends Error {
  status: number
  body: unknown

  constructor(status: number, message: string, body?: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.body = body
  }
}

// ── Token storage ───────────────────────────────────────────────────────────
// Kept in localStorage so a refresh keeps you signed in. Guarded for SSR.

export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return
  if (token) window.localStorage.setItem(TOKEN_KEY, token)
  else window.localStorage.removeItem(TOKEN_KEY)
}

/** Fires when the API rejects our token, so the app can bounce to sign-in. */
type UnauthorizedHandler = () => void
let onUnauthorized: UnauthorizedHandler | null = null

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  onUnauthorized = handler
}

// ── Request ─────────────────────────────────────────────────────────────────

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown
  /** Query string params; undefined/null/"" entries are dropped. */
  query?: Record<string, string | number | boolean | undefined | null>
  /** Skip the Authorization header (login, register, forgot-password). */
  anonymous?: boolean
}

function buildUrl(path: string, query?: RequestOptions["query"]) {
  const url = new URL(
    path.startsWith("/") ? path : `/${path}`,
    API_BASE_URL
  )
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue
      url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

async function parseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? ""
  if (response.status === 204) return null
  if (contentType.includes("application/json")) {
    try {
      return await response.json()
    } catch {
      return null
    }
  }
  return await response.text()
}

function messageFrom(body: unknown, fallback: string): string {
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>
    if (typeof record.message === "string") return record.message
    const data = record.data
    if (data && typeof data === "object") {
      const message = (data as Record<string, unknown>).message
      if (typeof message === "string") return message
    }
  }
  if (typeof body === "string" && body.trim()) return body
  return fallback
}

export async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, query, anonymous, headers, ...rest } = options

  const finalHeaders = new Headers(headers)
  if (body !== undefined && !(body instanceof FormData)) {
    finalHeaders.set("Content-Type", "application/json")
  }
  if (!anonymous) {
    const token = getToken()
    if (token) finalHeaders.set("Authorization", `Bearer ${token}`)
  }

  let response: Response
  try {
    response = await fetch(buildUrl(path, query), {
      ...rest,
      headers: finalHeaders,
      body:
        body === undefined
          ? undefined
          : body instanceof FormData
            ? body
            : JSON.stringify(body),
    })
  } catch (cause) {
    // The user cannot act on a URL and a port, so the message stays plain and
    // `errorMessage()` owns the wording. The technical detail goes in `body`
    // for the console, where a developer will actually look for it.
    throw new ApiError(0, "Network request failed", {
      url: buildUrl(path, query),
      cause: cause instanceof Error ? cause.message : String(cause),
    })
  }

  const parsed = await parseBody(response)

  if (!response.ok) {
    if (response.status === 401 && !anonymous) {
      setToken(null)
      onUnauthorized?.()
    }
    throw new ApiError(
      response.status,
      messageFrom(parsed, `Request failed (${response.status})`),
      parsed
    )
  }

  return parsed as T
}

/** Download a binary response (used for the note PDF export). */
export async function requestBlob(
  path: string,
  options: RequestOptions = {}
): Promise<Blob> {
  const { query, headers, body: _body, anonymous: _anonymous, ...rest } = options
  const finalHeaders = new Headers(headers)
  const token = getToken()
  if (token) finalHeaders.set("Authorization", `Bearer ${token}`)

  const response = await fetch(buildUrl(path, query), {
    ...rest,
    headers: finalHeaders,
  })

  if (!response.ok) {
    const parsed = await parseBody(response)
    throw new ApiError(
      response.status,
      messageFrom(parsed, "Download failed"),
      parsed
    )
  }

  return await response.blob()
}
