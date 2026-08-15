"use client"

import { createContext, useContext, useEffect, useState } from "react"

/**
 * Screens now live at their own routes, so they are rendered as the layout's
 * children rather than by the shell itself — this context is how they still
 * learn about the shell's 880px breakpoint without prop drilling.
 */
const NarrowContext = createContext(false)

/** Tracks the design's 880px breakpoint. */
export function useNarrowState() {
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    function onResize() {
      setNarrow(window.innerWidth < 880)
    }
    onResize()
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])
  return narrow
}

export const NarrowProvider = NarrowContext.Provider

/** True when the viewport is below the 880px breakpoint. */
export function useNarrow() {
  return useContext(NarrowContext)
}
