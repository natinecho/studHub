"use client"

import { useEffect, useRef, useState } from "react"
import {
  AlertTriangle,
  MessageSquarePlus,
  Send,
  Sparkles,
  X,
} from "lucide-react"
import { IconButton } from "@/components/icon-button"
import { Markdown } from "@/components/markdown"
import { aiApi, errorMessage, type AIChatTurn } from "@/lib/api"

interface Bubble {
  id: string
  bot: boolean
  text: string
  /** A failed turn, not an answer — painted as a warning, not as the model. */
  error?: boolean
}

/**
 * Two study prompts and one about the app itself, because "where do I find…"
 * is the assistant's other job and nothing else on screen advertises it.
 */
const QUICK_ASKS = [
  "Explain a concept",
  "Quiz me on a topic",
  "How do I share a note?",
] as const

const GREETING: Bubble = {
  id: "greeting",
  bot: true,
  text: "Hi! I'm your study assistant. Ask me to explain a topic, quiz you, or break down something you're stuck on — and I can also show you around Student Hub. What are you working on?",
}

export function AIAssistant({ narrow }: { narrow: boolean }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Bubble[]>([GREETING])
  const [draft, setDraft] = useState("")
  const [thinking, setThinking] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  /** Bumped by "New chat", so a reply to the previous thread is discarded. */
  const conversationRef = useRef(0)

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [messages, thinking])

  /**
   * Clears the thread back to the greeting. Deliberately does not wait for an
   * answer in flight: the reply from the old conversation would otherwise land
   * in the new one. `thinking` is reset so the composer unlocks immediately,
   * and the stale response is dropped when it arrives.
   */
  function startNewChat() {
    conversationRef.current += 1
    setMessages([GREETING])
    setDraft("")
    setThinking(false)
  }

  async function ask(text: string) {
    const trimmed = text.trim()
    if (!trimmed || thinking) return

    // The API takes the prior turns as history. The greeting isn't one, and
    // neither is a failure notice — replaying "couldn't reach the server" as
    // something the model said would poison the next answer.
    const history: AIChatTurn[] = messages
      .filter((message) => message.id !== "greeting" && !message.error)
      .map((message) => ({
        role: message.bot ? "model" : "user",
        text: message.text,
      }))

    setMessages((current) => [
      ...current,
      { id: `u-${Date.now()}`, bot: false, text: trimmed },
    ])
    setDraft("")
    setThinking(true)

    // The thread this answer belongs to. If "New chat" is pressed while the
    // request is in flight, this no longer matches and the reply is dropped
    // rather than appended to the fresh conversation.
    const conversation = conversationRef.current

    try {
      const result = await aiApi.chat(trimmed, history)
      if (conversationRef.current !== conversation) return
      setMessages((current) => [
        ...current,
        {
          id: `a-${Date.now()}`,
          bot: true,
          text: result.detailed || result.summary || "No answer came back.",
        },
      ])
    } catch (caught) {
      if (conversationRef.current !== conversation) return
      setMessages((current) => [
        ...current,
        {
          id: `e-${Date.now()}`,
          bot: true,
          error: true,
          text: errorMessage(
            caught,
            "Sorry — I couldn't answer that just now. Try again in a moment."
          ),
        },
      ])
    } finally {
      // Guarded too: the new thread must not be left stuck on "thinking".
      if (conversationRef.current === conversation) setThinking(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        title="AI study assistant"
        aria-label="Open AI study assistant"
        onClick={() => setOpen(true)}
        className="fixed bottom-[22px] right-[22px] z-30 grid h-[52px] w-[52px] place-items-center rounded-full border transition-colors"
        style={{
          background: "var(--color-accent)",
          borderColor: "var(--color-accent)",
          color: "var(--color-bg)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <Sparkles size={22} strokeWidth={1.5} />
      </button>
    )
  }

  return (
    <aside
      className="animate-rise-in-fast fixed z-35 flex flex-col overflow-hidden rounded-[18px] border border-[var(--color-divider)]"
      style={{
        right: narrow ? 12 : 22,
        bottom: narrow ? 12 : 22,
        width: "min(380px, calc(100vw - 24px))",
        height: "min(520px, calc(100vh - 44px))",
        background: "var(--color-bg)",
        boxShadow: "var(--shadow-lg)",
        zIndex: 35,
      }}
    >
      <div className="flex flex-none items-center gap-2.5 border-b border-[var(--color-divider)] px-4 py-3.5">
        <span
          className="grid h-7 w-7 flex-none place-items-center rounded-[8px] border"
          style={{
            borderColor: "var(--color-accent)",
            color: "var(--color-accent)",
          }}
        >
          <Sparkles size={15} strokeWidth={1.5} />
        </span>
        <div className="min-w-0 flex-1">
          <p
            className="m-0 text-[16px]"
            style={{ fontFamily: "var(--font-heading)", fontWeight: 600 }}
          >
            Study assistant
          </p>
          <p
            className="m-0 text-[11px]"
            style={{
              color: "color-mix(in srgb, var(--color-text) 50%, transparent)",
            }}
          >
            Studying and finding your way around
          </p>
        </div>
        {/* Only worth offering once there is a conversation to clear. Every
            prior turn is sent as history on the next question, so a long thread
            about one subject drags on the answers to the next — starting fresh
            is how you change topic cleanly, and it costs no request. */}
        {messages.length > 1 && (
          <IconButton title="New chat" onClick={startNewChat}>
            <MessageSquarePlus size={15} strokeWidth={1.5} />
          </IconButton>
        )}
        <IconButton title="Close" onClick={() => setOpen(false)}>
          <X size={15} strokeWidth={1.5} />
        </IconButton>
      </div>

      <div
        ref={scrollRef}
        className="flex flex-1 flex-col gap-3 overflow-auto p-4"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className="animate-rise-in-fast flex"
            style={{ justifyContent: message.bot ? "flex-start" : "flex-end" }}
          >
            <div
              className="bubble"
              data-own={!message.bot}
              style={{
                maxWidth: "86%",
                // A failure is not the assistant talking, so it must not look
                // like an answer the student could act on.
                ...(message.error
                  ? {
                      borderColor:
                        "color-mix(in srgb, var(--color-warning) 45%, transparent)",
                      background: "var(--color-warning-bg)",
                      color: "var(--color-warning-fg)",
                    }
                  : null),
              }}
            >
              {message.error ? (
                <p className="m-0 flex items-start gap-2 text-[13px] leading-[1.5]">
                  <AlertTriangle
                    size={14}
                    strokeWidth={1.7}
                    className="mt-[3px] flex-none"
                  />
                  <span>{message.text}</span>
                </p>
              ) : /* The model answers in Markdown; render it rather than
                     showing the asterisks and hashes raw. */
              message.bot ? (
                <Markdown className="text-[13.5px]">{message.text}</Markdown>
              ) : (
                <p className="m-0 whitespace-pre-wrap text-[13.5px] leading-[1.55]">
                  {message.text}
                </p>
              )}
            </div>
          </div>
        ))}

        {thinking && (
          <span className="flex w-fit gap-[3px] rounded-[16px] border border-[var(--color-divider)] px-3 py-2.5">
            {[0, 0.2, 0.4].map((delay) => (
              <span
                key={delay}
                className="animate-blink h-[5px] w-[5px] rounded-full"
                style={{
                  background: "var(--color-accent)",
                  animationDelay: `${delay}s`,
                }}
              />
            ))}
          </span>
        )}
      </div>

      <div className="grid flex-none gap-2.5 border-t border-[var(--color-divider)] px-3.5 py-3">
        <div className="flex flex-wrap gap-1.5">
          {QUICK_ASKS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => ask(prompt)}
              disabled={thinking}
              className="h-7 whitespace-nowrap rounded-[10px] border border-[var(--color-divider)] px-2.5 text-xs transition-colors hover:border-[var(--color-accent)] disabled:opacity-45"
            >
              {prompt}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className="field-input h-[38px]"
            placeholder="Ask about a topic, or about Student Hub…"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") ask(draft)
            }}
          />
          <button
            type="button"
            title="Send"
            aria-label="Send"
            className="send-btn h-[38px] w-[38px]"
            data-active={draft.trim().length > 0 && !thinking}
            onClick={() => ask(draft)}
            disabled={!draft.trim() || thinking}
          >
            <Send size={16} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </aside>
  )
}
