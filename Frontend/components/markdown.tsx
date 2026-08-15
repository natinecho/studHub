"use client"

import { Fragment, type ReactNode } from "react"

/**
 * A small Markdown renderer for the text the AI writes back.
 *
 * It covers the subset the model actually emits — headings, bullet and
 * numbered lists (nested), bold/italic/strikethrough, inline code, fenced code
 * blocks, block quotes, rules and links — and renders straight to React
 * elements. Nothing is ever passed through `dangerouslySetInnerHTML`, so model
 * output can't inject markup into the page.
 */

// ── Inline ──────────────────────────────────────────────────────────────────

// Ordered deliberately: code spans win first so their contents stay literal.
const INLINE = new RegExp(
  [
    "(`[^`\\n]+`)", // `code`
    "(\\*\\*[^*]+\\*\\*)", // **bold**
    "(__[^_]+__)", // __bold__
    "(~~[^~]+~~)", // ~~strike~~
    "(\\*[^*\\n]+\\*)", // *italic*
    "(_[^_\\n]+_)", // _italic_
    "(\\[[^\\]\\n]*\\]\\([^)\\s]+\\))", // [text](url)
  ].join("|"),
  "g"
)

function renderInline(text: string, keyPrefix: string): ReactNode {
  const parts: ReactNode[] = []
  let cursor = 0
  let index = 0

  for (const match of text.matchAll(INLINE)) {
    const token = match[0]
    const start = match.index ?? 0
    if (start > cursor) parts.push(text.slice(cursor, start))
    const key = `${keyPrefix}-i${index++}`

    if (token.startsWith("`")) {
      parts.push(
        <code
          key={key}
          className="rounded px-1 py-px text-[0.92em]"
          style={{
            background: "color-mix(in srgb, var(--color-text) 10%, transparent)",
            fontFamily: "var(--font-heading), ui-monospace, monospace",
          }}
        >
          {token.slice(1, -1)}
        </code>
      )
    } else if (token.startsWith("**") || token.startsWith("__")) {
      parts.push(
        <strong key={key} className="font-semibold">
          {renderInline(token.slice(2, -2), key)}
        </strong>
      )
    } else if (token.startsWith("~~")) {
      parts.push(
        <s key={key} style={{ opacity: 0.7 }}>
          {renderInline(token.slice(2, -2), key)}
        </s>
      )
    } else if (token.startsWith("[")) {
      const split = token.indexOf("](")
      const label = token.slice(1, split)
      const href = token.slice(split + 2, -1)
      parts.push(
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
          style={{ color: "var(--color-accent-700)" }}
        >
          {label || href}
        </a>
      )
    } else {
      parts.push(
        <em key={key}>{renderInline(token.slice(1, -1), key)}</em>
      )
    }

    cursor = start + token.length
  }

  if (cursor < text.length) parts.push(text.slice(cursor))
  return parts.length ? parts : text
}

// ── Blocks ──────────────────────────────────────────────────────────────────

const BULLET = /^(\s*)[-*+]\s+(.*)$/
const ORDERED = /^(\s*)\d+[.)]\s+(.*)$/
const HEADING = /^(#{1,6})\s+(.*)$/
const QUOTE = /^\s*>\s?(.*)$/
const RULE = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/
const FENCE = /^\s*```(.*)$/

const indentOf = (line: string) => line.match(/^\s*/)?.[0].length ?? 0

function renderBlocks(lines: string[], keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]
    const id = `${keyPrefix}-b${key++}`

    if (!line.trim()) {
      i += 1
      continue
    }

    // Fenced code — everything up to the closing fence is literal.
    const fence = line.match(FENCE)
    if (fence) {
      const body: string[] = []
      i += 1
      while (i < lines.length && !FENCE.test(lines[i])) {
        body.push(lines[i])
        i += 1
      }
      i += 1 // closing fence
      out.push(
        <pre
          key={id}
          className="my-1.5 overflow-x-auto rounded-lg p-2.5 text-[0.92em]"
          style={{
            background: "color-mix(in srgb, var(--color-text) 8%, transparent)",
            fontFamily: "var(--font-heading), ui-monospace, monospace",
          }}
        >
          <code>{body.join("\n")}</code>
        </pre>
      )
      continue
    }

    if (RULE.test(line)) {
      out.push(
        <hr
          key={id}
          className="my-2 border-0 border-t"
          style={{ borderColor: "var(--color-divider)" }}
        />
      )
      i += 1
      continue
    }

    const heading = line.match(HEADING)
    if (heading) {
      const level = Math.min(heading[1].length, 6)
      // Bubbles are narrow, so headings step down gently rather than shouting.
      const size = [17, 16, 15, 14.5, 14, 14][level - 1]
      out.push(
        <p
          key={id}
          className="m-0 mb-0.5 mt-2 first:mt-0"
          style={{
            fontFamily: "var(--font-heading)",
            fontWeight: 600,
            fontSize: `${size}px`,
            lineHeight: 1.3,
          }}
        >
          {renderInline(heading[2], id)}
        </p>
      )
      i += 1
      continue
    }

    if (QUOTE.test(line)) {
      const body: string[] = []
      while (i < lines.length && QUOTE.test(lines[i])) {
        body.push(lines[i].match(QUOTE)?.[1] ?? "")
        i += 1
      }
      out.push(
        <blockquote
          key={id}
          className="my-1.5 border-l-2 pl-2.5"
          style={{ borderColor: "var(--color-accent)", opacity: 0.85 }}
        >
          {renderBlocks(body, id)}
        </blockquote>
      )
      continue
    }

    const isItem = (text?: string) =>
      text !== undefined && (BULLET.test(text) || ORDERED.test(text))
    // `*` is a bullet, `1.` is ordered — a switch between them starts a new
    // list rather than continuing the current one.
    const isOrdered = (text: string) =>
      ORDERED.test(text) && !BULLET.test(text)

    if (isItem(line)) {
      const ordered = isOrdered(line)
      const baseIndent = indentOf(line)
      const items: string[][] = []

      // Group the run of items at this level, folding deeper-indented lines
      // into the item above so nested lists recurse.
      while (i < lines.length) {
        const current = lines[i]
        if (!current.trim()) {
          // A blank line only ends the list if what follows isn't part of it.
          const next = lines[i + 1]
          if (!next || (indentOf(next) < baseIndent && !isItem(next))) break
          if (!isItem(next) && indentOf(next) <= baseIndent) break
          if (
            isItem(next) &&
            indentOf(next) === baseIndent &&
            isOrdered(next) !== ordered
          )
            break
          i += 1
          continue
        }
        if (indentOf(current) < baseIndent) break
        if (indentOf(current) === baseIndent && !isItem(current)) break
        if (
          indentOf(current) === baseIndent &&
          isOrdered(current) !== ordered
        )
          break

        if (indentOf(current) === baseIndent && isItem(current)) {
          const text =
            current.match(BULLET)?.[2] ?? current.match(ORDERED)?.[2] ?? ""
          items.push([text])
        } else if (items.length) {
          // Keep the relative indent so the nested list finds its own base.
          items[items.length - 1].push(current.slice(baseIndent))
        }
        i += 1
      }

      const List = ordered ? "ol" : "ul"
      out.push(
        <List
          key={id}
          className={`my-1 grid gap-1 pl-4 ${
            ordered ? "list-decimal" : "list-disc"
          }`}
        >
          {items.map((item, index) => (
            <li key={`${id}-l${index}`} className="leading-[1.55]">
              {renderInline(item[0], `${id}-l${index}`)}
              {item.length > 1 &&
                renderBlocks(item.slice(1), `${id}-l${index}`)}
            </li>
          ))}
        </List>
      )
      continue
    }

    // Paragraph — consecutive plain lines, joined with soft breaks.
    const paragraph: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() &&
      !isItem(lines[i]) &&
      !HEADING.test(lines[i]) &&
      !QUOTE.test(lines[i]) &&
      !RULE.test(lines[i]) &&
      !FENCE.test(lines[i])
    ) {
      paragraph.push(lines[i].trim())
      i += 1
    }
    out.push(
      <p key={id} className="m-0 leading-[1.55]">
        {paragraph.map((text, index) => (
          <Fragment key={`${id}-p${index}`}>
            {index > 0 && <br />}
            {renderInline(text, `${id}-p${index}`)}
          </Fragment>
        ))}
      </p>
    )
  }

  return out
}

export function Markdown({
  children,
  className = "",
}: {
  children: string
  className?: string
}) {
  const text = (children ?? "").replace(/\r\n/g, "\n")
  return (
    <div className={`grid gap-1.5 ${className}`}>
      {renderBlocks(text.split("\n"), "md")}
    </div>
  )
}
