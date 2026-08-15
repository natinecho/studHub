"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import Highlight from "@tiptap/extension-highlight"
import TaskList from "@tiptap/extension-task-list"
import TaskItem from "@tiptap/extension-task-item"
import TiptapLink from "@tiptap/extension-link"
import { ArrowRight, FileText, Link2 } from "lucide-react"
import { BrandMark } from "@/components/brand-mark"
import { ThemeToggle } from "@/components/theme-toggle"
import { SharedNoteSkeleton } from "@/components/skeletons"
import {
  MathBlock,
  MathInline,
  StyledBulletList,
} from "@/components/notes/editor-extensions"
import {
  ApiError,
  errorMessage,
  notesApi,
  type SharedNote,
} from "@/lib/api"
import { relativeTime } from "@/lib/format"

/**
 * The read-only page behind a note's share link. It is deliberately outside the
 * signed-in shell: the API accepts this route without a token, so someone who
 * has the link — and no account — still sees the note.
 */
export function SharedNoteView({ shareLink }: { shareLink: string }) {
  const [note, setNote] = useState<SharedNote | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Read-only TipTap rather than raw HTML: the content is re-parsed through the
  // schema, so anything the editor can't produce never reaches the DOM.
  const editor = useEditor({
    immediatelyRender: false,
    editable: false,
    // Must mirror the editors extension list. A schema that is missing
    // mathBlock or the bullet-style attribute would silently drop them while
    // re-parsing, so a shared note would lose exactly the parts the author
    // took the most care over.
    extensions: [
      StarterKit.configure({ bulletList: false }),
      StyledBulletList,
      Underline,
      Highlight.configure({ multicolor: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      MathInline,
      MathBlock,
      TiptapLink.configure({
        openOnClick: true,
        HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
      }),
    ],
    content: "",
    editorProps: {
      attributes: { class: "prose tiptap focus:outline-none" },
    },
  })

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    notesApi
      .getByShareLink(shareLink)
      .then((data) => {
        if (cancelled) return
        setNote(data)
        setError(null)
      })
      .catch((caught) => {
        if (cancelled) return
        setNote(null)
        setError(
          caught instanceof ApiError && caught.status === 404
            ? "This link doesn't point to a note anymore. The owner may have deleted it or generated a new link."
            : errorMessage(caught, "Could not load this note.")
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [shareLink])

  // The editor is created before the fetch resolves, so fill it in afterwards.
  useEffect(() => {
    if (!editor || !note) return
    editor.commands.setContent(note.content || "<p></p>", { emitUpdate: false })
  }, [editor, note])

  return (
    <div
      className="flex min-h-screen flex-col bg-[var(--color-bg)] text-[var(--color-text)]"
      style={{ fontFamily: "var(--font-body)" }}
    >
      <header className="flex h-[58px] flex-none items-center gap-2.5 border-b border-[var(--color-divider)] px-[clamp(14px,2vw,24px)]">
        <Link href="/" className="flex items-center gap-2.5">
          <span
            className="grid h-[26px] w-[26px] flex-none place-items-center rounded-[9px] border"
            style={{
              borderColor: "var(--color-accent)",
              color: "var(--color-accent)",
            }}
          >
            <BrandMark />
          </span>
          <span
            className="whitespace-nowrap text-[15px] uppercase"
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              letterSpacing: ".06em",
            }}
          >
            Student Hub
          </span>
        </Link>

        <span
          className="ml-1 hidden items-center gap-1.5 text-[11.5px] sm:inline-flex"
          style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}
        >
          <Link2 size={12} strokeWidth={1.5} />
          Shared note
        </span>

        <div className="flex-1" />
        <ThemeToggle />
      </header>

      <main className="flex-1 overflow-auto p-[clamp(16px,2.2vw,26px)]">
        <div className="mx-auto w-full max-w-[760px]">
          {loading && <SharedNoteSkeleton />}

          {!loading && error && (
            <div
              className="mt-10 grid justify-items-center gap-3 rounded-[16px] border border-[var(--color-divider)] p-10 text-center"
              style={{ background: "var(--color-surface)" }}
            >
              <FileText size={22} strokeWidth={1.5} className="opacity-45" />
              <p
                className="m-0 text-[17px]"
                style={{ fontFamily: "var(--font-heading)", fontWeight: 600 }}
              >
                Note unavailable
              </p>
              <p
                className="m-0 max-w-[46ch] text-[13px]"
                style={{
                  color: "color-mix(in srgb, var(--color-text) 60%, transparent)",
                }}
              >
                {error}
              </p>
              <Link
                href="/dashboard"
                className="mt-1 flex items-center gap-1.5 rounded-[10px] border border-[var(--color-divider)] px-3 py-1.5 text-[13px] transition-colors hover:border-[var(--color-accent)]"
              >
                Go to Student Hub
                <ArrowRight size={14} strokeWidth={1.5} />
              </Link>
            </div>
          )}

          {!loading && note && (
            <article
              className="animate-rise-in rounded-[18px] border border-[var(--color-divider)] p-[clamp(18px,3vw,34px)]"
              style={{ background: "var(--color-surface)" }}
            >
              <h1
                className="m-0 text-[clamp(22px,3.2vw,30px)] leading-[1.2]"
                style={{ fontFamily: "var(--font-heading)", fontWeight: 600 }}
              >
                {note.title || "Untitled"}
              </h1>

              <p
                className="m-0 mt-1.5 text-xs"
                style={{
                  color: "color-mix(in srgb, var(--color-text) 55%, transparent)",
                }}
              >
                {note.type} note · edited {relativeTime(note.updatedAt)}
              </p>

              {/* The API only returns the whole document — `_id` included — to
                  the owner and group members, so it doubles as "you may edit
                  this". Everyone else just reads. */}
              {note._id && (
                <Link
                  href="/notes"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-[10px] border border-[var(--color-divider)] px-3 py-1.5 text-[13px] transition-colors hover:border-[var(--color-accent)]"
                >
                  Edit in Student Hub
                  <ArrowRight size={14} strokeWidth={1.5} />
                </Link>
              )}

              {note.tags?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {note.tags.map((tag) => (
                    <span key={tag} className="pill pill-outline">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-5 border-t border-[var(--color-divider)] pt-5">
                <EditorContent editor={editor} />
              </div>
            </article>
          )}

          {!loading && note && (
            <p
              className="mt-5 text-center text-[12.5px]"
              style={{
                color: "color-mix(in srgb, var(--color-text) 55%, transparent)",
              }}
            >
              Read-only ·{" "}
              <Link
                href="/dashboard"
                className="underline underline-offset-2"
                style={{ color: "var(--color-accent-700)" }}
              >
                open Student Hub
              </Link>{" "}
              to write your own notes.
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
