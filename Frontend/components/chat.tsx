"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Clock,
  MessageCircle,
  Pencil,
  Plus,
  Reply,
  Search,
  Send,
  Trash2,
  Users,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { ErrorAlert } from "@/components/alert-message"
import { IconButton } from "@/components/icon-button"
import { Modal } from "@/components/modal"
import {
  ConversationsSkeleton,
  MessagesSkeleton,
  PeopleRowsSkeleton,
} from "@/components/skeletons"
import {
  chatApi,
  errorMessage,
  keys,
  useQuery,
  usersApi,
  type Conversation,
  type Message,
  type User,
} from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { useChatUnread } from "@/lib/chat-unread"
import { useConfirm } from "@/lib/confirm"
import { useScreenActive } from "@/lib/screen-active"
import { useSocket } from "@/lib/socket-context"
import {
  clockTime,
  initialsOf,
  lastSeenLabel,
  refId,
  refName,
  relativeTime,
} from "@/lib/format"

type ConvoFilter = "all" | "direct" | "group"

/** A conversation that exists only client-side until the first message. */
interface DraftConversation {
  _id: string
  kind: "direct"
  name: string
  peerId: string
  profile_pic: string
  lastMessage: string
  updatedAt: string
  isDraft: true
}

type AnyConversation = Conversation | DraftConversation

function isDraft(convo: AnyConversation): convo is DraftConversation {
  return (convo as DraftConversation).isDraft === true
}

const QUOTE_LENGTH = 90

/**
 * The quoted line shown above a reply. Null when the message isn't a reply,
 * when `replyTo` came back as a bare id, or when the quoted message has since
 * been deleted — a deleted message is gone, so there is nothing to quote.
 */
function quoteOf(message: Message) {
  const reply = message.replyTo
  if (!reply || typeof reply === "string" || reply.deletedAt) return null

  const text = reply.content ?? ""

  return {
    _id: reply._id,
    authorName: refName(reply.sender),
    preview:
      text.length > QUOTE_LENGTH ? `${text.slice(0, QUOTE_LENGTH)}…` : text,
  }
}

/** Hairline action button that appears alongside a bubble on hover. */
function MessageAction({
  title,
  onClick,
  className = "",
  children,
}: {
  title: string
  onClick: () => void
  className?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`grid h-7 w-7 flex-none place-items-center rounded-full border border-[var(--color-divider)] transition-colors hover:border-[var(--color-accent)] ${className}`}
      style={{ background: "var(--color-bg)" }}
    >
      {children}
    </button>
  )
}

/**
 * Delivery ticks on your own messages: one while the server hasn't confirmed
 * it, one solid once stored, two once somebody else has read it.
 */
function ReadReceipt({ pending, seen }: { pending: boolean; seen: boolean }) {
  const title = pending ? "Sending" : seen ? "Seen" : "Sent"
  return (
    <span
      title={title}
      aria-label={title}
      className="inline-flex flex-none items-center"
      style={{ opacity: pending ? 0.5 : 1 }}
    >
      {pending ? (
        <Clock size={12} strokeWidth={1.8} />
      ) : seen ? (
        <CheckCheck size={13} strokeWidth={2} />
      ) : (
        <Check size={13} strokeWidth={2} />
      )}
    </span>
  )
}

/** Small corner dot on an avatar: filled when the person is online. */
function PresenceDot({ online, size = 10 }: { online: boolean; size?: number }) {
  return (
    <span
      className="absolute bottom-0 right-0 rounded-full"
      style={{
        height: size,
        width: size,
        background: online
          ? "var(--color-accent)"
          : "color-mix(in srgb, var(--color-text) 28%, transparent)",
        outline: "2px solid var(--color-bg)",
      }}
    />
  )
}

export function Chat({ narrow }: { narrow: boolean }) {
  const { user } = useAuth()
  const {
    sendDirect,
    sendToGroup,
    editMessage,
    deleteMessage,
    onMessage,
    onMessageUpdate,
    onMessagesSeen,
    markSeen,
    connected,
    presence,
    presenceReady,
  } = useSocket()
  const { counts: unread, markRead, setOpenThread } = useChatUnread()
  const confirm = useConfirm()

  const [conversations, setConversations] = useState<AnyConversation[]>([])
  const [filter, setFilter] = useState<ConvoFilter>("all")
  const [query, setQuery] = useState("")
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState("")
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [showWindowOnNarrow, setShowWindowOnNarrow] = useState(false)
  const [newChatOpen, setNewChatOpen] = useState(false)
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(
    null
  )
  const [highlighted, setHighlighted] = useState<string | null>(null)

  /** Bubble elements, so a reply quote can jump to what it answers. */
  const bubbleRefs = useRef(new Map<string, HTMLDivElement>())

  const scrollRef = useRef<HTMLDivElement>(null)
  const activeIdRef = useRef<string | null>(null)
  activeIdRef.current = activeId

  /** Set when a draft is promoted to a real conversation — see below. */
  const keepMessagesRef = useRef(false)
  const screenActiveRef = useRef(true)

  const active = useMemo(
    () => conversations.find((convo) => convo._id === activeId) ?? null,
    [conversations, activeId]
  )
  const activeRef = useRef<AnyConversation | null>(null)
  activeRef.current = active

  // ── Load conversations ───────────────────────────────────────────────────
  // The list is cached so returning to Chat paints immediately; the merge below
  // stays local state because a draft conversation exists only on this client
  // and must survive every refresh of the server's list.
  const convoQuery = useQuery<Conversation[]>(
    keys.conversations(),
    chatApi.conversations
  )

  const mergeConversations = useCallback((data: Conversation[]) => {
    setConversations((current) => {
      // Keep any draft conversation that hasn't been persisted yet.
      const drafts = current.filter(
        (convo) =>
          isDraft(convo) &&
          !data.some(
            (row) => row.kind === "direct" && row.peerId === convo.peerId
          )
      )
      return [...drafts, ...data]
    })

    // The first message turns a draft into a real conversation with a new id.
    // Follow it, or the open thread would vanish under the user — and keep the
    // messages already on screen so the switch isn't visible.
    const openId = activeIdRef.current
    if (openId?.startsWith("draft-")) {
      const peerId = openId.slice("draft-".length)
      const real = data.find(
        (row) => row.kind === "direct" && row.peerId === peerId
      )
      if (real) {
        keepMessagesRef.current = true
        setActiveId(real._id)
      }
    }
  }, [])

  // Runs on mount with whatever is cached already, so a return visit has its
  // list on screen before the revalidation comes back.
  useEffect(() => {
    if (convoQuery.data) mergeConversations(convoQuery.data)
  }, [convoQuery.data, mergeConversations])

  /** Pull a fresh list — after sending, or when a message arrives. */
  const loadConversations = convoQuery.refresh

  const loading = convoQuery.isLoading
  const failure = convoQuery.error

  // ── Load the open thread ─────────────────────────────────────────────────
  // Keyed on the thread's identity, never on the `active` object: that object
  // is rebuilt every time the conversation list refreshes, and depending on it
  // made every sent or received message refetch the whole thread.
  const openThread = active && !isDraft(active) ? active : null
  const threadKey = openThread ? `${openThread.kind}:${openThread._id}` : null

  useEffect(() => {
    if (!threadKey) {
      setMessages([])
      return
    }

    const [kind, id] = threadKey.split(":")
    let cancelled = false

    // Blank the pane only when genuinely switching threads — on a draft being
    // promoted we already have the right messages up.
    if (keepMessagesRef.current) {
      keepMessagesRef.current = false
    } else {
      setMessages([])
      setLoadingMessages(true)
    }

    const fetcher =
      kind === "group"
        ? chatApi.messagesForGroup(id)
        : chatApi.messagesForConversation(id)

    fetcher
      .then((data) => {
        if (cancelled) return
        setMessages(data)
        const unseen = data
          .filter((message) => refId(message.sender) !== user?._id)
          .map((message) => message._id)
        if (unseen.length) markSeen(unseen)
      })
      .catch((caught) => {
        if (cancelled) return
        setMessages([])
        toast.error(
          errorMessage(caught, "Could not load messages.")
        )
      })
      .finally(() => {
        if (!cancelled) setLoadingMessages(false)
      })

    return () => {
      cancelled = true
    }
  }, [threadKey, user?._id, markSeen])

  // Opening a thread reads it: drop its badge and stop counting new arrivals.
  // Only while the screen is actually on view — messages that land while you're
  // off in Notes should still be counted.
  const screenActive = useScreenActive()
  screenActiveRef.current = screenActive
  useEffect(() => {
    const open = screenActive ? activeId : null
    setOpenThread(open)
    if (open) markRead(open)
    return () => setOpenThread(null)
  }, [activeId, screenActive, markRead, setOpenThread])

  // ── Inbound realtime messages ────────────────────────────────────────────
  useEffect(() => {
    return onMessage((message) => {
      // The server sends the raw document; route it by conversation or group.
      const threadId =
        (message.group as string | undefined) ??
        (message.conversation as string | undefined)
      if (!threadId) return

      if (threadId === activeIdRef.current) {
        setMessages((current) => {
          if (current.some((item) => item._id === message._id)) return current

          // The server echoes our own messages back so we pick up the real id
          // (edit and delete need it). Swap the optimistic copy rather than
          // showing the same line twice.
          const pending = current.findIndex(
            (item) =>
              item._id.startsWith("local-") &&
              item.content === message.content &&
              refId(item.sender) === refId(message.sender)
          )
          if (pending !== -1) {
            const next = [...current]
            next[pending] = message
            return next
          }
          return [...current, message]
        })
        // It's on screen, so it's read — tell the server before it counts.
        if (screenActiveRef.current && refId(message.sender) !== user?._id) {
          markSeen([message._id])
        }
      }

      // Refresh the list so the preview line and ordering stay accurate. This
      // no longer disturbs the open thread, so nothing flashes.
      loadConversations()
    })
  }, [onMessage, loadConversations, markSeen, user?._id])

  // Edits arrive as the whole message and are swapped in place. A deletion is
  // the same event with `deletedAt` set — the message simply leaves the thread.
  useEffect(() => {
    return onMessageUpdate((message) => {
      setMessages((current) =>
        message.deletedAt
          ? current.filter((item) => item._id !== message._id)
          : current.map((item) => (item._id === message._id ? message : item))
      )
      if (message.deletedAt) {
        setReplyTo((current) =>
          current?._id === message._id ? null : current
        )
        setEditing((current) => (current?.id === message._id ? null : current))
      }
      loadConversations()
    })
  }, [onMessageUpdate, loadConversations])

  // Read receipts for messages we sent: add the reader to `seenBy` in place.
  useEffect(() => {
    return onMessagesSeen(({ messageIds, userId: readerId }) => {
      const ids = new Set(messageIds)
      setMessages((current) =>
        current.map((item) =>
          ids.has(item._id) && !item.seenBy.includes(readerId)
            ? { ...item, seenBy: [...item.seenBy, readerId] }
            : item
        )
      )
    })
  }, [onMessagesSeen])

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [messages])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return conversations.filter((convo) => {
      const matchesFilter = filter === "all" || convo.kind === filter
      const matchesQuery =
        !needle ||
        convo.name.toLowerCase().includes(needle) ||
        (convo.lastMessage ?? "").toLowerCase().includes(needle)
      return matchesFilter && matchesQuery
    })
  }, [conversations, filter, query])

  function send() {
    const text = draft.trim()
    if (!text || !active || !user) return

    if (!connected) {
      toast.error("Not connected to the chat server.")
      return
    }

    // Only a saved message can be answered — a still-pending optimistic copy
    // has no server id to point at.
    const answering = replyTo && !replyTo._id.startsWith("local-") ? replyTo : null

    if (active.kind === "group") {
      sendToGroup(active._id, text, answering?._id)
    } else {
      const peerId = active.peerId
      if (!peerId) {
        toast.error("This conversation has no recipient.")
        return
      }
      sendDirect(peerId, text, answering?._id)
    }

    // Shown immediately; the server's echo replaces this with the stored
    // message, which is what carries the id edit and delete need.
    const optimistic: Message = {
      _id: `local-${Date.now()}`,
      sender: { _id: user._id, username: user.username },
      content: text,
      seenBy: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(answering
        ? {
            replyTo: {
              _id: answering._id,
              content: answering.content,
              sender: answering.sender,
            },
          }
        : {}),
      ...(active.kind === "group"
        ? { group: active._id }
        : { conversation: active._id }),
    }
    setMessages((current) => [...current, optimistic])
    setDraft("")
    setReplyTo(null)

    // Give the server a moment to persist, then resync ids and ordering.
    setTimeout(loadConversations, 600)
  }

  function saveEdit() {
    if (!editing) return
    const text = editing.text.trim()
    const original = messages.find((item) => item._id === editing.id)

    if (!text || text === original?.content) {
      setEditing(null)
      return
    }
    if (!connected) {
      toast.error("Not connected to the chat server.")
      return
    }

    // Optimistic: the broadcast will confirm it with the server's timestamp.
    setMessages((current) =>
      current.map((item) =>
        item._id === editing.id
          ? { ...item, content: text, editedAt: new Date().toISOString() }
          : item
      )
    )
    editMessage(editing.id, text)
    setEditing(null)
  }

  async function removeMessage(message: Message) {
    const ok = await confirm({
      title: "Delete message?",
      body: "It will disappear for everyone in this conversation.",
    })
    if (!ok) return
    if (!connected) {
      toast.error("Not connected to the chat server.")
      return
    }
    if (replyTo?._id === message._id) setReplyTo(null)
    // Drop it immediately; the broadcast will confirm for everyone else.
    setMessages((current) =>
      current.filter((item) => item._id !== message._id)
    )
    deleteMessage(message._id)
  }

  /** Scroll to the message a reply quotes and flash it. */
  function jumpTo(messageId: string) {
    const node = bubbleRefs.current.get(messageId)
    if (!node) {
      toast.info("That message isn't loaded in this view.")
      return
    }
    node.scrollIntoView({ behavior: "smooth", block: "center" })
    setHighlighted(messageId)
    window.setTimeout(() => {
      setHighlighted((current) => (current === messageId ? null : current))
    }, 1600)
  }

  function startDirectChat(person: User) {
    const existing = conversations.find(
      (convo) => convo.kind === "direct" && convo.peerId === person._id
    )
    if (existing) {
      setActiveId(existing._id)
    } else {
      const draftConvo: DraftConversation = {
        _id: `draft-${person._id}`,
        kind: "direct",
        name: person.username,
        peerId: person._id,
        profile_pic: person.profile_pic ?? "",
        lastMessage: "",
        updatedAt: new Date().toISOString(),
        isDraft: true,
      }
      setConversations((current) => [draftConvo, ...current])
      setActiveId(draftConvo._id)
    }
    setShowWindowOnNarrow(true)
    setNewChatOpen(false)
  }

  // ── Presence ─────────────────────────────────────────────────────────────
  // Other people's online state comes from the server's presence feed. Our own
  // socket state is a different thing entirely and is shown separately, on the
  // profile row in the rail — a peer isn't "offline" just because we dropped.
  const isPeerOnline = useCallback(
    (peerId: string | null | undefined) =>
      !!peerId && presenceReady && presence[peerId]?.online === true,
    [presence, presenceReady]
  )

  const peerStatusLabel = useCallback(
    (peerId: string | null | undefined) => {
      if (!presenceReady) return "Status unavailable"
      if (isPeerOnline(peerId)) return "Online"
      return lastSeenLabel(peerId ? presence[peerId]?.lastSeen : null)
    },
    [presence, presenceReady, isPeerOnline]
  )

  const showList = !narrow || !showWindowOnNarrow
  const showWindow = !narrow || showWindowOnNarrow

  return (
    <div
      className="grid gap-[18px]"
      style={{
        height: "calc(100vh - 112px)",
        minHeight: 520,
        gridTemplateColumns: narrow
          ? "1fr"
          : "minmax(260px, 330px) minmax(0, 1fr)",
      }}
    >
      {showList && (
        <section className="bp flex min-w-0 flex-col overflow-hidden">
          <div className="grid flex-none gap-2.5 border-b border-[var(--color-divider)] p-3.5">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span
                  className="absolute left-[11px] top-1/2 grid -translate-y-1/2"
                  style={{
                    color:
                      "color-mix(in srgb, var(--color-text) 45%, transparent)",
                  }}
                >
                  <Search size={15} strokeWidth={1.5} />
                </span>
                <input
                  className="field-input h-9 pl-[34px]"
                  placeholder="Search conversations…"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <IconButton
                title="New conversation"
                onClick={() => setNewChatOpen(true)}
              >
                <Plus size={16} strokeWidth={1.5} />
              </IconButton>
            </div>

            <div className="seg-group">
              {(["all", "direct", "group"] as ConvoFilter[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  className="seg-btn"
                  data-active={filter === option}
                  onClick={() => setFilter(option)}
                >
                  {option === "group" ? "Groups" : option}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {loading ? (
              <ConversationsSkeleton />
            ) : failure ? (
              <div className="p-3">
                <ErrorAlert
                  error={failure}
                  title="Could not load your conversations."
                />
              </div>
            ) : visible.length === 0 ? (
              <div className="grid place-items-center gap-2 px-4 py-10 text-center">
                <MessageCircle
                  size={22}
                  strokeWidth={1.5}
                  style={{ color: "var(--color-accent)" }}
                />
                <p className="m-0 text-[13px] opacity-60">
                  No conversations yet.
                </p>
                <button
                  type="button"
                  onClick={() => setNewChatOpen(true)}
                  className="text-[13px]"
                  style={{ color: "var(--color-accent-700)" }}
                >
                  Start one
                </button>
              </div>
            ) : (
              visible.map((convo) => {
                const badge = unread[convo._id] ?? 0
                return (
                  <button
                    key={convo._id}
                    type="button"
                    onClick={() => {
                      setActiveId(convo._id)
                      setShowWindowOnNarrow(true)
                    }}
                    className="mx-2 my-[3px] flex w-[calc(100%-16px)] items-center gap-[11px] rounded-[14px] border px-3 py-[11px] text-left transition-colors"
                    style={{
                      borderColor:
                        convo._id === activeId
                          ? "var(--color-accent)"
                          : "transparent",
                      background:
                        convo._id === activeId
                          ? "color-mix(in srgb, var(--color-accent) 9%, transparent)"
                          : "transparent",
                    }}
                  >
                    <span className="relative flex-none">
                      <span className="avatar-mono h-9 w-9 text-xs">
                        {convo.kind === "group" ? (
                          <Users size={15} strokeWidth={1.5} />
                        ) : (
                          initialsOf(convo.name)
                        )}
                      </span>
                      {convo.kind === "direct" && presenceReady && (
                        <PresenceDot online={isPeerOnline(convo.peerId)} />
                      )}
                    </span>

                    <span className="grid min-w-0 flex-1 gap-0.5 text-left">
                      <span className="flex items-baseline gap-2">
                        <span className="truncate text-[13.5px] font-medium">
                          {convo.name}
                        </span>
                        <span
                          className="ml-auto whitespace-nowrap text-[10.5px]"
                          style={{
                            color:
                              "color-mix(in srgb, var(--color-text) 45%, transparent)",
                          }}
                        >
                          {relativeTime(convo.updatedAt)}
                        </span>
                      </span>
                      <span
                        className="truncate text-xs"
                        style={{
                          color:
                            "color-mix(in srgb, var(--color-text) 55%, transparent)",
                        }}
                      >
                        {convo.lastMessage || "No messages yet"}
                      </span>
                      <span
                        className="text-[10.5px] uppercase [letter-spacing:.06em]"
                        style={{
                          color:
                            "color-mix(in srgb, var(--color-text) 42%, transparent)",
                        }}
                      >
                        {convo.kind === "group"
                          ? `${convo.memberCount} members`
                          : peerStatusLabel(convo.peerId)}
                      </span>
                    </span>

                    {badge > 0 && (
                      <span
                        className="grid h-5 min-w-[20px] flex-none place-items-center rounded-full px-1.5 text-[11px]"
                        style={{
                          background: "var(--color-accent)",
                          color: "var(--color-bg)",
                          fontFamily: "var(--font-heading)",
                        }}
                      >
                        {badge}
                      </span>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </section>
      )}

      {showWindow && (
        <section className="bp flex min-w-0 flex-col overflow-hidden">
          {!active ? (
            <div className="grid flex-1 place-items-center gap-3 p-10 text-center">
              <MessageCircle
                size={26}
                strokeWidth={1.5}
                style={{ color: "var(--color-accent)" }}
              />
              <p
                className="m-0 text-[17px]"
                style={{ fontFamily: "var(--font-heading)", fontWeight: 600 }}
              >
                Pick a conversation
              </p>
              <p className="m-0 text-[13px] opacity-55">
                Choose someone from the list, or start a new chat.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-none items-center gap-3 border-b border-[var(--color-divider)] px-4 py-3">
                {narrow && (
                  <IconButton
                    title="Back"
                    onClick={() => setShowWindowOnNarrow(false)}
                  >
                    <ArrowLeft size={15} strokeWidth={1.5} />
                  </IconButton>
                )}
                <span className="relative flex-none">
                  <span className="avatar-mono h-[34px] w-[34px] text-xs">
                    {active.kind === "group" ? (
                      <Users size={15} strokeWidth={1.5} />
                    ) : (
                      initialsOf(active.name)
                    )}
                  </span>
                  {active.kind === "direct" && presenceReady && (
                    <PresenceDot online={isPeerOnline(active.peerId)} />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="m-0 truncate text-[14.5px] font-medium">
                    {active.name}
                  </p>
                  <p
                    className="m-0 mt-px text-[11.5px]"
                    style={{
                      color:
                        "color-mix(in srgb, var(--color-text) 52%, transparent)",
                    }}
                  >
                    {active.kind === "group"
                      ? `${active.memberCount} members`
                      : peerStatusLabel(active.peerId)}
                  </p>
                </div>
              </div>

              <div
                ref={scrollRef}
                className="flex flex-1 flex-col gap-3 overflow-auto p-4.5"
                style={{
                  background:
                    "color-mix(in srgb, var(--color-text) 2%, transparent)",
                }}
              >
                {loadingMessages ? (
                  <MessagesSkeleton />
                ) : messages.length === 0 ? (
                  <p className="m-0 py-8 text-center text-[13px] opacity-50">
                    No messages yet — say hello.
                  </p>
                ) : (
                  messages.map((message) => {
                    const own = refId(message.sender) === user?._id
                    const senderName =
                      typeof message.sender === "string"
                        ? own
                          ? "You"
                          : active.name
                        : (message.sender.username ?? "Unknown")
                    const quote = quoteOf(message)
                    const isEditing = editing?.id === message._id
                    const pending = message._id.startsWith("local-")
                    // Anyone but us having seen it is enough for two ticks.
                    const seen = message.seenBy.some((id) => id !== user?._id)

                    return (
                      <div
                        key={message._id}
                        ref={(node) => {
                          if (node) bubbleRefs.current.set(message._id, node)
                          else bubbleRefs.current.delete(message._id)
                        }}
                        className="animate-rise-in-fast group flex items-end gap-1.5"
                        style={{
                          justifyContent: own ? "flex-end" : "flex-start",
                        }}
                      >
                        {/* Actions sit outside the bubble so they never reflow
                            the text; they appear on hover or focus. */}
                        {own && !isEditing && !pending && (
                          <span className="flex flex-none gap-0.5 self-center opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                            <MessageAction
                              title="Edit"
                              onClick={() =>
                                setEditing({
                                  id: message._id,
                                  text: message.content,
                                })
                              }
                            >
                              <Pencil size={13} strokeWidth={1.5} />
                            </MessageAction>
                            <MessageAction
                              title="Delete"
                              onClick={() => removeMessage(message)}
                            >
                              <Trash2 size={13} strokeWidth={1.5} />
                            </MessageAction>
                          </span>
                        )}

                        {!isEditing && (
                          <MessageAction
                            title="Reply"
                            className={`self-center opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 ${
                              own ? "order-first" : "order-last"
                            }`}
                            onClick={() => setReplyTo(message)}
                          >
                            <Reply size={13} strokeWidth={1.5} />
                          </MessageAction>
                        )}

                        <div
                          className="bubble transition-shadow"
                          data-own={own}
                          style={
                            highlighted === message._id
                              ? {
                                  boxShadow:
                                    "0 0 0 2px var(--color-accent), var(--shadow-lg)",
                                }
                              : undefined
                          }
                        >
                          <span
                            className="text-[11px] uppercase [letter-spacing:.08em]"
                            style={{
                              fontFamily: "var(--font-heading)",
                              opacity: own ? 0.8 : 0.55,
                            }}
                          >
                            {own ? "You" : senderName}
                          </span>

                          {quote && (
                            <button
                              type="button"
                              onClick={() => jumpTo(quote._id)}
                              title="Go to the replied message"
                              className="mb-0.5 grid w-full gap-0.5 rounded-lg border-l-2 px-2 py-1 text-left transition-opacity hover:opacity-80"
                              style={{
                                borderColor: own
                                  ? "var(--color-bg)"
                                  : "var(--color-accent)",
                                background: own
                                  ? "color-mix(in srgb, var(--color-bg) 18%, transparent)"
                                  : "color-mix(in srgb, var(--color-text) 6%, transparent)",
                              }}
                            >
                              <span
                                className="truncate text-[10.5px] font-medium"
                                style={{ opacity: 0.75 }}
                              >
                                {quote.authorName}
                              </span>
                              <span
                                className="truncate text-[11.5px]"
                                style={{ opacity: 0.7 }}
                              >
                                {quote.preview}
                              </span>
                            </button>
                          )}

                          {isEditing ? (
                            <div className="grid gap-1.5">
                              <textarea
                                autoFocus
                                className="field-input text-[13.5px]"
                                style={{ minHeight: 62, color: "var(--color-text)" }}
                                value={editing.text}
                                onChange={(event) =>
                                  setEditing({
                                    id: message._id,
                                    text: event.target.value,
                                  })
                                }
                                onKeyDown={(event) => {
                                  if (event.key === "Enter" && !event.shiftKey) {
                                    event.preventDefault()
                                    saveEdit()
                                  } else if (event.key === "Escape") {
                                    setEditing(null)
                                  }
                                }}
                              />
                              <span className="flex items-center gap-2">
                                <button
                                  type="button"
                                  className="text-[11.5px] underline"
                                  onClick={() => setEditing(null)}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  className="text-[11.5px] font-medium underline"
                                  onClick={saveEdit}
                                >
                                  Save
                                </button>
                              </span>
                            </div>
                          ) : (
                            <p className="m-0 whitespace-pre-wrap text-sm leading-[1.5]">
                              {message.content}
                            </p>
                          )}

                          <span
                            className="flex items-center gap-1 justify-self-end text-[10.5px]"
                            style={{ opacity: own ? 0.75 : 0.5 }}
                          >
                            {message.editedAt ? "edited · " : ""}
                            {clockTime(message.createdAt)}
                            {own && (
                              <ReadReceipt pending={pending} seen={seen} />
                            )}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {replyTo && (
                <div className="flex flex-none items-center gap-2 border-t border-[var(--color-divider)] px-3.5 pt-2.5">
                  <span
                    className="grid min-w-0 flex-1 gap-0.5 rounded-lg border-l-2 px-2.5 py-1.5"
                    style={{
                      borderColor: "var(--color-accent)",
                      background:
                        "color-mix(in srgb, var(--color-accent) 8%, transparent)",
                    }}
                  >
                    <span className="text-[10.5px] uppercase [letter-spacing:.08em] opacity-60">
                      Replying to{" "}
                      {refId(replyTo.sender) === user?._id
                        ? "yourself"
                        : refName(replyTo.sender)}
                    </span>
                    <span className="truncate text-[12.5px] opacity-80">
                      {replyTo.content}
                    </span>
                  </span>
                  <IconButton
                    title="Cancel reply"
                    onClick={() => setReplyTo(null)}
                  >
                    <X size={15} strokeWidth={1.5} />
                  </IconButton>
                </div>
              )}

              <div
                className={`flex flex-none items-end gap-2 px-3.5 py-3 ${
                  replyTo ? "" : "border-t border-[var(--color-divider)]"
                }`}
              >
                <input
                  className="field-input h-10"
                  placeholder={replyTo ? "Write a reply…" : "Write a message…"}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") send()
                    else if (event.key === "Escape") setReplyTo(null)
                  }}
                />
                <button
                  type="button"
                  title="Send"
                  aria-label="Send"
                  className="send-btn"
                  data-active={draft.trim().length > 0}
                  disabled={!draft.trim()}
                  onClick={send}
                >
                  <Send size={16} strokeWidth={1.5} />
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {newChatOpen && (
        <NewChatDialog
          onClose={() => setNewChatOpen(false)}
          onPick={startDirectChat}
        />
      )}
    </div>
  )
}

/** People search backed by GET /api/users?search= */
function NewChatDialog({
  onClose,
  onPick,
}: {
  onClose: () => void
  onPick: (user: User) => void
}) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const { presence, presenceReady } = useSocket()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const timer = setTimeout(() => {
      usersApi
        .search(query.trim() || undefined)
        .then((data) => {
          if (!cancelled) setResults(data)
        })
        .catch(() => {
          if (!cancelled) setResults([])
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query])

  return (
    <Modal
      kicker="Messages"
      title="New conversation"
      onClose={onClose}
      bodyClassName="grid content-start gap-1.5 pb-[22px]"
    >
      <div
        className="sticky top-0 z-10 pb-3 pt-[22px]"
        style={{ background: "var(--color-bg)" }}
      >
        <input
          autoFocus
          className="field-input h-10"
          placeholder="Search people by name or email…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div>
        {loading ? (
          <PeopleRowsSkeleton count={4} />
        ) : results.length === 0 ? (
          <p className="m-0 py-6 text-center text-[13px] opacity-50">
            No one found.
          </p>
        ) : (
          results.map((person) => (
            <button
              key={person._id}
              type="button"
              onClick={() => onPick(person)}
              className="hover-row flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left"
            >
              <span className="relative flex-none">
                <span className="avatar-mono h-8 w-8 text-[11px]">
                  {initialsOf(person.username)}
                </span>
                {presenceReady && (
                  <PresenceDot online={presence[person._id]?.online === true} size={9} />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-medium">
                  {person.username}
                </span>
                <span
                  className="block truncate text-[11.5px]"
                  style={{
                    color:
                      "color-mix(in srgb, var(--color-text) 50%, transparent)",
                  }}
                >
                  {person.email}
                </span>
              </span>
            </button>
          ))
        )}
      </div>
    </Modal>
  )
}
