"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  ChevronDown,
  Link2,
  List,
  ListOrdered,
  ListTodo,
  Redo2,
  Sigma,
  Undo2,
} from "lucide-react"
import type { Editor } from "@tiptap/react"
import {
  ALL_SYMBOLS,
  BULLET_STYLES,
  SYMBOL_GROUPS,
  type BulletStyle,
} from "./symbols"

function ToolbarButton({
  title,
  active,
  disabled,
  onClick,
  width = 32,
  children,
}: {
  title: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  width?: number
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className="grid h-[30px] place-items-center rounded-lg transition-colors disabled:opacity-35"
      style={{
        width,
        background: active
          ? "color-mix(in srgb, var(--color-accent) 14%, transparent)"
          : "transparent",
        color: active ? "var(--color-accent-800)" : "var(--color-text)",
      }}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <span className="mx-1 h-5 w-px flex-none bg-[var(--color-divider)]" />
}

/**
 * A small dropdown anchored under its trigger.
 *
 * Closes on outside click and on Escape — a palette that can only be dismissed
 * by picking something is a trap when you opened it to look.
 */
function Popdown({
  open,
  onClose,
  children,
  width = 260,
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  width?: number
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as globalThis.Node)) onClose()
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    // Capture phase: the trigger's own click must not immediately reopen it.
    document.addEventListener("mousedown", onPointerDown, true)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onPointerDown, true)
      document.removeEventListener("keydown", onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={ref}
      className="animate-rise-in-fast absolute left-0 top-[34px] z-40 rounded-[14px] border border-[var(--color-divider)] p-2"
      style={{
        width,
        maxWidth: "min(340px, calc(100vw - 32px))",
        background: "var(--color-bg)",
        boxShadow: "var(--shadow-lg)",
      }}
      role="dialog"
    >
      {children}
    </div>
  )
}

/* ── Blocks: paragraph and the three heading levels ──────────────────────── */

const BLOCKS = [
  { value: "p", label: "Body text", hint: "Ctrl+Alt+0", sample: 14 },
  { value: "h1", label: "Heading 1", hint: "Ctrl+Alt+1", sample: 21 },
  { value: "h2", label: "Heading 2", hint: "Ctrl+Alt+2", sample: 18 },
  { value: "h3", label: "Heading 3", hint: "Ctrl+Alt+3", sample: 16 },
] as const

function BlockPicker({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false)

  const current =
    ([1, 2, 3] as const).find((level) =>
      editor.isActive("heading", { level })
    ) ?? null
  const label = current ? `H${current}` : "Body"

  return (
    <div className="relative">
      <button
        type="button"
        title="Text style"
        onClick={() => setOpen((value) => !value)}
        className="flex h-[30px] items-center gap-1 rounded-lg px-2 text-[12.5px] transition-colors hover:bg-[color-mix(in_srgb,var(--color-text)_6%,transparent)]"
        style={{ fontFamily: "var(--font-heading)", fontWeight: 600, minWidth: 62 }}
      >
        {label}
        <ChevronDown size={13} strokeWidth={1.6} />
      </button>

      <Popdown open={open} onClose={() => setOpen(false)} width={220}>
        <div className="grid gap-0.5">
          {BLOCKS.map((block) => {
            const active =
              block.value === "p"
                ? !current
                : editor.isActive("heading", {
                    level: Number(block.value[1]),
                  })
            return (
              <button
                key={block.value}
                type="button"
                data-active={active}
                className="vtab justify-between"
                style={{ padding: "7px 10px", textTransform: "none", letterSpacing: 0 }}
                onClick={() => {
                  const chain = editor.chain().focus()
                  if (block.value === "p") chain.setParagraph().run()
                  else
                    chain
                      .setHeading({ level: Number(block.value[1]) as 1 | 2 | 3 })
                      .run()
                  setOpen(false)
                }}
              >
                <span style={{ fontSize: block.sample, lineHeight: 1.1 }}>
                  {block.label}
                </span>
                <span className="text-[10.5px] opacity-45">{block.hint}</span>
              </button>
            )
          })}
        </div>
      </Popdown>
    </div>
  )
}

/* ── Bullet style ────────────────────────────────────────────────────────── */

function BulletPicker({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false)
  const active = editor.isActive("bulletList")
  const currentStyle = (editor.getAttributes("bulletList").bulletStyle ??
    "disc") as BulletStyle

  return (
    <div className="relative flex">
      <ToolbarButton
        title="Bullet list"
        active={active}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List size={15} strokeWidth={1.5} />
      </ToolbarButton>
      <button
        type="button"
        title="Bullet style"
        aria-label="Bullet style"
        onClick={() => setOpen((value) => !value)}
        className="grid h-[30px] w-[15px] place-items-center rounded-lg transition-colors hover:bg-[color-mix(in_srgb,var(--color-text)_6%,transparent)]"
      >
        <ChevronDown size={11} strokeWidth={1.8} />
      </button>

      <Popdown open={open} onClose={() => setOpen(false)} width={170}>
        <div className="grid gap-0.5">
          {BULLET_STYLES.map((style) => (
            <button
              key={style.value}
              type="button"
              data-active={active && currentStyle === style.value}
              className="vtab gap-2.5"
              style={{ padding: "7px 10px", textTransform: "none", letterSpacing: 0 }}
              onClick={() => {
                editor.chain().focus().setBulletStyle(style.value).run()
                setOpen(false)
              }}
            >
              <span className="w-4 text-center text-[14px]">{style.preview}</span>
              <span className="text-[13px]">{style.label}</span>
            </button>
          ))}
        </div>
      </Popdown>
    </div>
  )
}

/* ── Symbols ─────────────────────────────────────────────────────────────── */

function SymbolPicker({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase().replace(/^:/, "")
    if (!needle) return null
    return ALL_SYMBOLS.filter(
      (entry) =>
        entry.label.toLowerCase().includes(needle) ||
        entry.shortcuts.some((shortcut) =>
          shortcut.toLowerCase().includes(needle)
        )
    ).slice(0, 36)
  }, [query])

  function insert(char: string) {
    editor.chain().focus().insertContent(char).run()
    // The palette stays open: inserting symbols usually comes in runs, and
    // reopening it for the second one of a pair is pure friction.
  }

  return (
    <div className="relative">
      <ToolbarButton
        title="Insert symbol (or type :pi)"
        active={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Sigma size={15} strokeWidth={1.6} />
      </ToolbarButton>

      <Popdown open={open} onClose={() => setOpen(false)} width={300}>
        <input
          autoFocus
          className="field-input mb-2 h-[32px] text-[13px]"
          placeholder="Search — pi, sum, arrow…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />

        <div className="max-h-[240px] overflow-auto">
          {results ? (
            results.length === 0 ? (
              <p className="m-0 px-1 py-3 text-center text-[12.5px] opacity-55">
                Nothing matches “{query.trim()}”.
              </p>
            ) : (
              <div className="grid grid-cols-8 gap-0.5">
                {results.map((entry) => (
                  <SymbolCell
                    key={`${entry.char}-${entry.shortcuts[0]}`}
                    entry={entry}
                    onPick={insert}
                  />
                ))}
              </div>
            )
          ) : (
            SYMBOL_GROUPS.map((group) => (
              <div key={group.name} className="mb-1.5">
                <p className="eyebrow mb-1 px-1">{group.name}</p>
                <div className="grid grid-cols-8 gap-0.5">
                  {group.symbols.map((entry) => (
                    <SymbolCell
                      key={`${entry.char}-${entry.shortcuts[0]}`}
                      entry={entry}
                      onPick={insert}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <p className="m-0 mt-1.5 border-t border-[var(--color-divider)] pt-1.5 text-[11px] opacity-55">
          Tip: type <code>:pi</code> then space, anywhere in the note.
        </p>
      </Popdown>
    </div>
  )
}

function SymbolCell({
  entry,
  onPick,
}: {
  entry: (typeof ALL_SYMBOLS)[number]
  onPick: (char: string) => void
}) {
  return (
    <button
      type="button"
      title={`${entry.label} — :${entry.shortcuts[0]}`}
      onClick={() => onPick(entry.char)}
      className="grid h-[30px] place-items-center rounded-lg text-[15px] transition-colors hover:bg-[color-mix(in_srgb,var(--color-accent)_14%,transparent)]"
    >
      {entry.char}
    </button>
  )
}

/* ── The bar ─────────────────────────────────────────────────────────────── */

export function EditorToolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-[var(--color-divider)] px-3 py-2">
      <BlockPicker editor={editor} />

      <Divider />

      <ToolbarButton
        title="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <span
          className="text-sm"
          style={{ fontFamily: "var(--font-heading)", fontWeight: 700 }}
        >
          B
        </span>
      </ToolbarButton>
      <ToolbarButton
        title="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <span className="text-sm italic" style={{ fontFamily: "var(--font-heading)" }}>
          I
        </span>
      </ToolbarButton>
      <ToolbarButton
        title="Underline"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <span className="text-sm underline" style={{ fontFamily: "var(--font-heading)" }}>
          U
        </span>
      </ToolbarButton>
      <ToolbarButton
        title="Highlight"
        active={editor.isActive("highlight")}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
      >
        <span
          className="rounded px-1 text-[12px]"
          style={{
            background: "color-mix(in srgb, var(--color-accent) 28%, transparent)",
          }}
        >
          H
        </span>
      </ToolbarButton>

      <Divider />

      <BulletPicker editor={editor} />
      <ToolbarButton
        title="Numbered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered size={15} strokeWidth={1.5} />
      </ToolbarButton>
      <ToolbarButton
        title="Task list"
        active={editor.isActive("taskList")}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
      >
        <ListTodo size={15} strokeWidth={1.5} />
      </ToolbarButton>
      <ToolbarButton
        title="Quote"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <span className="text-base leading-none" style={{ fontFamily: "var(--font-heading)" }}>
          “
        </span>
      </ToolbarButton>

      <Divider />

      <SymbolPicker editor={editor} />
      <ToolbarButton
        title="Inline equation (Ctrl+Shift+E)"
        active={editor.isActive("mathInline")}
        onClick={() => editor.chain().focus().toggleMathInline().run()}
      >
        <span className="text-[13px] italic" style={{ fontFamily: "Georgia, serif" }}>
          𝑥
        </span>
      </ToolbarButton>
      <ToolbarButton
        title="Display equation (Ctrl+Shift+M, or type $$)"
        active={editor.isActive("mathBlock")}
        onClick={() => editor.chain().focus().toggleMathBlock().run()}
        width={38}
      >
        <span className="text-[13px] italic" style={{ fontFamily: "Georgia, serif" }}>
          𝑥²
        </span>
      </ToolbarButton>

      <ToolbarButton
        title="Link"
        active={editor.isActive("link")}
        onClick={() => {
          const previous = editor.getAttributes("link").href as string | undefined
          const url = window.prompt("Link URL", previous ?? "https://")
          if (url === null) return
          if (url === "") {
            editor.chain().focus().extendMarkRange("link").unsetLink().run()
            return
          }
          editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
        }}
      >
        <Link2 size={15} strokeWidth={1.5} />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        title="Undo"
        disabled={!editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo2 size={15} strokeWidth={1.5} />
      </ToolbarButton>
      <ToolbarButton
        title="Redo"
        disabled={!editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo2 size={15} strokeWidth={1.5} />
      </ToolbarButton>
    </div>
  )
}
