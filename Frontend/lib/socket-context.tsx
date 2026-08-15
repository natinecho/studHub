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
import { io, type Socket } from "socket.io-client"
import { API_BASE_URL, type Message } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"

type MessageHandler = (message: Message) => void

/** Someone read a batch of our messages. */
export interface SeenEvent {
  messageIds: string[]
  userId: string
}
type SeenHandler = (event: SeenEvent) => void

export interface Presence {
  online: boolean
  /** When they were last connected; null if we've never seen them. */
  lastSeen: string | null
}

interface SocketContextValue {
  /** Whether *this* client is talking to the chat server. */
  connected: boolean
  /** Everyone's presence by user id. Only meaningful once `presenceReady`. */
  presence: Record<string, Presence>
  /** True once the server has sent the initial roster. */
  presenceReady: boolean
  sendDirect: (receiverId: string, content: string, replyTo?: string) => void
  sendToGroup: (groupId: string, content: string, replyTo?: string) => void
  editMessage: (messageId: string, content: string) => void
  deleteMessage: (messageId: string) => void
  markSeen: (messageIds: string[]) => void
  /** Subscribe to inbound messages. Returns an unsubscribe function. */
  onMessage: (handler: MessageHandler) => () => void
  /** Subscribe to edits and deletions of messages already on screen. */
  onMessageUpdate: (handler: MessageHandler) => () => void
  /** Subscribe to read receipts for messages we sent. */
  onMessagesSeen: (handler: SeenHandler) => () => void
}

const SocketContext = createContext<SocketContextValue | null>(null)

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const socketRef = useRef<Socket | null>(null)
  const handlersRef = useRef(new Set<MessageHandler>())
  const updateHandlersRef = useRef(new Set<MessageHandler>())
  const seenHandlersRef = useRef(new Set<SeenHandler>())
  const [connected, setConnected] = useState(false)
  const [presence, setPresence] = useState<Record<string, Presence>>({})
  const [presenceReady, setPresenceReady] = useState(false)

  useEffect(() => {
    if (!user?._id) return

    // The server identifies the socket from handshake.query.userId.
    const socket = io(API_BASE_URL, {
      query: { userId: user._id },
      transports: ["websocket", "polling"],
    })
    socketRef.current = socket

    const emitToHandlers = (message: Message) => {
      handlersRef.current.forEach((handler) => handler(message))
    }

    socket.on("connect", () => {
      setConnected(true)
      // Drain anything queued while we were offline.
      socket.emit("get_pending")
    })
    socket.on("disconnect", () => {
      setConnected(false)
      // We can't see anyone while we're not connected — say "unknown" rather
      // than reporting a stale roster as if it were current.
      setPresenceReady(false)
    })
    socket.on("receive_dm", emitToHandlers)
    socket.on("receive_group", emitToHandlers)
    socket.on("pending_messages", (messages: Message[]) => {
      if (Array.isArray(messages)) messages.forEach(emitToHandlers)
    })

    const emitToUpdateHandlers = (message: Message) => {
      updateHandlersRef.current.forEach((handler) => handler(message))
    }
    socket.on("message_updated", emitToUpdateHandlers)

    const emitToSeenHandlers = (event: SeenEvent) => {
      seenHandlersRef.current.forEach((handler) => handler(event))
    }
    socket.on("messages_seen", emitToSeenHandlers)

    type PresenceRow = {
      userId: string
      isOnline: boolean
      lastSeen: string | null
    }

    socket.on("presence_snapshot", (rows: PresenceRow[]) => {
      if (!Array.isArray(rows)) return
      setPresence(
        Object.fromEntries(
          rows.map((row) => [
            row.userId,
            { online: !!row.isOnline, lastSeen: row.lastSeen ?? null },
          ])
        )
      )
      setPresenceReady(true)
    })
    socket.on("presence", ({ userId, isOnline, lastSeen }: PresenceRow) => {
      if (!userId) return
      setPresence((current) => ({
        ...current,
        [userId]: {
          online: !!isOnline,
          // Keep the previous stamp if this event didn't carry one.
          lastSeen: lastSeen ?? current[userId]?.lastSeen ?? null,
        },
      }))
    })

    return () => {
      socket.off("receive_dm", emitToHandlers)
      socket.off("receive_group", emitToHandlers)
      socket.off("message_updated", emitToUpdateHandlers)
      socket.off("messages_seen", emitToSeenHandlers)
      socket.disconnect()
      socketRef.current = null
      setConnected(false)
      setPresence({})
      setPresenceReady(false)
    }
  }, [user?._id])

  const sendDirect = useCallback(
    (receiverId: string, content: string, replyTo?: string) => {
      socketRef.current?.emit("send_dm", { receiverId, content, replyTo })
    },
    []
  )

  const sendToGroup = useCallback(
    (groupId: string, content: string, replyTo?: string) => {
      socketRef.current?.emit("send_group", { groupId, content, replyTo })
    },
    []
  )

  const editMessage = useCallback((messageId: string, content: string) => {
    socketRef.current?.emit("edit_message", { messageId, content })
  }, [])

  const deleteMessage = useCallback((messageId: string) => {
    socketRef.current?.emit("delete_message", { messageId })
  }, [])

  const markSeen = useCallback(
    (messageIds: string[]) => {
      if (!messageIds.length || !user?._id) return
      socketRef.current?.emit("mark_seen", { messageIds, userId: user._id })
    },
    [user?._id]
  )

  const onMessage = useCallback((handler: MessageHandler) => {
    handlersRef.current.add(handler)
    return () => {
      handlersRef.current.delete(handler)
    }
  }, [])

  const onMessageUpdate = useCallback((handler: MessageHandler) => {
    updateHandlersRef.current.add(handler)
    return () => {
      updateHandlersRef.current.delete(handler)
    }
  }, [])

  const onMessagesSeen = useCallback((handler: SeenHandler) => {
    seenHandlersRef.current.add(handler)
    return () => {
      seenHandlersRef.current.delete(handler)
    }
  }, [])

  const value = useMemo<SocketContextValue>(
    () => ({
      connected,
      presence,
      presenceReady,
      sendDirect,
      sendToGroup,
      editMessage,
      deleteMessage,
      markSeen,
      onMessage,
      onMessageUpdate,
      onMessagesSeen,
    }),
    [
      connected,
      presence,
      presenceReady,
      sendDirect,
      sendToGroup,
      editMessage,
      deleteMessage,
      markSeen,
      onMessage,
      onMessageUpdate,
      onMessagesSeen,
    ]
  )

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  )
}

export function useSocket() {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error("useSocket must be used inside <SocketProvider>")
  }
  return context
}
