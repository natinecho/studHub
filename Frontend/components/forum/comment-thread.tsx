"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Pencil, Reply, Trash2 } from "lucide-react"
import { initialsOf, relativeTime } from "@/lib/format"
import type { Comment, CommentNode, Id, VoteValue } from "@/lib/api"

/**
 * How deep the indentation is allowed to go before it stops.
 *
 * Past this the rail keeps being drawn but the left offset does not grow —
 * on a phone a fifth level of indent leaves about two words per line, and
 * "who is answering whom" is already carried by the quoted parent name.
 */
const MAX_INDENT_DEPTH = 4

/**
 * Turns the flat list the API returns into a tree.
 *
 * A reply whose parent is missing (its parent was deleted between the two
 * requests, say) is promoted to the top level rather than dropped — losing a
 * reply silently is worse than showing it slightly out of place.
 */
export function buildThread(comments: Comment[]): {
  roots: CommentNode[]
  total: number
} {
  const nodes = new Map<Id, CommentNode>()
  for (const comment of comments) {
    nodes.set(comment._id, {
      ...comment,
      replies: [],
      descendantCount: 0,
      depth: 0,
    })
  }

  const roots: CommentNode[] = []
  for (const node of nodes.values()) {
    const parentId = node.parentComment
    const parent = parentId ? nodes.get(parentId) : undefined
    if (parent && parent !== node) parent.replies.push(node)
    else roots.push(node)
  }

  // Depth and descendant counts in one walk. Iterative rather than recursive
  // so a pathological thread can't blow the stack.
  let total = 0
  const stack: CommentNode[] = [...roots]
  const ordered: CommentNode[] = []
  // `seen` is cycle insurance. Nothing should produce one, but a walk that
  // never terminates would hang the tab rather than show a wrong count.
  const seen = new Set<Id>()
  while (stack.length) {
    const node = stack.pop() as CommentNode
    if (seen.has(node._id)) continue
    seen.add(node._id)
    ordered.push(node)
    total++
    for (const child of node.replies) {
      child.depth = node.depth + 1
      stack.push(child)
    }
  }
  // Deepest first, so a node's children are already counted when we reach it.
  for (const node of ordered.reverse()) {
    node.descendantCount = node.replies.reduce(
      (sum, child) => sum + 1 + child.descendantCount,
      0
    )
  }

  // Oldest first at every level: a conversation reads top to bottom, and a
  // "best first" order would move a reply out from under what it answers.
  const byOldest = (a: CommentNode, b: CommentNode) =>
    Date.parse(a.createdAt) - Date.parse(b.createdAt)
  for (const node of ordered) node.replies.sort(byOldest)
  roots.sort(byOldest)

  return { roots, total }
}

export interface ThreadHandlers {
  onVote: (comment: Comment, vote: 1 | -1) => void
  onReply: (parent: Comment, text: string) => Promise<boolean>
  /** Saves an edit. Resolves false so the box can keep the text on failure. */
  onEdit: (comment: Comment, text: string) => Promise<boolean>
  onDelete: (comment: CommentNode) => void
  /**
   * Someone opened a folded sub-thread. The screen uses this to re-read the
   * comments, so what unfolds is what is on the server right now rather than
   * whatever was there when the discussion was first opened.
   */
  onExpand?: () => void
  /** Ids currently mid-request, so their buttons can lock. */
  busyIds: ReadonlySet<Id>
  /** Signed out readers can look but not act. */
  canAct: boolean
  /** Whose replies get the edit and delete controls. */
  currentUserId?: Id
}

export function CommentThread({
  nodes,
  handlers,
}: {
  nodes: CommentNode[]
  handlers: ThreadHandlers
}) {
  return (
    <div className="grid gap-3.5">
      {nodes.map((node) => (
        <CommentRow key={node._id} node={node} handlers={handlers} />
      ))}
    </div>
  )
}

function CommentRow({
  node,
  handlers,
}: {
  node: CommentNode
  handlers: ThreadHandlers
}) {
  const {
    onVote,
    onReply,
    onEdit,
    onDelete,
    onExpand,
    busyIds,
    canAct,
    currentUserId,
  } = handlers

  // Every answer starts folded, at every depth. A discussion is then a list of
  // the replies to the question itself, and the arguments underneath one of
  // them are opened on purpose — which is also the moment we refetch, so what
  // opens is current.
  const [expanded, setExpanded] = useState(false)
  const [replying, setReplying] = useState(false)
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editDraft, setEditDraft] = useState(node.content)
  const [savingEdit, setSavingEdit] = useState(false)

  const mine = !!currentUserId && node.user?._id === currentUserId
  const busy = busyIds.has(node._id)
  const myVote: VoteValue = node.myVote ?? 0
  const score = (node.upvotes ?? 0) - (node.downvotes ?? 0)

  // Past the cap the rail is still drawn but stops stepping right, so a long
  // chain keeps its shape without squeezing the text off a phone screen.
  const railed = node.depth < MAX_INDENT_DEPTH

  async function send() {
    const text = draft.trim()
    if (!text || sending) return
    setSending(true)
    const ok = await onReply(node, text)
    setSending(false)
    if (ok) {
      setDraft("")
      setReplying(false)
      setExpanded(true)
    }
  }

  function startEditing() {
    setEditDraft(node.content)
    setEditing(true)
  }

  async function saveEdit() {
    const text = editDraft.trim()
    if (!text || savingEdit) return
    if (text === node.content) {
      setEditing(false)
      return
    }
    setSavingEdit(true)
    const ok = await onEdit(node, text)
    setSavingEdit(false)
    if (ok) setEditing(false)
  }

  return (
    <div className="animate-rise-in-fast grid grid-cols-[auto_1fr] gap-2.5">
      <span className="avatar-plain h-[26px] w-[26px] flex-none text-[10px]">
        {initialsOf(node.user?.username)}
      </span>

      <div className="min-w-0">
        <p className="m-0 text-[12.5px]">
          <strong className="font-semibold">
            {node.user?.username ?? "Unknown"}
          </strong>{" "}
          <span
            style={{
              color: "color-mix(in srgb, var(--color-text) 45%, transparent)",
            }}
          >
            {relativeTime(node.createdAt)}
            {/* An edited reply says so. Without it, someone quoting a reply
                that later changed looks like they misread it. */}
            {node.updatedAt &&
              Date.parse(node.updatedAt) - Date.parse(node.createdAt) > 1000 &&
              " · edited"}
          </span>
        </p>

        {editing ? (
          <div className="mt-1.5 grid gap-2">
            <textarea
              autoFocus
              className="field-input text-[13px]"
              style={{ minHeight: 56 }}
              value={editDraft}
              onChange={(event) => setEditDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault()
                  void saveEdit()
                }
                if (event.key === "Escape") setEditing(false)
              }}
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="action-btn"
                style={{ padding: "6px 13px", fontSize: 12 }}
                data-active={!!editDraft.trim() && !savingEdit}
                disabled={!editDraft.trim() || savingEdit}
                onClick={saveEdit}
              >
                {savingEdit ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                className="link-btn"
                onClick={() => setEditing(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p
            className="m-0 mt-1 whitespace-pre-wrap text-[13.5px] leading-[1.55]"
            style={{
              color: "color-mix(in srgb, var(--color-text) 78%, transparent)",
            }}
          >
            {node.content}
          </p>
        )}

        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          <button
            type="button"
            className="vote-btn"
            data-dir="up"
            data-active={myVote === 1}
            disabled={!canAct || busy}
            aria-pressed={myVote === 1}
            title={myVote === 1 ? "Remove your upvote" : "Upvote"}
            onClick={() => onVote(node, 1)}
          >
            <ChevronUp size={13} strokeWidth={1.8} />
            {node.upvotes ?? 0}
          </button>

          <button
            type="button"
            className="vote-btn"
            data-dir="down"
            data-active={myVote === -1}
            disabled={!canAct || busy}
            aria-pressed={myVote === -1}
            title={myVote === -1 ? "Remove your downvote" : "Downvote"}
            onClick={() => onVote(node, -1)}
          >
            <ChevronDown size={13} strokeWidth={1.8} />
            {node.downvotes ?? 0}
          </button>

          {/* The net score is what people actually read a thread by; the two
              raw counts above are for deciding how to vote. */}
          {(node.upvotes || node.downvotes) > 0 && (
            <span
              className="ml-0.5 text-[11px] tabular-nums"
              style={{
                color: "color-mix(in srgb, var(--color-text) 42%, transparent)",
              }}
              title="Net score"
            >
              {score > 0 ? `+${score}` : score}
            </span>
          )}

          {canAct && (
            <button
              type="button"
              className="link-btn"
              data-active={replying}
              onClick={() => setReplying((open) => !open)}
            >
              <Reply size={12} strokeWidth={1.7} />
              Reply
            </button>
          )}

          {node.replies.length > 0 && (
            <button
              type="button"
              className="link-btn"
              aria-expanded={expanded}
              onClick={() => {
                if (!expanded) onExpand?.()
                setExpanded((open) => !open)
              }}
            >
              {expanded ? (
                <ChevronUp size={12} strokeWidth={1.7} />
              ) : (
                <ChevronDown size={12} strokeWidth={1.7} />
              )}
              {expanded
                ? "Hide"
                : `${node.descendantCount} ${
                    node.descendantCount === 1 ? "reply" : "replies"
                  }`}
            </button>
          )}

          {/* Your own reply, and only yours, can be changed or removed. The
              API enforces the same thing — this just stops us offering a
              button that would come back 404. */}
          {mine && !editing && (
            <>
              <button type="button" className="link-btn" onClick={startEditing}>
                <Pencil size={11} strokeWidth={1.7} />
                Edit
              </button>
              <button
                type="button"
                className="link-btn"
                style={{ color: "var(--color-danger)" }}
                onClick={() => onDelete(node)}
              >
                <Trash2 size={11} strokeWidth={1.7} />
                Delete
              </button>
            </>
          )}
        </div>

        {replying && (
          <div className="mt-2 grid gap-2">
            <textarea
              autoFocus
              className="field-input text-[13px]"
              style={{ minHeight: 56 }}
              placeholder={`Reply to ${node.user?.username ?? "this reply"}…`}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              // Enter sends, Shift-Enter breaks the line: a reply is usually
              // one sentence, and reaching for the button every time is worse
              // than the occasional early send.
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault()
                  void send()
                }
                if (event.key === "Escape") setReplying(false)
              }}
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="action-btn"
                style={{ padding: "6px 13px", fontSize: 12 }}
                data-active={!!draft.trim() && !sending}
                disabled={!draft.trim() || sending}
                onClick={send}
              >
                {sending ? "Posting…" : "Reply"}
              </button>
              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  setReplying(false)
                  setDraft("")
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {node.replies.length > 0 && expanded && (
          <div
            className="mt-3 grid gap-3.5 thread-branch"
            style={railed ? undefined : { marginLeft: 0, paddingLeft: 8 }}
          >
            {node.replies.map((child) => (
              <CommentRow key={child._id} node={child} handlers={handlers} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
