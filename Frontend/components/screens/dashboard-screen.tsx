"use client"

import { useRouter } from "next/navigation"
import { Dashboard } from "@/components/dashboard"
import { SCREEN_PATHS, type Screen } from "@/lib/screens"
import { useNarrow } from "@/lib/shell-layout"

export function DashboardScreen() {
  const router = useRouter()
  const narrow = useNarrow()
  return (
    <Dashboard
      narrow={narrow}
      onNavigate={(screen: Screen) => router.push(SCREEN_PATHS[screen])}
    />
  )
}
