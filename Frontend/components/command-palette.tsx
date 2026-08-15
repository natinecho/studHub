"use client"

import { useEffect, useMemo, useState } from "react"
import { Search } from "lucide-react"
import type { Screen } from "@/lib/screens"
import { groupsApi, notesApi, type Group, type NoteSummary } from "@/lib/api"

interface PaletteItem {
  kind: string
  label: string
  hint: string
  screen: Screen
}

const SCREEN_ITEMS: PaletteItem[] = [
  {
    kind: "Screen",
    label: "Dashboard",
    hint: "Overview and tasks",
    screen: "dashboard",
  },
  { kind: "Screen", label: "Notes", hint: "Your notes", screen: "notes" },
  { kind: "Screen", label: "Messages", hint: "Conversations", screen: "chat" },
  { kind: "Screen", label: "Forum", hint: "Discussions", screen: "forum" },
  { kind: "Screen", label: "Groups", hint: "Study groups", screen: "groups" },
  {
    kind: "Screen",
    label: "Settings",
    hint: "Profile and privacy",
    screen: "settings",
  },
]

export function CommandPalette({
  onClose,
  onNavigate,
}: {
  onClose: () => void
  onNavigate: (screen: Screen) => void
}) {
  const [query, setQuery] = useState("")
  const [notes, setNotes] = useState<NoteSummary[]>([])
  const [groups, setGroups] = useState<Group[]>([])

  // Load the searchable content once the palette opens.
  useEffect(() => {
    let cancelled = false
    Promise.allSettled([notesApi.list(), groupsApi.list()]).then(
      ([noteResult, groupResult]) => {
        if (cancelled) return
        if (noteResult.status === "fulfilled") setNotes(noteResult.value)
        if (groupResult.status === "fulfilled") setGroups(groupResult.value)
      }
    )
    return () => {
      cancelled = true
    }
  }, [])

  const items = useMemo<PaletteItem[]>(() => {
    const noteItems: PaletteItem[] = notes.slice(0, 12).map((note) => ({
      kind: "Note",
      label: note.title,
      hint: note.tags?.join(" · ") || note.type,
      screen: "notes",
    }))
    const groupItems: PaletteItem[] = groups.slice(0, 12).map((group) => ({
      kind: "Group",
      label: group.name,
      hint: `${group.members?.length ?? 0} members`,
      screen: "groups",
    }))
    return [...SCREEN_ITEMS, ...noteItems, ...groupItems]
  }, [notes, groups])

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return items.slice(0, 7)
    return items
      .filter(
        (item) =>
          item.label.toLowerCase().includes(needle) ||
          item.kind.toLowerCase().includes(needle) ||
          item.hint.toLowerCase().includes(needle)
      )
      .slice(0, 7)
  }, [items, query])

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-start justify-center overflow-auto p-[18px] pt-[12vh]"
      style={{ background: "var(--color-scrim)" }}
      onClick={onClose}
    >
      <div
        className="bp animate-rise-in-fast w-[min(560px,100%)]"
        style={{
          background: "var(--color-bg)",
          boxShadow: "var(--shadow-lg)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-[var(--color-divider)] px-4 py-3">
          <Search
            size={16}
            strokeWidth={1.5}
            style={{
              color: "color-mix(in srgb, var(--color-text) 45%, transparent)",
            }}
          />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && matches.length) {
                onNavigate(matches[0].screen)
              }
              if (event.key === "Escape") onClose()
            }}
            placeholder="Search screens, notes and groups…"
            className="w-full border-0 bg-transparent text-[15px] outline-none"
          />
        </div>

        <div className="max-h-[360px] overflow-auto p-2">
          {matches.length === 0 ? (
            <p
              className="m-0 px-3 py-6 text-center text-[13px]"
              style={{
                color: "color-mix(in srgb, var(--color-text) 50%, transparent)",
              }}
            >
              Nothing matches “{query}”.
            </p>
          ) : (
            matches.map((item, index) => (
              <button
                key={`${item.kind}-${item.label}-${index}`}
                type="button"
                onClick={() => onNavigate(item.screen)}
                className="flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left"
                style={{
                  background:
                    index === 0
                      ? "color-mix(in srgb, var(--color-accent) 10%, transparent)"
                      : "transparent",
                  borderColor:
                    index === 0 ? "var(--color-accent)" : "transparent",
                }}
              >
                <span
                  className="pill pill-neutral flex-none"
                  style={{ fontSize: 10 }}
                >
                  {item.kind}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13.5px]">
                  {item.label}
                </span>
                <span
                  className="flex-none truncate text-[11.5px]"
                  style={{
                    color:
                      "color-mix(in srgb, var(--color-text) 45%, transparent)",
                  }}
                >
                  {item.hint}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
