"use client"

import { Forum } from "@/components/forum"
import { useNarrow } from "@/lib/shell-layout"

export function ForumScreen() {
  return <Forum narrow={useNarrow()} />
}
