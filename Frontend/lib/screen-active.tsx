"use client"

import { createContext, useContext, type ReactNode } from "react"

/**
 * Screens are routes, so each one mounts fresh when you navigate to it and
 * unmounts when you leave — nothing marks a screen inactive and the default
 * here stays `true`. The context is kept for screens rendered inside another
 * one (a panel that can be hidden), which still need to know when they return.
 *
 * Keeping a visited screen's *data* across navigation is a separate concern,
 * handled by the cache in `lib/api/cache.ts`. The `useRefreshOnReturn` hook
 * that used to live here assumed screens stayed mounted, so it never fired
 * once they became routes; the cache's revalidate-on-mount replaces it.
 */
const ScreenActiveContext = createContext(true)

export function ScreenActiveProvider({
  active,
  children,
}: {
  active: boolean
  children: ReactNode
}) {
  return (
    <ScreenActiveContext.Provider value={active}>
      {children}
    </ScreenActiveContext.Provider>
  )
}

export function useScreenActive() {
  return useContext(ScreenActiveContext)
}
