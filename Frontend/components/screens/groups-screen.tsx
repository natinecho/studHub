"use client"

import { Groups } from "@/components/groups"
import { useNarrow } from "@/lib/shell-layout"

export function GroupsScreen() {
  return <Groups narrow={useNarrow()} />
}
