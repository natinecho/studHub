"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { ErrorAlert, InlineError } from "@/components/alert-message"
import {
  buildThread,
  CommentThread,
  type ThreadHandlers,
} from "@/components/forum/comment-thread"
import { IconButton } from "@/components/icon-button"
import { Modal } from "@/components/modal"
import { ListCardsSkeleton } from "@/components/skeletons"
import {
  commentsApi,
  DASHBOARD_SCOPES,
  errorMessage,
  invalidate,
  keys,
  mutateCache,
  postsApi,
  useQuery,
  usersApi,
  type Comment,
  type CommentNode,
  type Post,
  type PostPage,
  type VoteValue,
} from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { useConfirm } from "@/lib/confirm"
import { initialsOf, parseTags, relativeTime } from "@/lib/format"

type PostTab = "recent" | "mine" | "favourites"

/**
 * How often an open discussion re-reads its replies.
 *
 * The forum has no live channel of its own — the socket server only carries
 * chat — so without this a reply someone else posted while you were reading
 * only appeared when the screen remounted, which meant refreshing the page.
 * Polling only runs while a discussion is open and the tab is in front, and
 * the same refresh is triggered on focus and on opening a folded sub-thread,
 * so the interval is a backstop rather than the main path.
 */
const REPLY_POLL_INTERVAL = 20_000

export function Forum({ narrow }: { narrow: boolean }) {
  const { user } = useAuth()
  const confirm = useConfirm()

  const [tab, setTab] = useState<PostTab>("recent")
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [activeId, setActiveId] = useState<string | null>(null)
  const [reply, setReply] = useState("")
  const [posting, setPosting] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPost, setEditingPost] = useState<Post | null>(null)
  const [showDetailOnNarrow, setShowDetailOnNarrow] = useState(false)
  // Per-comment, not one global flag: voting on one reply must not freeze the
  // buttons on every other reply in the thread.
  const [votingIds, setVotingIds] = useState<ReadonlySet<string>>(new Set())

  // Typing changes the cache key, so the debounce moved onto the key itself —
  // otherwise every keystroke would be a distinct key and a distinct request.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), query ? 300 : 0)
    return () => clearTimeout(timer)
  }, [query])

  const listParams = useMemo(
    () => ({
      search: debouncedQuery.trim() || undefined,
      myPosts: tab === "mine" || undefined,
      favourites: tab === "favourites" || undefined,
    }),
    [debouncedQuery, tab]
  )

  // `keepPreviousData` is what stops the list flashing empty between a search
  // or tab change and its result: the old rows stay until the new ones land.
  const postsQuery = useQuery<PostPage>(
    keys.posts(listParams),
    () => postsApi.list({ ...listParams, limit: 50 }),
    { keepPreviousData: true }
  )

  const posts = useMemo(() => postsQuery.data?.posts ?? [], [postsQuery.data])
  const loading = postsQuery.isLoading
  const failure = postsQuery.error

  useEffect(() => {
    setActiveId((current) => current ?? posts[0]?._id ?? null)
  }, [posts])

  // The open thread: post and comments as two cached queries rather than one
  // combined fetch, so reopening a discussion you have already read is instant
  // and a new reply only invalidates the comments.
  const activeQuery = useQuery<Post>(
    activeId ? keys.post(activeId) : null,
    () => postsApi.get(activeId as string)
  )
  const commentsQuery = useQuery<Comment[]>(
    activeId ? keys.comments(activeId) : null,
    () => commentsApi.listForPost(activeId as string)
  )

  const active = activeQuery.data ?? null
  const comments = useMemo(
    () => commentsQuery.data ?? [],
    [commentsQuery.data]
  )

  // The API answers flat; the screen shows a tree. Nesting here rather than
  // server-side keeps an optimistic new reply in place without a refetch.
  const { roots: thread, total: replyCount } = useMemo(
    () => buildThread(comments),
    [comments]
  )

  // Re-reads the open discussion. Both queries: a reply that arrived while you
  // were reading also moves the reply count on the post itself.
  const refreshActive = commentsQuery.refresh
  const refreshPost = activeQuery.refresh
  const refreshThread = useCallback(() => {
    if (typeof document !== "undefined" && document.hidden) return
    void refreshActive()
    void refreshPost()
  }, [refreshActive, refreshPost])

  useEffect(() => {
    if (!activeId) return
    const timer = setInterval(refreshThread, REPLY_POLL_INTERVAL)
    // Coming back to the tab is the moment stale replies are most obvious, so
    // that gets an immediate read rather than waiting out the interval.
    window.addEventListener("focus", refreshThread)
    document.addEventListener("visibilitychange", refreshThread)
    return () => {
      clearInterval(timer)
      window.removeEventListener("focus", refreshThread)
      document.removeEventListener("visibilitychange", refreshThread)
    }
  }, [activeId, refreshThread])

  useEffect(() => {
    const failure = activeQuery.error ?? commentsQuery.error
    if (!failure) return
    toast.error(
      errorMessage(failure, "Could not open that discussion.")
    )
  }, [activeQuery.error, commentsQuery.error])

  /** Optimistic edit of the open post, in both the detail and the list row. */
  const patchActive = useCallback(
    (patch: Partial<Post>) => {
      if (!activeId) return
      mutateCache<Post>(keys.post(activeId), (current) => ({
        ...current,
        ...patch,
      }))
      mutateCache<PostPage>(keys.posts(listParams), (page) => ({
        ...page,
        posts: page.posts.map((post) =>
          post._id === activeId ? { ...post, ...patch } : post
        ),
      }))
    },
    [activeId, listParams]
  )

  async function toggleLike() {
    if (!active) return
    try {
      const result = await postsApi.like(active._id)
      patchActive({ isLiked: result.isLiked, likeCount: result.likeCount })
    } catch (caught) {
      toast.error(
        errorMessage(caught, "Could not like the post.")
      )
    }
  }

  async function toggleFavourite() {
    if (!active) return
    try {
      const result = await usersApi.toggleFavourite(active._id)
      patchActive({ isFavourite: result.isFavourites })
      // The favourites tab is a different cache key than the one on screen.
      invalidate(keys.posts({ favourites: true }))
    } catch (caught) {
      toast.error(
        errorMessage(caught, "Could not update favourites.")
      )
    }
  }

  /**
   * Posts one comment. `parent` is null for a top-level reply and the comment
   * being answered otherwise — the two cases differ only in that one field, so
   * the thread and the box at the bottom share this.
   *
   * Resolves to whether it worked, so the nested reply box knows whether to
   * clear itself or leave the student's text where they can retry.
   */
  const submitComment = useCallback(
    async (text: string, parent: Comment | null): Promise<boolean> => {
      if (!active) return false
      try {
        const created = await commentsApi.create({
          post: active._id,
          content: text,
          ...(parent ? { parentComment: parent._id } : {}),
        })
        mutateCache<Comment[]>(keys.comments(active._id), (current) => [
          ...current,
          {
            ...created,
            // The author comes back populated now, but an older API might not
            // send it — falling back to the signed-in user keeps the new reply
            // from rendering as "Unknown" until the next refetch.
            user: created.user ?? {
              _id: user?._id ?? "",
              username: user?.username ?? "You",
            },
            parentComment: parent?._id ?? null,
            upvotes: created.upvotes ?? 0,
            downvotes: created.downvotes ?? 0,
            myVote: 0,
          },
        ])
        patchActive({ commentCount: active.commentCount + 1 })
        return true
      } catch (caught) {
        toast.error(errorMessage(caught, "Could not post a reply."))
        return false
      }
    },
    [active, patchActive, user]
  )

  async function postReply() {
    const text = reply.trim()
    if (!text || !active || posting) return
    setPosting(true)
    const ok = await submitComment(text, null)
    setPosting(false)
    if (ok) setReply("")
  }

  /**
   * Up and down are one action with a sign. The counts move locally first —
   * a vote that waits on a round trip feels broken — and the server's own
   * numbers overwrite the guess when they land.
   */
  const vote = useCallback(
    async (comment: Comment, direction: 1 | -1) => {
      if (!activeId || votingIds.has(comment._id)) return

      const previous: VoteValue = comment.myVote ?? 0
      // Pressing the direction you already chose clears the vote, which is
      // what the API does too.
      const next: VoteValue = previous === direction ? 0 : direction

      const applyLocally = (patch: Partial<Comment>) =>
        mutateCache<Comment[]>(keys.comments(activeId), (current) =>
          current.map((item) =>
            item._id === comment._id ? { ...item, ...patch } : item
          )
        )

      applyLocally({
        myVote: next,
        upvotes:
          (comment.upvotes ?? 0) + (next === 1 ? 1 : 0) - (previous === 1 ? 1 : 0),
        downvotes:
          (comment.downvotes ?? 0) +
          (next === -1 ? 1 : 0) -
          (previous === -1 ? 1 : 0),
      })

      setVotingIds((current) => new Set(current).add(comment._id))
      try {
        const result = await commentsApi.vote(comment._id, direction)
        applyLocally({
          upvotes: result.upvotes,
          downvotes: result.downvotes,
          myVote: result.myVote ?? next,
        })
      } catch (caught) {
        applyLocally({
          myVote: previous,
          upvotes: comment.upvotes ?? 0,
          downvotes: comment.downvotes ?? 0,
        })
        toast.error(errorMessage(caught, "Could not record your vote."))
      } finally {
        setVotingIds((current) => {
          const next = new Set(current)
          next.delete(comment._id)
          return next
        })
      }
    },
    [activeId, votingIds]
  )

  async function deletePost() {
    if (!active) return
    const ok = await confirm({
      title: "Delete discussion?",
      body: `“${active.title}” and all of its replies will be removed. This cannot be undone.`,
    })
    if (!ok) return
    try {
      await postsApi.remove(active._id)
      invalidate(keys.posts(listParams), ...DASHBOARD_SCOPES)
      setActiveId(null)
      setShowDetailOnNarrow(false)
      toast.success("Discussion deleted")
    } catch (caught) {
      toast.error(
        errorMessage(caught, "Could not delete it.")
      )
    }
  }

  /** Rewrites one reply in place. The API returns the saved document. */
  const editComment = useCallback(
    async (comment: Comment, text: string): Promise<boolean> => {
      if (!activeId) return false
      try {
        const updated = await commentsApi.update(comment._id, { content: text })
        mutateCache<Comment[]>(keys.comments(activeId), (current) =>
          current.map((item) =>
            item._id === comment._id
              ? {
                  ...item,
                  content: updated.content ?? text,
                  updatedAt: updated.updatedAt ?? new Date().toISOString(),
                }
              : item
          )
        )
        return true
      } catch (caught) {
        toast.error(errorMessage(caught, "Could not save your edit."))
        return false
      }
    },
    [activeId]
  )

  /**
   * Deleting a reply takes its answers with it — that is what the API does, so
   * the confirmation has to say so and the cache has to drop the same set.
   */
  const deleteComment = useCallback(
    async (comment: CommentNode) => {
      if (!activeId || !active) return
      const buried = comment.descendantCount
      const ok = await confirm({
        title: buried > 0 ? "Delete reply and its answers?" : "Delete reply?",
        body:
          buried > 0
            ? `This reply and the ${buried} ${
                buried === 1 ? "answer" : "answers"
              } below it will be removed. This cannot be undone.`
            : "This reply will be removed. This cannot be undone.",
      })
      if (!ok) return

      try {
        await commentsApi.remove(comment._id)

        // Collect the subtree from what is on screen rather than trusting a
        // count from the server — the two must agree or the reply tally drifts.
        const doomed = new Set<string>([comment._id])
        const walk = (nodes: CommentNode[]) => {
          for (const child of nodes) {
            doomed.add(child._id)
            walk(child.replies)
          }
        }
        walk(comment.replies)

        mutateCache<Comment[]>(keys.comments(activeId), (current) =>
          current.filter((item) => !doomed.has(item._id))
        )
        patchActive({
          commentCount: Math.max(0, active.commentCount - doomed.size),
        })
        toast.success(doomed.size === 1 ? "Reply deleted" : "Replies deleted")
      } catch (caught) {
        toast.error(errorMessage(caught, "Could not delete that reply."))
      }
    },
    [active, activeId, confirm, patchActive]
  )

  const threadHandlers = useMemo<ThreadHandlers>(
    () => ({
      onVote: (comment, direction) => void vote(comment, direction),
      onReply: (parent, text) => submitComment(text, parent),
      onEdit: editComment,
      onDelete: (comment) => void deleteComment(comment),
      onExpand: refreshThread,
      busyIds: votingIds,
      canAct: !!user,
      currentUserId: user?._id,
    }),
    [
      deleteComment,
      editComment,
      refreshThread,
      submitComment,
      user,
      vote,
      votingIds,
    ]
  )

  const isAuthor = useMemo(
    () => !!active && !!user && active.user?._id === user._id,
    [active, user]
  )

  const showList = !narrow || !showDetailOnNarrow
  const showDetail = !narrow || showDetailOnNarrow

  return (
    <div className="animate-rise-in flex max-w-[1440px] flex-col gap-[18px]">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <span
            className="absolute left-[11px] top-1/2 grid -translate-y-1/2"
            style={{
              color: "color-mix(in srgb, var(--color-text) 45%, transparent)",
            }}
          >
            <Search size={15} strokeWidth={1.5} />
          </span>
          <input
            className="field-input h-[38px] pl-[34px]"
            placeholder="Search discussions…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="seg-group">
          {(
            [
              ["recent", "Recent"],
              ["mine", "Mine"],
              ["favourites", "Saved"],
            ] as [PostTab, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className="seg-btn"
              data-active={tab === value}
              onClick={() => setTab(value)}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex flex-none items-center gap-1.5 whitespace-nowrap rounded-[10px] border px-3.5 py-2 text-sm"
          style={{
            background: "var(--color-accent)",
            borderColor: "var(--color-accent)",
            color: "var(--color-bg)",
          }}
        >
          <Plus size={15} strokeWidth={1.5} />
          New post
        </button>
      </div>

      {!!failure && (
        <ErrorAlert error={failure} title="Could not load discussions." />
      )}

      <div
        className="grid items-start gap-[18px]"
        style={{
          gridTemplateColumns: narrow
            ? "1fr"
            : "minmax(260px, 1fr) minmax(0, 1.8fr)",
        }}
      >
        {showList && (
          <div className="flex min-w-0 flex-col gap-3">
            {loading && posts.length === 0 ? (
              <ListCardsSkeleton count={4} />
            ) : posts.length === 0 ? (
              <div className="bp grid place-items-center gap-2 p-8 text-center">
                <MessageCircle
                  size={22}
                  strokeWidth={1.5}
                  style={{ color: "var(--color-accent)" }}
                />
                <p className="m-0 text-[13.5px] opacity-60">
                  No discussions here yet.
                </p>
              </div>
            ) : (
              posts.map((post) => (
                <button
                  key={post._id}
                  type="button"
                  className="list-card"
                  data-active={post._id === activeId}
                  onClick={() => {
                    setActiveId(post._id)
                    setShowDetailOnNarrow(true)
                  }}
                >
                  <span className="flex items-center gap-2">
                    {post.tags?.[0] && (
                      <span className="pill pill-neutral">{post.tags[0]}</span>
                    )}
                    <span
                      className="ml-auto text-[11px]"
                      style={{
                        color:
                          "color-mix(in srgb, var(--color-text) 45%, transparent)",
                      }}
                    >
                      {relativeTime(post.createdAt)}
                    </span>
                  </span>

                  <span
                    className="text-[19px] leading-[1.15]"
                    style={{
                      fontFamily: "var(--font-heading)",
                      fontWeight: 600,
                    }}
                  >
                    {post.title}
                  </span>

                  <span
                    className="line-clamp-2 text-[13px] leading-[1.5]"
                    style={{
                      color:
                        "color-mix(in srgb, var(--color-text) 62%, transparent)",
                    }}
                  >
                    {post.content}
                  </span>

                  <span
                    className="flex flex-wrap items-center gap-3.5 text-xs"
                    style={{
                      color:
                        "color-mix(in srgb, var(--color-text) 52%, transparent)",
                    }}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <span className="avatar-plain h-[22px] w-[22px] text-[10px]">
                        {initialsOf(post.user?.username)}
                      </span>
                      {post.user?.username ?? "Unknown"}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Heart
                        size={13}
                        strokeWidth={1.5}
                        fill={post.isLiked ? "currentColor" : "none"}
                        style={
                          post.isLiked
                            ? { color: "var(--color-accent)" }
                            : undefined
                        }
                      />
                      {post.likeCount}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MessageCircle size={13} strokeWidth={1.5} />
                      {post.commentCount}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        )}

        {showDetail && (
          <section className="bp flex min-w-0 flex-col self-start">
            {!active ? (
              <div className="grid place-items-center gap-3 p-12 text-center">
                <MessageCircle
                  size={26}
                  strokeWidth={1.5}
                  style={{ color: "var(--color-accent)" }}
                />
                <p
                  className="m-0 text-[17px]"
                  style={{ fontFamily: "var(--font-heading)", fontWeight: 600 }}
                >
                  Pick a discussion
                </p>
              </div>
            ) : (
              <>
                <div className="grid gap-2.5 border-b border-[var(--color-divider)] px-4.5 py-4">
                  {narrow && (
                    <button
                      type="button"
                      onClick={() => setShowDetailOnNarrow(false)}
                      className="flex w-fit items-center gap-1.5 rounded-[10px] border border-[var(--color-divider)] px-3 py-1.5 text-[13px]"
                    >
                      <ArrowLeft size={15} strokeWidth={1.5} />
                      Discussions
                    </button>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    {active.tags?.map((tag) => (
                      <span key={tag} className="pill pill-accent">
                        {tag}
                      </span>
                    ))}
                    <span
                      className="text-[11px]"
                      style={{
                        color:
                          "color-mix(in srgb, var(--color-text) 45%, transparent)",
                      }}
                    >
                      {relativeTime(active.createdAt)}
                    </span>
                    <span className="flex-1" />
                    {/* Saving is for other people's discussions. Your own are
                        already one tab away under "Mine", so the star there
                        would only be a second way to find the same post. */}
                    {!isAuthor && (
                      <IconButton
                        title={
                          active.isFavourite
                            ? "Remove from saved"
                            : "Save discussion"
                        }
                        onClick={toggleFavourite}
                      >
                        <Star
                          size={15}
                          strokeWidth={1.5}
                          fill={active.isFavourite ? "currentColor" : "none"}
                          style={
                            active.isFavourite
                              ? { color: "var(--color-accent)" }
                              : undefined
                          }
                        />
                      </IconButton>
                    )}
                    {isAuthor && (
                      <>
                        <IconButton
                          title="Edit discussion"
                          onClick={() => setEditingPost(active)}
                        >
                          <Pencil size={15} strokeWidth={1.5} />
                        </IconButton>
                        <IconButton
                          title="Delete discussion"
                          onClick={deletePost}
                        >
                          <Trash2
                            size={15}
                            strokeWidth={1.5}
                            style={{ color: "var(--color-danger)" }}
                          />
                        </IconButton>
                      </>
                    )}
                  </div>

                  <h2
                    className="m-0 text-[22px] leading-[1.15]"
                    style={{ fontFamily: "var(--font-heading)", fontWeight: 600 }}
                  >
                    {active.title}
                  </h2>

                  <div
                    className="flex items-center gap-2 text-[12.5px]"
                    style={{
                      color:
                        "color-mix(in srgb, var(--color-text) 55%, transparent)",
                    }}
                  >
                    <span className="avatar-plain h-6 w-6 text-[10px]">
                      {initialsOf(active.user?.username)}
                    </span>
                    {active.user?.username ?? "Unknown"}
                  </div>
                </div>

                <div className="grid gap-3.5 border-b border-[var(--color-divider)] p-4.5">
                  <p className="m-0 whitespace-pre-wrap text-sm leading-[1.6]">
                    {active.content}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleLike}
                      className="inline-flex items-center gap-[7px] whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] transition-colors"
                      style={
                        active.isLiked
                          ? {
                              borderColor: "var(--color-accent)",
                              background: "var(--color-accent)",
                              color: "var(--color-bg)",
                            }
                          : { borderColor: "var(--color-divider)" }
                      }
                    >
                      <Heart
                        size={14}
                        strokeWidth={1.5}
                        fill={active.isLiked ? "currentColor" : "none"}
                      />
                      {active.likeCount} {active.isLiked ? "liked" : "likes"}
                    </button>
                    <span className="inline-flex items-center gap-[7px] whitespace-nowrap rounded-full border border-[var(--color-divider)] px-3.5 py-1.5 text-[13px]">
                      <MessageCircle size={14} strokeWidth={1.5} />
                      {replyCount} {replyCount === 1 ? "reply" : "replies"}
                    </span>
                  </div>
                </div>

                <div className="grid max-h-[420px] gap-4 overflow-auto px-4.5 py-3.5">
                  <p className="eyebrow">
                    {replyCount} {replyCount === 1 ? "reply" : "replies"}
                  </p>
                  {replyCount === 0 ? (
                    <p className="m-0 py-2 text-[13px] opacity-55">
                      No replies yet. Be the first.
                    </p>
                  ) : (
                    <CommentThread nodes={thread} handlers={threadHandlers} />
                  )}
                </div>

                <div className="grid gap-2 border-t border-[var(--color-divider)] px-4.5 py-3">
                  <textarea
                    className="field-input text-[13.5px]"
                    style={{ minHeight: 64 }}
                    placeholder="Write a reply…"
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                  />
                  <button
                    type="button"
                    className="action-btn w-fit"
                    data-active={!!reply.trim() && !posting}
                    disabled={!reply.trim() || posting}
                    onClick={postReply}
                  >
                    {posting ? "Posting…" : "Post reply"}
                  </button>
                </div>
              </>
            )}
          </section>
        )}
      </div>

      {modalOpen && (
        <PostModal
          onClose={() => setModalOpen(false)}
          onSaved={(post) => {
            mutateCache<PostPage>(keys.posts(listParams), (page) => ({
              ...page,
              posts: [post, ...page.posts],
            }))
            invalidate(...DASHBOARD_SCOPES)
            setActiveId(post._id)
            setShowDetailOnNarrow(true)
            toast.success("Discussion posted")
          }}
        />
      )}

      {editingPost && (
        <PostModal
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onSaved={(post) => {
            patchActive({
              title: post.title,
              content: post.content,
              tags: post.tags,
            })
            toast.success("Discussion updated")
          }}
        />
      )}
    </div>
  )
}

/**
 * Compose and edit are the same three fields, so they are the same modal.
 * Passing `post` switches it to editing that discussion.
 */
function PostModal({
  post,
  onClose,
  onSaved,
}: {
  post?: Post
  onClose: () => void
  onSaved: (post: Post) => void
}) {
  const isEdit = !!post
  const [title, setTitle] = useState(post?.title ?? "")
  const [content, setContent] = useState(post?.content ?? "")
  const [tags, setTags] = useState((post?.tags ?? []).join(", "))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    const trimmed = title.trim()
    if (!trimmed || saving) return
    setSaving(true)
    setError(null)
    try {
      const body = {
        title: trimmed,
        content: content.trim() || "No details added yet.",
        tags: parseTags(tags),
      }
      const saved = post
        ? await postsApi.update(post._id, body)
        : await postsApi.create(body)
      // An update response can come back thinner than the list row it has to
      // replace, so the original is kept underneath it.
      onSaved(post ? { ...post, ...saved, ...body } : saved)
      onClose()
    } catch (caught) {
      setError(
        errorMessage(
          caught,
          isEdit
            ? "Could not save your changes."
            : "Could not create the discussion."
        )
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      kicker="Forum"
      title={isEdit ? "Edit discussion" : "Start a discussion"}
      onClose={onClose}
      footer={
        <>
          <span className="flex-1" />
          <button
            type="button"
            className="rounded-[10px] border border-[var(--color-divider)] px-4 py-2 text-[13px]"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="action-btn"
            data-active={!!title.trim() && !saving}
            disabled={!title.trim() || saving}
            onClick={save}
          >
            {saving
              ? isEdit
                ? "Saving…"
                : "Posting…"
              : isEdit
                ? "Save changes"
                : "Post"}
          </button>
        </>
      }
    >
      <label className="field-label">
        Title
        <input
          autoFocus
          className="field-input h-10"
          placeholder="Ask a clear question"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>
      <label className="field-label">
        Description
        <textarea
          className="field-input text-[13.5px]"
          style={{ minHeight: 120 }}
          placeholder="A sentence or two of context"
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />
      </label>
      <label className="field-label">
        Tags
        <input
          className="field-input h-10"
          placeholder="algorithms, study-group"
          value={tags}
          onChange={(event) => setTags(event.target.value)}
        />
      </label>
      {error && (
        <InlineError>{error}</InlineError>
      )}
    </Modal>
  )
}
