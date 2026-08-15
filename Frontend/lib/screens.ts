/** The six top-level screens in the design's navigation. */
export type Screen =
  | "dashboard"
  | "notes"
  | "chat"
  | "forum"
  | "groups"
  | "settings"

/** Header title and subtitle for each screen. */
export const SCREEN_META: Record<Screen, [title: string, subtitle: string]> = {
  dashboard: ["Dashboard", "Your week at a glance"],
  notes: ["Notes", "Write and edit together, live"],
  chat: ["Messages", "Direct and group conversations"],
  forum: ["Forum", "Ask, answer and find study partners"],
  groups: ["Groups", "Study groups and project teams"],
  settings: ["Settings", "Account, privacy and preferences"],
}

/** Each screen is its own URL, so it can be linked, bookmarked and shared. */
export const SCREEN_PATHS: Record<Screen, string> = {
  dashboard: "/dashboard",
  notes: "/notes",
  chat: "/chat",
  forum: "/forum",
  groups: "/groups",
  settings: "/settings",
}

const PATH_SCREENS = Object.entries(SCREEN_PATHS) as [Screen, string][]

/** Resolves the active screen from a pathname; `/` falls back to the dashboard. */
export function screenFromPath(pathname: string | null): Screen {
  const found = PATH_SCREENS.find(
    ([, path]) => pathname === path || pathname?.startsWith(`${path}/`)
  )
  return found ? found[0] : "dashboard"
}
