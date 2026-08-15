"use client"

/**
 * Which notifications you have already read.
 *
 * The activity feed the bell shows is derived — `/api/activity` reports what
 * happened, and has no per-user read flag to set. So "read" is kept on the
 * client, in localStorage, and survives closing the panel and reloading the
 * page. Previously it was a `useState` inside the panel, which meant "Mark all
 * read" was forgotten the moment the panel unmounted and everything came back
 * as new on the next open.
 *
 * Two things are stored, because one alone is not enough:
 *
 *  - `before` — a cutoff stamped by "Mark all read". Everything older is read,
 *    which covers items in one sweep without listing them all.
 *  - `ids`    — individual items marked read by clicking them, for the ones
 *    newer than the cutoff.
 *
 * Every "Mark all read" moves the cutoff forward and empties `ids`, so the
 * list cannot grow without bound.
 */

import { useCallback, useSyncExternalStore } from "react"
import type { ActivityItem } from "@/lib/api"

const STORAGE_KEY = "studenthub.notifications.read"

/** Belt and braces: individual ids are capped even between sweeps. */
const MAX_IDS = 200

export interface ReadState {
  /** Ids read one at a time. */
  ids: string[]
  /** Epoch ms; anything dated at or before this counts as read. 0 = never. */
  before: number
}

const EMPTY: ReadState = { ids: [], before: 0 }

let state: ReadState = EMPTY
let loaded = false
const listeners = new Set<() => void>()

function load(): ReadState {
  if (loaded || typeof window === "undefined") return state
  loaded = true
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ReadState>
      state = {
        ids: Array.isArray(parsed.ids) ? parsed.ids.slice(-MAX_IDS) : [],
        before: typeof parsed.before === "number" ? parsed.before : 0,
      }
    }
  } catch {
    // Corrupt or unavailable storage just means nothing is marked read.
  }
  return state
}

function commit(next: ReadState) {
  // Replaced, never mutated: `useSyncExternalStore` compares by reference.
  state = next
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Private mode. The state still applies for this session.
  }
  listeners.forEach((listener) => listener())
}

/**
 * A stable identity for an activity item.
 *
 * `ActivityItem` carries no id of its own, so one is derived from the fields
 * that do not change: what happened, to what, and when. The list index is
 * deliberately not part of it — that shifts as new activity arrives, and an id
 * built on it would mark a different notification read on the next fetch.
 */
export function activityId(item: ActivityItem): string {
  return `${item.type}|${item.date}|${item.title}`
}

export function isRead(item: ActivityItem, snapshot: ReadState): boolean {
  if (snapshot.ids.includes(activityId(item))) return true
  const at = Date.parse(item.date)
  return Number.isFinite(at) && snapshot.before > 0 && at <= snapshot.before
}

export function markRead(item: ActivityItem) {
  const id = activityId(item)
  const current = load()
  if (current.ids.includes(id)) return
  commit({ ...current, ids: [...current.ids, id].slice(-MAX_IDS) })
}

/**
 * Sweeps everything currently visible.
 *
 * The cutoff is the newest item's date rather than "now", so activity that
 * arrives while the panel is open — dated after what you actually saw — is
 * still unread afterwards.
 */
export function markAllRead(items: ActivityItem[]) {
  const newest = items.reduce((max, item) => {
    const at = Date.parse(item.date)
    return Number.isFinite(at) && at > max ? at : max
  }, 0)
  commit({ ids: [], before: Math.max(load().before, newest) })
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** The read state, re-rendering whatever reads it when it changes. */
export function useReadState(): ReadState {
  return useSyncExternalStore(
    subscribe,
    load,
    () => EMPTY // Server render: nothing is read yet.
  )
}

/**
 * `unread(item)` plus the count, for the panel and the bell dot. Both read the
 * same store, so marking one read updates both.
 */
export function useUnread(items: ActivityItem[]) {
  const snapshot = useReadState()
  const unread = useCallback(
    (item: ActivityItem) => !isRead(item, snapshot),
    [snapshot]
  )
  return {
    unread,
    count: items.reduce((total, item) => total + (unread(item) ? 1 : 0), 0),
  }
}
