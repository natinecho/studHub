"use client"

import { Settings } from "@/components/settings"
import { useNarrow } from "@/lib/shell-layout"

export function SettingsScreen() {
  return <Settings narrow={useNarrow()} />
}
