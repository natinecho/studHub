"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowLeft,
  Download,
  FileText,
  Link2Off,
  Plus,
  Search,
  Share2,
  Sparkles,
  Tag,
  Trash2,
  Users,
} from "lucide-react"
import { toast } from "sonner"
import { ErrorAlert } from "@/components/alert-message"
import { Markdown } from "@/components/markdown"
import { NoteModal } from "@/components/notes/note-modal"
import { EditorToolbar } from "@/components/notes/editor-toolbar"
import {
  MathBlock,
  MathInline,
  StyledBulletList,
  SymbolShortcuts,
} from "@/components/notes/editor-extensions"
import {
  ListCardsSkeleton,
  NoteEditorSkeleton,
  Sk,
} from "@/components/skeletons"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import Highlight from "@tiptap/extension-highlight"
import TaskList from "@tiptap/extension-task-list"
import TaskItem from "@tiptap/extension-task-item"
import Link from "@tiptap/extension-link"
import {
  aiApi,
  DASHBOARD_SCOPES,
  errorMessage,
  invalidate,
  keys,
  mutateCache,
  notesApi,
  useQuery,
  type Note,
  type NoteSummary,
} from "@/lib/api"
import { initialsOf, parseTags, relativeTime } from "@/lib/format"
import { useConfirm } from "@/lib/confirm"

type NoteFilter = "all" | "personal" | "group"

/**
 * How long the editor stays quiet before a save goes out.
 *
 * Typing is local and instant either way — this only controls the round-trip.
 * At under a second it fired mid-sentence and sent the whole document every
 * time; five seconds of stillness is one save per pause instead of per word.
 */
const AUTOSAVE_DELAY = 5_000

export function Notes() {
  const confirm = useConfirm()

  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [filter, setFilter] = useState<NoteFilter>("all")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [saveState, setSaveState] = useState<
    "idle" | "unsaved" | "saving" | "saved"
  >("idle")
  const [summary, setSummary] = useState<string | null>(null)
  const [summarizing, setSummarizing] = useState(false)
  const [narrow, setNarrow] = useState(false)
  const [showEditorOnNarrow, setShowEditorOnNarrow] = useState(false)
  const [editingTags, setEditingTags] = useState(false)
  const [tagDraft, setTagDraft] = useState("")
  const [savingTags, setSavingTags] = useState(false)
  const [sharing, setSharing] = useState(false)

  const dirtyRef = useRef(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  /**
   * The current `persist`, so the things that have to reach it — the debounce
   * timer, the unmount flush, switching notes — can do so without listing it as
   * a dependency. It closes over the note and the title, so a dependency on it
   * re-runs on every keystroke; when that was wired to an effect cleanup it
   * meant one PUT per character typed into the title.
   */
  const persistRef = useRef<() => Promise<void>>(async () => {})
  /**
   * The note id whose content is currently in the editor. A cached note can be
   * revalidated while you are typing in it, and without this guard that fresh
   * copy would be written over your unsaved edits — so the editor is filled
   * once per note you open, not once per response.
   */
  const hydratedRef = useRef<string | null>(null)

  useEffect(() => {
    function onResize() {
      setNarrow(window.innerWidth < 880)
    }
    onResize()
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  /**
   * Marks the note dirty and restarts the countdown. Called from every edit,
   * so the timer is always measured from the *last* keystroke — a save goes out
   * when you stop typing, not on a fixed cadence while you still are.
   *
   * `setSaveState` with the value it already holds is a no-op in React, so a
   * long stretch of typing costs no re-renders of this screen.
   */
  const scheduleSave = useCallback(() => {
    dirtyRef.current = true
    setSaveState("unsaved")
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => void persistRef.current(), AUTOSAVE_DELAY)
  }, [])

  /** Saves now instead of waiting out the countdown (Ctrl-S, leaving a note). */
  const flushSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = null
    void persistRef.current()
  }, [])

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      // The kit's own bullet list is switched off so `StyledBulletList` can
      // take the name — two extensions claiming `bulletList` is an error.
      StarterKit.configure({ bulletList: false }),
      StyledBulletList,
      Underline,
      Highlight.configure({ multicolor: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({ openOnClick: false }),
      SymbolShortcuts,
      MathInline,
      MathBlock,
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "prose tiptap focus:outline-none min-h-[320px]",
      },
    },
    onUpdate: scheduleSave,
  })

  // ── Load the list ────────────────────────────────────────────────────────
  // Debounce the search so typing doesn't hammer the API — here that means
  // debouncing the cache key, since the key is what drives the request.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), query ? 300 : 0)
    return () => clearTimeout(timer)
  }, [query])

  const listParams = useMemo(
    () => ({
      search: debouncedQuery.trim() || undefined,
      type: filter === "all" ? undefined : filter,
    }),
    [debouncedQuery, filter]
  )

  const listQuery = useQuery<NoteSummary[]>(
    keys.notes(listParams),
    () => notesApi.list(listParams),
    { keepPreviousData: true }
  )

  const list = useMemo(() => listQuery.data ?? [], [listQuery.data])
  const loadingList = listQuery.isLoading
  const failure = listQuery.error

  useEffect(() => {
    setSelectedId((current) => current ?? list[0]?._id ?? null)
  }, [list])

  // ── Load the selected note ───────────────────────────────────────────────
  const noteQuery = useQuery<Note>(
    selectedId ? keys.note(selectedId) : null,
    () => notesApi.get(selectedId as string)
  )
  const note = noteQuery.data ?? null
  const loadingNote = noteQuery.isLoading

  useEffect(() => {
    if (!noteQuery.error) return
    toast.error(
      errorMessage(noteQuery.error, "Could not open that note.")
    )
  }, [noteQuery.error])

  // Fill the editor when a *different* note opens. Reopening one you have read
  // before is instant: its content is already cached, so there is nothing to
  // wait for between the click and the text appearing.
  useEffect(() => {
    if (!editor || !note) return
    if (hydratedRef.current === note._id) return
    hydratedRef.current = note._id
    setTitle(note.title)
    setSummary(null)
    dirtyRef.current = false
    editor.commands.setContent(note.content || "<p></p>", {
      emitUpdate: false,
    })
    setSaveState("idle")
  }, [editor, note])

  // ── Autosave ─────────────────────────────────────────────────────────────
  const persist = useCallback(async () => {
    if (!note || !editor || !dirtyRef.current) return
    dirtyRef.current = false
    setSaveState("saving")
    try {
      const updated = await notesApi.update(note._id, {
        title: title.trim() || "Untitled",
        content: editor.getHTML(),
      })
      // Written straight into the cache rather than refetched: the editor
      // already holds the newest text, so a round-trip would only risk
      // replacing it with something staler.
      mutateCache<Note>(keys.note(updated._id), () => updated)
      // Only if this is still the note on screen: switching notes flushes the
      // one you left, and its "Saved" must not land under the new one.
      if (hydratedRef.current === updated._id) setSaveState("saved")
      mutateCache<NoteSummary[]>(keys.notes(listParams), (current) =>
        current.map((item) =>
          item._id === updated._id
            ? {
                ...item,
                title: updated.title,
                updatedAt: updated.updatedAt,
                snippet: (updated.content || "")
                  .replace(/<[^>]*>?/gm, " ")
                  .slice(0, 200),
              }
            : item
        )
      )
    } catch (caught) {
      dirtyRef.current = true
      if (hydratedRef.current === note._id) setSaveState("unsaved")
      toast.error(
        errorMessage(caught, "Could not save the note.")
      )
    }
  }, [note, editor, title, listParams])

  useEffect(() => {
    persistRef.current = persist
  }, [persist])

  // Flush pending edits when leaving the screen. Empty deps on purpose: this
  // must fire on unmount and nothing else, and it reaches `persist` through the
  // ref rather than through a dependency.
  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      void persistRef.current()
    },
    []
  )

  // Ctrl-S saves now rather than waiting out the pause, and stops the browser
  // offering to save the page instead.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault()
        flushSave()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [flushSave])

  // Closing the tab mid-pause would otherwise drop up to five seconds of
  // writing. The browser only shows its own generic warning; the wording here
  // is required to be set but is never displayed.
  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!dirtyRef.current) return
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [])

  const visibleList = useMemo(() => list, [list])

  /** Tags save on their own rather than riding the content autosave, so a
   *  failure here cannot silently take an unsaved paragraph down with it. */
  async function saveTags() {
    if (!note || savingTags) return
    setSavingTags(true)
    try {
      const tags = parseTags(tagDraft)
      const updated = await notesApi.update(note._id, { tags })
      mutateCache<Note>(keys.note(note._id), (current) => ({
        ...current,
        ...updated,
        tags,
      }))
      mutateCache<NoteSummary[]>(keys.notes(listParams), (current) =>
        current.map((item) =>
          item._id === note._id ? { ...item, tags } : item
        )
      )
      setEditingTags(false)
    } catch (caught) {
      toast.error(errorMessage(caught, "Could not save the tags."))
    } finally {
      setSavingTags(false)
    }
  }

  // Leaving the note closes the tag editor; otherwise it would reopen over the
  // next note with the previous note's draft still in it.
  useEffect(() => {
    setEditingTags(false)
  }, [selectedId])

  /**
   * Copies the note's share link, creating one on the first press.
   *
   * Pressing this again returns the *same* link rather than a new one — it used
   * to mint a fresh id every time, which quietly broke the URL anyone had
   * already been given.
   */
  async function handleShare() {
    if (!note || sharing) return
    setSharing(true)
    try {
      const { shareUrl, shareLink, created } = await notesApi.share(note._id)
      await navigator.clipboard?.writeText(shareUrl).catch(() => undefined)
      // Kept locally so "Stop sharing" appears straight away, without refetch.
      mutateCache<Note>(keys.note(note._id), (current) => ({
        ...current,
        shareLink,
      }))
      toast.success(created ? "Share link created and copied" : "Share link copied", {
        description: shareUrl,
      })
    } catch (caught) {
      toast.error(
        errorMessage(caught, "Could not create a share link.")
      )
    } finally {
      setSharing(false)
    }
  }

  /** Revokes the link. Confirmed first — anyone holding the URL loses access. */
  async function handleUnshare() {
    if (!note || sharing) return
    const ok = await confirm({
      title: "Stop sharing this note?",
      body: "The link stops working for everyone you sent it to. Sharing again later creates a different link.",
    })
    if (!ok) return

    setSharing(true)
    try {
      await notesApi.unshare(note._id)
      mutateCache<Note>(keys.note(note._id), (current) => ({
        ...current,
        shareLink: undefined,
      }))
      toast.success("Sharing stopped")
    } catch (caught) {
      toast.error(errorMessage(caught, "Could not stop sharing."))
    } finally {
      setSharing(false)
    }
  }

  async function handleExport() {
    if (!note) return
    try {
      const blob = await notesApi.exportPdf(note._id)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `${note.title || "note"}.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch (caught) {
      toast.error(
        errorMessage(caught, "Could not export the PDF.")
      )
    }
  }

  async function handleSummarize() {
    if (!note || summarizing) return
    setSummarizing(true)
    try {
      setSummary(await aiApi.summarizeNote(note._id))
    } catch (caught) {
      toast.error(
        errorMessage(caught, "Could not summarise the note.")
      )
    } finally {
      setSummarizing(false)
    }
  }

  async function handleDelete() {
    if (!note) return
    const ok = await confirm({
      title: "Delete note?",
      body: `“${note.title}” will be removed. This cannot be undone.`,
    })
    if (!ok) return
    // Drop any queued save first: writing to a note we are about to delete
    // would come back 404 and raise an error toast over the deletion.
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = null
    dirtyRef.current = false
    try {
      await notesApi.remove(note._id)
      mutateCache<NoteSummary[]>(keys.notes(listParams), (current) =>
        current.filter((item) => item._id !== note._id)
      )
      invalidate(keys.note(note._id), ...DASHBOARD_SCOPES)
      hydratedRef.current = null
      setSelectedId(null)
      setShowEditorOnNarrow(false)
      toast.success("Note deleted")
    } catch (caught) {
      toast.error(
        errorMessage(caught, "Could not delete the note.")
      )
    }
  }

  const showList = !narrow || !showEditorOnNarrow
  const showEditor = !narrow || showEditorOnNarrow

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
            placeholder="Search notes, tags or content…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="seg-group">
          {(["all", "personal", "group"] as NoteFilter[]).map((option) => (
            <button
              key={option}
              type="button"
              className="seg-btn"
              data-active={filter === option}
              onClick={() => setFilter(option)}
            >
              {option}
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
          New note
        </button>
      </div>

      {!!failure && (
        <ErrorAlert error={failure} title="Could not load your notes." />
      )}

      <div
        className="grid items-start gap-[18px]"
        style={{
          gridTemplateColumns: narrow
            ? "1fr"
            : "minmax(280px, 340px) minmax(0, 1fr)",
        }}
      >
        {showList && (
          <div className="flex min-w-0 flex-col gap-3">
            {loadingList ? (
              <Sk className="h-3 w-20" />
            ) : (
              <p className="eyebrow">
                {`${visibleList.length} ${visibleList.length === 1 ? "note" : "notes"}`}
              </p>
            )}

            {loadingList && visibleList.length === 0 && (
              <ListCardsSkeleton count={4} padding={14} titleHeight={16} showTags />
            )}

            {!loadingList && visibleList.length === 0 && (
              <div className="bp grid place-items-center gap-2 p-8 text-center">
                <FileText
                  size={22}
                  strokeWidth={1.5}
                  style={{ color: "var(--color-accent)" }}
                />
                <p className="m-0 text-[13.5px] opacity-60">
                  {query ? "No notes match that search." : "No notes yet."}
                </p>
              </div>
            )}

            {visibleList.map((item) => (
              <button
                key={item._id}
                type="button"
                className="list-card"
                data-active={item._id === selectedId}
                style={{ padding: 14 }}
                onClick={() => {
                  // Save the note being left before the editor is refilled —
                  // once `selectedId` moves, `persist` points at the new note.
                  if (item._id !== selectedId) flushSave()
                  setSelectedId(item._id)
                  setShowEditorOnNarrow(true)
                }}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={
                      item.type === "group"
                        ? "pill pill-solid"
                        : "pill pill-outline"
                    }
                    style={{
                      fontSize: 10,
                      letterSpacing: ".1em",
                      textTransform: "uppercase",
                    }}
                  >
                    {item.type}
                  </span>
                  <span
                    className="ml-auto text-[11px]"
                    style={{
                      color:
                        "color-mix(in srgb, var(--color-text) 45%, transparent)",
                    }}
                  >
                    {relativeTime(item.updatedAt)}
                  </span>
                </span>

                <span
                  className="text-[17px] leading-[1.15]"
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontWeight: 600,
                  }}
                >
                  {item.title}
                </span>

                <span
                  className="line-clamp-2 text-[12.5px] leading-[1.45]"
                  style={{
                    color:
                      "color-mix(in srgb, var(--color-text) 60%, transparent)",
                  }}
                >
                  {item.snippet || "No content yet."}
                </span>

                <span
                  className="flex items-center gap-2 text-[11px]"
                  style={{
                    color:
                      "color-mix(in srgb, var(--color-text) 50%, transparent)",
                  }}
                >
                  <span className="avatar-plain h-[22px] w-[22px] text-[10px]">
                    {initialsOf(item.user?.username)}
                  </span>
                  {item.user?.username ?? "You"}
                  {item.type === "group" &&
                    ` · ${item.no_contributors ?? 0} contributors`}
                </span>

                {item.tags?.length > 0 && (
                  <span
                    className="truncate text-[11px] uppercase [letter-spacing:.06em]"
                    style={{ color: "var(--color-accent-700)" }}
                  >
                    {item.tags.join(" · ")}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {showEditor && (
          <section className="bp flex min-w-0 flex-col">
            {!note && loadingNote ? (
              <NoteEditorSkeleton />
            ) : !note ? (
              <div className="grid place-items-center gap-3 p-12 text-center">
                <FileText
                  size={26}
                  strokeWidth={1.5}
                  style={{ color: "var(--color-accent)" }}
                />
                <p
                  className="m-0 text-[17px]"
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontWeight: 600,
                  }}
                >
                  Select a note to start writing
                </p>
                <p className="m-0 text-[13px] opacity-55">
                  Pick one from the list, or create a new note.
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-start gap-3.5 border-b border-[var(--color-divider)] px-4.5 py-4">
                  {narrow && (
                    <button
                      type="button"
                      onClick={() => setShowEditorOnNarrow(false)}
                      className="flex items-center gap-1.5 rounded-[10px] border border-[var(--color-divider)] px-3 py-1.5 text-[13px]"
                    >
                      <ArrowLeft size={15} strokeWidth={1.5} />
                      Notes
                    </button>
                  )}

                  <div className="min-w-0 flex-1">
                    <input
                      value={title}
                      onChange={(event) => {
                        setTitle(event.target.value)
                        scheduleSave()
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault()
                          event.currentTarget.blur()
                          flushSave()
                        }
                      }}
                      onBlur={flushSave}
                      className="w-full border-0 bg-transparent text-[24px] outline-none"
                      style={{
                        fontFamily: "var(--font-heading)",
                        fontWeight: 600,
                      }}
                      placeholder="Untitled"
                    />
                    <p
                      className="m-0 mt-1 text-xs"
                      style={{
                        color:
                          "color-mix(in srgb, var(--color-text) 55%, transparent)",
                      }}
                    >
                      edited {relativeTime(note.updatedAt)} · {note.type} note
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {note.type === "group" && (
                      <span
                        className="inline-flex items-center gap-1.5 text-[11.5px]"
                        style={{ color: "var(--color-accent-700)" }}
                      >
                        <span
                          className="animate-live-pulse h-[7px] w-[7px] rounded-full"
                          style={{ background: "var(--color-accent)" }}
                        />
                        <Users size={13} strokeWidth={1.5} />
                        {note.collaborators?.length ?? 0} collaborating
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleSummarize}
                      disabled={summarizing}
                      title="Summarise with AI"
                      className="flex items-center gap-1.5 rounded-[10px] border border-[var(--color-divider)] px-3 py-1.5 text-[13px] transition-colors hover:border-[var(--color-accent)] disabled:opacity-45"
                    >
                      <Sparkles size={15} strokeWidth={1.5} />
                      {summarizing ? "Summarising…" : "Summarise"}
                    </button>
                    {/* Once shared, the button copies the link that already
                        exists — it does not make a new one — so the label says
                        what it does and the state is visible on the note. */}
                    <button
                      type="button"
                      onClick={handleShare}
                      disabled={sharing}
                      title={
                        note.shareLink
                          ? "Copy the share link"
                          : "Create a public read-only link"
                      }
                      className="flex items-center gap-1.5 rounded-[10px] border px-3 py-1.5 text-[13px] transition-colors hover:border-[var(--color-accent)] disabled:opacity-45"
                      style={
                        note.shareLink
                          ? {
                              borderColor: "var(--color-accent)",
                              color: "var(--color-accent-700)",
                            }
                          : { borderColor: "var(--color-divider)" }
                      }
                    >
                      <Share2 size={15} strokeWidth={1.5} />
                      {note.shareLink ? "Copy link" : "Share"}
                    </button>
                    {note.shareLink && (
                      <button
                        type="button"
                        onClick={handleUnshare}
                        disabled={sharing}
                        title="Stop sharing — the link stops working"
                        aria-label="Stop sharing"
                        className="grid h-[30px] w-[30px] place-items-center rounded-[10px] border border-[var(--color-divider)] transition-colors hover:border-[var(--color-danger)] disabled:opacity-45"
                      >
                        <Link2Off size={15} strokeWidth={1.5} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleExport}
                      title="Export as PDF"
                      className="flex items-center gap-1.5 rounded-[10px] border border-[var(--color-divider)] px-3 py-1.5 text-[13px] transition-colors hover:border-[var(--color-accent)]"
                    >
                      <Download size={15} strokeWidth={1.5} />
                      PDF
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      title="Delete note"
                      aria-label="Delete note"
                      className="grid h-[30px] w-[30px] place-items-center rounded-[10px] border border-[var(--color-divider)] transition-colors hover:border-[var(--color-danger)]"
                      style={{ color: "var(--color-danger)" }}
                    >
                      <Trash2 size={15} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>

                <EditorToolbar editor={editor} />

                {summary && (
                  <div
                    className="mx-4.5 mt-4 rounded-[14px] border p-4"
                    style={{
                      borderColor: "var(--color-accent)",
                      background:
                        "color-mix(in srgb, var(--color-accent) 7%, transparent)",
                    }}
                  >
                    <div className="mb-1.5 flex items-center gap-2">
                      <Sparkles
                        size={14}
                        strokeWidth={1.5}
                        style={{ color: "var(--color-accent-700)" }}
                      />
                      <span className="kicker">AI summary</span>
                      <button
                        type="button"
                        onClick={() => setSummary(null)}
                        className="ml-auto text-[11px] opacity-60"
                      >
                        Dismiss
                      </button>
                    </div>
                    {/* The model writes Markdown — render it, don't print the
                        asterisks and hashes. */}
                    <Markdown className="text-[13.5px]">{summary}</Markdown>
                  </div>
                )}

                <div className="max-h-[560px] overflow-auto px-[clamp(18px,4vw,44px)] py-6">
                  <EditorContent editor={editor} />
                </div>

                <div className="mt-auto flex flex-wrap items-center gap-2.5 border-t border-[var(--color-divider)] px-4.5 py-3">
                  {/* Tags were fixed at creation until now, which meant a note
                      filed under the wrong subject stayed there. */}
                  {editingTags ? (
                    <>
                      <input
                        autoFocus
                        className="field-input h-[30px] max-w-[280px] flex-1 text-[12.5px]"
                        placeholder="algorithms, week-3"
                        value={tagDraft}
                        onChange={(event) => setTagDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") void saveTags()
                          if (event.key === "Escape") setEditingTags(false)
                        }}
                      />
                      <button
                        type="button"
                        className="action-btn"
                        style={{ padding: "5px 12px", fontSize: 11.5 }}
                        data-active={!savingTags}
                        disabled={savingTags}
                        onClick={saveTags}
                      >
                        {savingTags ? "Saving…" : "Save"}
                      </button>
                      <button
                        type="button"
                        className="link-btn"
                        onClick={() => setEditingTags(false)}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      {(note.tags ?? []).map((tag) => (
                        <span key={tag} className="pill pill-accent">
                          {tag}
                        </span>
                      ))}
                      <button
                        type="button"
                        className="link-btn"
                        onClick={() => {
                          setTagDraft((note.tags ?? []).join(", "))
                          setEditingTags(true)
                        }}
                      >
                        <Tag size={11} strokeWidth={1.7} />
                        {note.tags?.length ? "Edit tags" : "Add tags"}
                      </button>
                    </>
                  )}
                  <span className="flex-1" />
                  {/* Autosave still runs; this is for when you want it written
                      now and don't want to count out the pause. */}
                  {saveState === "unsaved" && (
                    <button
                      type="button"
                      className="action-btn"
                      style={{ padding: "5px 12px", fontSize: 11.5 }}
                      data-active
                      onClick={flushSave}
                      title="Save now (Ctrl+S)"
                    >
                      Save
                    </button>
                  )}
                  <span
                    className="text-[11.5px]"
                    style={{
                      color:
                        "color-mix(in srgb, var(--color-text) 50%, transparent)",
                    }}
                  >
                    {saveState === "unsaved"
                      ? "Unsaved changes"
                      : saveState === "saving"
                        ? "Saving…"
                        : saveState === "saved"
                          ? "Saved"
                          : `Updated ${relativeTime(note.updatedAt)}`}
                  </span>
                </div>
              </>
            )}
          </section>
        )}
      </div>

      {modalOpen && (
        <NoteModal
          onClose={() => setModalOpen(false)}
          onCreated={(created) => {
            mutateCache<NoteSummary[]>(keys.notes(listParams), (current) => [
              {
                _id: created._id,
                user: { _id: "", username: "You" },
                title: created.title,
                type: created.type,
                tags: created.tags ?? [],
                snippet: "",
                createdAt: created.createdAt,
                updatedAt: created.updatedAt,
              },
              ...current,
            ])
            invalidate(...DASHBOARD_SCOPES)
            setSelectedId(created._id)
            setShowEditorOnNarrow(true)
            toast.success("Note created")
          }}
        />
      )}
    </div>
  )
}
