"use client"

import { useCallback, useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Bell,
  FileText,
  LayoutDashboard,
  Layers,
  MessageCircle,
  PanelLeft,
  Search,
  SlidersHorizontal,
  Users,
} from "lucide-react"
import { AuthPage } from "@/components/auth-page"
import { BrandMark } from "@/components/brand-mark"
import { IconButton } from "@/components/icon-button"
import { AIAssistant } from "@/components/ai-assistant"
import { CommandPalette } from "@/components/command-palette"
import { NotificationsPanel } from "@/components/notifications-panel"
import { WorkspaceSkeleton } from "@/components/skeletons"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  dashboardApi,
  keys,
  useQuery,
  type ActivityItem,
} from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { useChatUnread } from "@/lib/chat-unread"
import { useUnread } from "@/lib/notifications-read"
import { initialsOf } from "@/lib/format"
import { NarrowProvider, useNarrowState } from "@/lib/shell-layout"
import { useSocket } from "@/lib/socket-context"
import {
  SCREEN_META,
  SCREEN_PATHS,
  screenFromPath,
  type Screen,
} from "@/lib/screens"

const WORKSPACE_NAV = [
  { screen: "dashboard" as const, label: "Dashboard", Icon: LayoutDashboard },
  { screen: "notes" as const, label: "Notes", Icon: FileText },
  { screen: "chat" as const, label: "Chat", Icon: MessageCircle },
]

const COMMUNITY_NAV = [
  { screen: "forum" as const, label: "Forum", Icon: Users },
  { screen: "groups" as const, label: "Groups", Icon: Layers },
]

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading, isAuthenticated } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const screen = screenFromPath(pathname)

  const [railOpen, setRailOpen] = useState(true)
  const narrow = useNarrowState()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const { total: unreadChats } = useChatUnread()

  // Shares the dashboard's cached activity, so the bell knowing whether there
  // is anything new costs nothing extra once that screen has been opened.
  // Gated on being signed in: the shell renders the sign-in page for everyone
  // else, and hooks run either way, so without this it would fire an activity
  // request that can only come back 401.
  const activity = useQuery<ActivityItem[]>(
    keys.activity(),
    dashboardApi.recentActivity,
    { enabled: isAuthenticated }
  )
  const { count: unreadNotifications } = useUnread(activity.data ?? [])
  const { connected } = useSocket()
  const connectionLabel = connected ? "Connected" : "Reconnecting…"

  // Below the design's 880px breakpoint the rail becomes an overlay, so it
  // starts closed there and re-opens when there is room for it again.
  useEffect(() => {
    setRailOpen(!narrow)
  }, [narrow])

  // ⌘K / Ctrl-K opens the palette; Escape closes every overlay.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const key = (event.key || "").toLowerCase()
      if ((event.metaKey || event.ctrlKey) && key === "k") {
        event.preventDefault()
        setPaletteOpen((open) => !open)
      } else if (event.key === "Escape") {
        setPaletteOpen(false)
        setNotifOpen(false)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // Every screen is a route, so navigation is a URL change — links are
  // shareable and the browser's back button works.
  const navigate = useCallback(
    (next: Screen) => {
      router.push(SCREEN_PATHS[next])
      setPaletteOpen(false)
      setNotifOpen(false)
      if (narrow) setRailOpen(false)
    },
    [narrow, router]
  )

  const closeOverlays = useCallback(() => {
    setPaletteOpen(false)
    setNotifOpen(false)
    if (narrow) setRailOpen(false)
  }, [narrow])

  const railWidth = narrow ? (railOpen ? 224 : 0) : railOpen ? 236 : 66
  const showLabels = railOpen

  const [title, subtitle] = SCREEN_META[screen]

  if (loading) return <WorkspaceSkeleton />

  if (!isAuthenticated) return <AuthPage />

  return (
    <NarrowProvider value={narrow}>
      <div
        className="app flex h-screen overflow-hidden bg-[var(--color-bg)] text-[var(--color-text)]"
        style={{ fontFamily: "var(--font-body)" }}
      >
        {/* Backdrop for the overlay rail on narrow screens. */}
        {narrow && railOpen && (
          <button
            type="button"
            aria-label="Close navigation"
            className="fixed inset-0 z-20"
            style={{ background: "var(--color-scrim-soft)" }}
            onClick={() => setRailOpen(false)}
          />
        )}

        <aside
          className="flex flex-none flex-col overflow-hidden border-r border-[var(--color-divider)] transition-[width] duration-200"
          style={{
            width: railWidth,
            background: "var(--color-surface)",
            ...(narrow
              ? {
                  position: "fixed",
                  top: 0,
                  bottom: 0,
                  left: 0,
                  zIndex: 30,
                  boxShadow: railOpen ? "var(--shadow-lg)" : "none",
                }
              : {}),
          }}
        >
          <div className="flex h-[58px] flex-none items-center gap-2.5 border-b border-[var(--color-divider)] px-3.5">
            <span
              className="grid h-[26px] w-[26px] flex-none place-items-center rounded-[9px] border"
              style={{
                borderColor: "var(--color-accent)",
                color: "var(--color-accent)",
              }}
            >
              <BrandMark />
            </span>
            {showLabels && (
              <span
                className="whitespace-nowrap text-[15px] uppercase"
                style={{
                  fontFamily: "var(--font-heading)",
                  fontWeight: 600,
                  letterSpacing: ".06em",
                }}
              >
                Student Hub
              </span>
            )}
          </div>

          <nav className="flex flex-1 flex-col gap-[3px] overflow-auto px-2.5 py-4">
            {showLabels && <p className="eyebrow mb-2 ml-1.5">Workspace</p>}
            {WORKSPACE_NAV.map(({ screen: target, label, Icon }) => (
              <Link
                key={target}
                href={SCREEN_PATHS[target]}
                className="nav-item relative"
                data-active={screen === target}
                onClick={closeOverlays}
                title={
                  target === "chat" && unreadChats > 0
                    ? `${label} — ${unreadChats} unread`
                    : label
                }
              >
                <Icon size={17} strokeWidth={1.5} className="flex-none" />
                {showLabels && (
                  <span className="whitespace-nowrap">{label}</span>
                )}
                {target === "chat" &&
                  unreadChats > 0 &&
                  (showLabels ? (
                    <span
                      className="ml-auto grid h-[19px] min-w-[20px] place-items-center rounded-full px-1.5 text-[11px]"
                      style={{
                        background: "var(--color-accent)",
                        color: "var(--color-bg)",
                        fontFamily: "var(--font-heading)",
                      }}
                    >
                      {unreadChats > 99 ? "99+" : unreadChats}
                    </span>
                  ) : (
                    // Collapsed rail has no room for a number — a dot still says
                    // "something is waiting for you".
                    <span
                      className="pointer-events-none absolute right-[7px] top-[7px] h-2 w-2 rounded-full"
                      style={{
                        background: "var(--color-accent)",
                        outline: "2px solid var(--color-surface)",
                      }}
                    />
                  ))}
              </Link>
            ))}

            {showLabels && (
              <p className="eyebrow mb-2 ml-1.5 mt-[18px]">Community</p>
            )}
            {COMMUNITY_NAV.map(({ screen: target, label, Icon }) => (
              <Link
                key={target}
                href={SCREEN_PATHS[target]}
                className="nav-item"
                data-active={screen === target}
                onClick={closeOverlays}
                title={label}
              >
                <Icon size={17} strokeWidth={1.5} className="flex-none" />
                {showLabels && <span className="whitespace-nowrap">{label}</span>}
              </Link>
            ))}
          </nav>

          <div className="flex flex-none flex-col gap-[3px] border-t border-[var(--color-divider)] p-2.5">
            <Link
              href={SCREEN_PATHS.settings}
              className="nav-item"
              data-active={screen === "settings"}
              onClick={closeOverlays}
              title="Settings"
            >
              <SlidersHorizontal
                size={17}
                strokeWidth={1.5}
                className="flex-none"
              />
              {showLabels && <span className="whitespace-nowrap">Settings</span>}
            </Link>

            <Link
              href={SCREEN_PATHS.settings}
              className="flex w-full items-center gap-2.5 rounded-xl border border-transparent p-2 text-left transition-colors hover:border-[var(--color-divider)]"
              onClick={closeOverlays}
              title={`${user?.username ?? "Profile"} — ${connectionLabel}`}
            >
              {/* This dot is our own socket state, not presence: it answers "am I
                  connected?", which is a different question from who else is. */}
              <span className="relative flex-none">
                <span className="avatar-mono h-7 w-7 text-[11px]">
                  {initialsOf(user?.username)}
                </span>
                <span
                  className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ${
                    connected ? "" : "animate-blink"
                  }`}
                  style={{
                    background: connected
                      ? "var(--color-accent)"
                      : "color-mix(in srgb, var(--color-text) 30%, transparent)",
                    outline: "2px solid var(--color-surface)",
                  }}
                />
              </span>
              {showLabels && (
                <span className="grid overflow-hidden leading-[1.25]">
                  <span className="truncate text-[13px] font-medium">
                    {user?.username}
                  </span>
                  {/* Identity normally; the connection only shouts when broken. */}
                  <span
                    className="truncate text-[11px]"
                    style={{
                      color: connected
                        ? "color-mix(in srgb, var(--color-text) 50%, transparent)"
                        : "var(--color-accent-700)",
                    }}
                  >
                    {connected ? user?.email : connectionLabel}
                  </span>
                </span>
              )}
            </Link>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-[58px] flex-none items-center gap-3.5 border-b border-[var(--color-divider)] px-[clamp(14px,2vw,24px)]">
            <IconButton
              title="Toggle sidebar"
              onClick={() => setRailOpen((v) => !v)}
            >
              <PanelLeft size={16} strokeWidth={1.5} />
            </IconButton>

            <div className="grid min-w-0 leading-[1.2]">
              <span
                className="truncate text-[18px]"
                style={{
                  fontFamily: "var(--font-heading)",
                  fontWeight: 600,
                  letterSpacing: ".02em",
                }}
              >
                {title}
              </span>
              <span
                className="truncate text-[11.5px]"
                style={{
                  color: "color-mix(in srgb, var(--color-text) 55%, transparent)",
                }}
              >
                {subtitle}
              </span>
            </div>

            <div className="flex-1" />

            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="flex h-[34px] min-w-0 items-center gap-2.5 rounded-[10px] border border-[var(--color-divider)] px-2.5 text-[13px] transition-colors hover:border-[var(--color-accent)]"
              style={{
                background: "var(--color-surface)",
                color: "color-mix(in srgb, var(--color-text) 60%, transparent)",
              }}
            >
              <Search size={15} strokeWidth={1.5} className="flex-none" />
              {!narrow && (
                <>
                  <span className="whitespace-nowrap">Search or jump to…</span>
                  <span
                    className="rounded border border-[var(--color-divider)] px-1.5 py-px text-[11px]"
                    style={{
                      fontFamily: "var(--font-heading)",
                      letterSpacing: ".08em",
                    }}
                  >
                    ⌘K
                  </span>
                </>
              )}
            </button>

            <ThemeToggle />

            <div className="relative">
              <IconButton
                title="Notifications"
                onClick={() => setNotifOpen((open) => !open)}
              >
                <Bell size={16} strokeWidth={1.5} />
              </IconButton>
              {/* Only when there is something unread. It used to be painted
                  unconditionally, so the bell claimed new activity forever —
                  including straight after you had read all of it. */}
              {unreadNotifications > 0 && (
                <span
                  className="animate-live-pulse pointer-events-none absolute right-[5px] top-[5px] h-1.5 w-1.5 rounded-full"
                  style={{ background: "var(--color-accent)" }}
                />
              )}

              {notifOpen && (
                <NotificationsPanel
                  onClose={() => setNotifOpen(false)}
                  onNavigate={navigate}
                />
              )}
            </div>
          </header>

          <main className="min-h-0 flex-1">
            <div className="h-full overflow-auto p-[clamp(16px,2.2vw,26px)]">
              {children}
            </div>
          </main>
        </div>

        <AIAssistant narrow={narrow} />

        {paletteOpen && (
          <CommandPalette
            onClose={() => setPaletteOpen(false)}
            onNavigate={navigate}
          />
        )}
      </div>
    </NarrowProvider>
  )
}
