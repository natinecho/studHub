"use client"

/**
 * A small stale-while-revalidate cache for the API bindings in `./index`.
 *
 * Screens are routes, so each one unmounts when you navigate away and its
 * component state goes with it. Without a cache that outlives the component,
 * every visit starts from an empty screen and a cold round-trip — which is
 * what made navigation feel slow. The store here lives at module scope, so a
 * screen you have already opened renders from memory on the next visit and
 * revalidates quietly behind the rendered view.
 *
 * Deliberately not a dependency: the app has its own fetch wrapper, its own
 * contexts and about a dozen query sites, which is well under the point where
 * a full query library earns its weight.
 */

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react"

/** How long a fresh entry is trusted before a mount will revalidate it. */
const DEFAULT_STALE_TIME = 2_000

interface Entry<T = unknown> {
  data?: T
  error?: unknown
  /** Epoch ms of the last success; 0 means "never loaded". */
  updatedAt: number
  /** True while a request for this key is in flight. */
  fetching: boolean
}

const EMPTY: Entry = { updatedAt: 0, fetching: false }

const store = new Map<string, Entry>()
const subscribers = new Map<string, Set<() => void>>()
const inflight = new Map<string, Promise<unknown>>()
/** The last fetcher seen per key, so `invalidate` can refetch on its own. */
const fetchers = new Map<string, () => Promise<unknown>>()

// ── Keys ────────────────────────────────────────────────────────────────────

/**
 * Builds a cache key from a scope and its parameters. Scopes are what
 * `invalidate` matches on, so keep them coarse: "notes", "groups", "posts".
 */
export function qk(scope: string, params?: unknown): string {
  return params === undefined ? scope : `${scope}:${JSON.stringify(params)}`
}

/** True when `key` is `scope` itself or one of its parameterised variants. */
function inScope(key: string, scope: string): boolean {
  return key === scope || key.startsWith(`${scope}:`)
}

// ── Store internals ─────────────────────────────────────────────────────────

function notify(key: string) {
  subscribers.get(key)?.forEach((listener) => listener())
}

/**
 * Entries are replaced, never mutated: `useSyncExternalStore` compares
 * snapshots by reference, so an in-place edit would not re-render.
 */
function setEntry(key: string, patch: Partial<Entry>) {
  const current = store.get(key) ?? EMPTY
  store.set(key, { ...current, ...patch })
  notify(key)
}

function readEntry<T>(key: string): Entry<T> | undefined {
  return store.get(key) as Entry<T> | undefined
}

function subscribe(key: string, listener: () => void) {
  let listeners = subscribers.get(key)
  if (!listeners) {
    listeners = new Set()
    subscribers.set(key, listeners)
  }
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) subscribers.delete(key)
  }
}

// ── Fetching ────────────────────────────────────────────────────────────────

/**
 * Runs `fetcher` for `key`, collapsing concurrent callers onto one request.
 * A failure keeps whatever data is already cached — a screen that has content
 * on it should not blank out because a background revalidation lost the
 * network — and surfaces the error alongside it.
 */
export function fetchQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  { force = false }: { force?: boolean } = {}
): Promise<T> {
  fetchers.set(key, fetcher as () => Promise<unknown>)

  const existing = inflight.get(key)
  if (existing && !force) return existing as Promise<T>

  // Assigned on the line below; the body only reads it after an await, by
  // which time the assignment has run.
  let promise!: Promise<T>
  promise = (async () => {
    try {
      const data = await fetcher()
      setEntry(key, {
        data,
        error: undefined,
        updatedAt: Date.now(),
        fetching: false,
      })
      return data
    } catch (error) {
      setEntry(key, { error, fetching: false })
      throw error
    } finally {
      if (inflight.get(key) === promise) inflight.delete(key)
    }
  })()

  inflight.set(key, promise)
  setEntry(key, { fetching: true })
  return promise
}

// ── Writes ──────────────────────────────────────────────────────────────────

/**
 * Writes straight into the cache — for optimistic updates, where the screen
 * already knows the new value and should not wait for a round-trip to show it.
 * Keys with no entry yet are ignored: there is nothing on screen to update.
 */
export function mutateCache<T>(key: string, update: (current: T) => T) {
  const current = readEntry<T>(key)
  if (!current || current.updatedAt === 0) return
  setEntry(key, { data: update(current.data as T), updatedAt: Date.now() })
}

/**
 * Marks a scope out of date after a write. Keys a mounted screen is watching
 * are refetched immediately and keep their current data on screen while that
 * happens; keys nobody is watching are dropped, so the next visit reloads.
 */
export function invalidate(...scopes: string[]) {
  for (const key of [...store.keys()]) {
    if (!scopes.some((scope) => inScope(key, scope))) continue

    const watched = (subscribers.get(key)?.size ?? 0) > 0
    const fetcher = fetchers.get(key)

    if (watched && fetcher) {
      // Errors land in the entry; this call is fire-and-forget.
      void fetchQuery(key, fetcher, { force: true }).catch(() => {})
    } else {
      store.delete(key)
      fetchers.delete(key)
    }
  }
}

/**
 * Drops everything. Called on sign-out and on a 401 — cached data belongs to
 * the account that fetched it and must never be shown to the next one.
 */
export function clearCache() {
  const keys = [...store.keys()]
  store.clear()
  fetchers.clear()
  inflight.clear()
  keys.forEach(notify)
}

// ── Hook ────────────────────────────────────────────────────────────────────

export interface QueryOptions {
  /** Skip the request (e.g. nothing selected yet). Cached data still shows. */
  enabled?: boolean
  /** Window in which a mount trusts the cache and skips revalidating. */
  staleTime?: number
  /**
   * Keep the previous key's data visible while the new key loads. For search
   * and filters, where blanking the list on every keystroke is worse than
   * showing slightly stale results.
   */
  keepPreviousData?: boolean
}

export interface QueryResult<T> {
  data: T | undefined
  error: unknown
  /** No data to show yet — the only case that should render a skeleton. */
  isLoading: boolean
  /** Refreshing underneath data that is already on screen. */
  isRevalidating: boolean
  /** Force a refetch, bypassing the stale window. */
  refresh: () => Promise<void>
}

/**
 * Reads `key` from the cache and keeps it fresh.
 *
 * The first render returns whatever is already cached, so a screen you have
 * visited before paints immediately and `isLoading` is false — the revalidation
 * happens underneath it. Only a genuinely cold key reports `isLoading`.
 */
export function useQuery<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  options: QueryOptions = {}
): QueryResult<T> {
  const {
    enabled = true,
    staleTime = DEFAULT_STALE_TIME,
    keepPreviousData = false,
  } = options

  // The fetcher is rebuilt on every render at most call sites; holding it in a
  // ref keeps it out of the effect's dependencies so only `key` drives refetch.
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const entry = useSyncExternalStore(
    useCallback(
      (listener: () => void) => (key ? subscribe(key, listener) : () => {}),
      [key]
    ),
    useCallback(() => (key ? readEntry<T>(key) : undefined), [key]),
    () => undefined // Server render: always cold.
  )

  const active = enabled && key !== null

  useEffect(() => {
    if (!active || !key) return
    const current = readEntry<T>(key)
    const fresh = current && Date.now() - current.updatedAt < staleTime
    if (fresh || current?.fetching) return
    void fetchQuery(key, () => fetcherRef.current()).catch(() => {})
  }, [key, active, staleTime])

  const refresh = useCallback(async () => {
    if (!key) return
    try {
      await fetchQuery(key, () => fetcherRef.current(), { force: true })
    } catch {
      // Already recorded on the entry; callers read `error`.
    }
  }, [key])

  // Held across key changes so a new key can borrow the old key's data.
  const previous = useRef<T | undefined>(undefined)
  const hasData = !!entry && entry.updatedAt > 0
  if (hasData) previous.current = entry.data

  const data = hasData
    ? entry.data
    : keepPreviousData
      ? previous.current
      : undefined

  return {
    data,
    error: entry?.error,
    isLoading: data === undefined && (entry?.fetching ?? active),
    isRevalidating: data !== undefined && (entry?.fetching ?? false),
    refresh,
  }
}
