"use client"

import { useMemo } from "react"
import type { Screen } from "@/lib/screens"
import {
  dashboardApi,
  keys,
  useQuery,
  type ActivityItem,
} from "@/lib/api"
import { relativeTime } from "@/lib/format"
import { markAllRead, markRead, useUnread } from "@/lib/notifications-read"
import { PeopleRowsSkeleton } from "@/components/skeletons"

/** Activity types map onto the screen that shows them. */
function screenFor(type: string): Screen {
  switch (type) {
    case "note":
      return "notes"
    case "post":
      return "forum"
    case "task":
      return "dashboard"
    default:
      return "dashboard"
  }
}

function tagFor(type: string): string {
  switch (type) {
    case "note":
      return "NOTE"
    case "post":
      return "POST"
    case "task":
      return "TASK"
    default:
      return type.slice(0, 4).toUpperCase()
  }
}

export function NotificationsPanel({
  onClose,
  onNavigate,
}: {
  onClose: () => void
  onNavigate: (screen: Screen) => void
}) {
  // The same cache entry the dashboard's activity feed reads, rather than a
  // fetch of its own — so opening the bell after visiting the dashboard is
  // instant, and the two can never disagree about what happened.
  const activityQuery = useQuery<ActivityItem[]>(
    keys.activity(),
    dashboardApi.recentActivity
  )
  const items = useMemo(() => activityQuery.data ?? [], [activityQuery.data])
  const loading = activityQuery.isLoading

  // Read state lives outside this component, in localStorage — closing the
  // panel used to forget it and everything came back as new.
  const { unread, count: unreadCount } = useUnread(items)

  // Rendered inside the bell button's `relative` wrapper, so it hangs directly
  // below the button. The backdrop only exists to catch outside clicks.
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      {/* Not `.bp` — that class forces `position: relative` from an unlayered
          rule, which outranks Tailwind's `absolute` and drops the panel back
          into the header's flow, on top of the bell. Border set by hand. */}
      <div
        className="animate-rise-in-fast absolute right-0 top-[calc(100%+10px)] z-50 w-[min(360px,calc(100vw-28px))] overflow-hidden rounded-[16px] border border-[var(--color-divider)]"
        style={{
          background: "var(--color-bg)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <div className="flex items-center gap-2.5 border-b border-[var(--color-divider)] px-4 py-3">
          <span
            className="text-[16px]"
            style={{ fontFamily: "var(--font-heading)", fontWeight: 600 }}
          >
            Notifications
          </span>
          <span className="pill pill-accent">
            {unreadCount === 0 ? "All read" : `${unreadCount} new`}
          </span>
          <span className="flex-1" />
          {/* Nothing to sweep when it is already all read. */}
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllRead(items)}
              className="whitespace-nowrap text-xs"
              style={{ color: "var(--color-accent-700)" }}
            >
              Mark all read
            </button>
          )}
        </div>

        {/* A gap between rows rather than rows stacked flush: with only a faint
            tint marking unread, adjacent notifications ran together into one
            block of text and there was no telling where one ended. */}
        <div className="grid max-h-[340px] gap-1.5 overflow-auto p-2">
          {loading ? (
            <PeopleRowsSkeleton count={4} lines={3} />
          ) : items.length === 0 ? (
            <p className="m-0 px-4 py-6 text-center text-[13px] opacity-50">
              Nothing yet. Create a note or a task to get started.
            </p>
          ) : (
            items.map((item, index) => {
              const isUnread = unread(item)
              return (
                <button
                  key={`${item.title}-${item.date}-${index}`}
                  type="button"
                  onClick={() => {
                    // Reading one marks that one, and only that one.
                    markRead(item)
                    onNavigate(screenFor(item.type))
                  }}
                  className="flex w-full items-start gap-2.5 rounded-[14px] border px-3 py-2.5 text-left transition-colors"
                  style={{
                    // Each row is its own card. Read ones keep the divider
                    // hairline so they stay separated once the tint is gone.
                    background: isUnread
                      ? "color-mix(in srgb, var(--color-accent) 8%, transparent)"
                      : "transparent",
                    borderColor: isUnread
                      ? "color-mix(in srgb, var(--color-accent) 30%, transparent)"
                      : "var(--color-divider)",
                  }}
                >
                  <span
                    className="avatar-plain h-[30px] w-[30px] text-[10px]"
                    style={{ color: "var(--color-accent-700)" }}
                  >
                    {tagFor(item.type)}
                  </span>
                  <span className="min-w-0 flex-1">
                    {/* The title stays on one line — it is the label you scan.
                        What was done wraps to two, because cut off at one it
                        was often the half that said what actually happened. */}
                    <span className="block truncate text-[13.5px] font-medium">
                      {item.title || item.action}
                    </span>
                    <span
                      className="mt-0.5 block line-clamp-2 text-xs leading-[1.45]"
                      style={{
                        color:
                          "color-mix(in srgb, var(--color-text) 55%, transparent)",
                      }}
                    >
                      {item.action}
                    </span>
                    <span
                      className="mt-1 block text-[11px]"
                      style={{
                        color:
                          "color-mix(in srgb, var(--color-text) 45%, transparent)",
                      }}
                    >
                      {relativeTime(item.date)}
                    </span>
                  </span>
                </button>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}
