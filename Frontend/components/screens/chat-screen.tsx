"use client"

import { Chat } from "@/components/chat"
import { useNarrow } from "@/lib/shell-layout"

export function ChatScreen() {
  return <Chat narrow={useNarrow()} />
}
