"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { chatApi } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { useSocket } from "@/lib/socket-context"

interface ChatUnreadValue {
  /** Unread messages per conversation or group id. */
  counts: Record<string, number>
  total: number
  /** Re-read the authoritative counts from the API. */
  refresh: () => Promise<void>
  /** Zero a thread locally the moment it's opened. */
  markRead: (threadId: string) => void
  /** The thread on screen — inbound messages for it never count as unread. */
  setOpenThread: (threadId: string | null) => void
}

const ChatUnreadContext = createContext<ChatUnreadValue | null>(null)

/**
 * Unread counts live here rather than inside the Chat screen, because the
 * sidebar has to show a badge before Chat has ever been opened. The API is the
 * source of truth (so counts survive a reload); the socket keeps them live
 * between fetches.
 */
export function ChatUnreadProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const { onMessage } = useSocket()

  const [counts, setCounts] = useState<Record<string, number>>({})
  const openThreadRef = useRef<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const data = await chatApi.conversations()
      setCounts(() => {
        const next: Record<string, number> = {}
        for (const convo of data) {
          // Whatever is open has just been marked seen; don't re-badge it.
          if (convo._id === openThreadRef.current) continue
          if (convo.unreadCount > 0) next[convo._id] = convo.unreadCount
        }
        return next
      })
    } catch {
      // A failed poll shouldn't clear a badge the user can act on.
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      setCounts({})
      return
    }
    refresh()
  }, [isAuthenticated, refresh])

  const markRead = useCallback((threadId: string) => {
    setCounts((current) => {
      if (!current[threadId]) return current
      const next = { ...current }
      delete next[threadId]
      return next
    })
  }, [])

  const setOpenThread = useCallback((threadId: string | null) => {
    openThreadRef.current = threadId
  }, [])

  // Live increments. The server persists the message before emitting, so a
  // refresh triggered by the same event would agree with this count anyway.
  useEffect(() => {
    return onMessage((message) => {
      const threadId =
        (message.group as string | undefined) ??
        (message.conversation as string | undefined)
      if (!threadId || threadId === openThreadRef.current) return
      setCounts((current) => ({
        ...current,
        [threadId]: (current[threadId] ?? 0) + 1,
      }))
    })
  }, [onMessage])

  const total = useMemo(
    () => Object.values(counts).reduce((sum, n) => sum + n, 0),
    [counts]
  )

  const value = useMemo<ChatUnreadValue>(
    () => ({ counts, total, refresh, markRead, setOpenThread }),
    [counts, total, refresh, markRead, setOpenThread]
  )

  return (
    <ChatUnreadContext.Provider value={value}>
      {children}
    </ChatUnreadContext.Provider>
  )
}

export function useChatUnread() {
  const context = useContext(ChatUnreadContext)
  if (!context) {
    throw new Error("useChatUnread must be used inside <ChatUnreadProvider>")
  }
  return context
}
