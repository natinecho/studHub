import { Extension, InputRule, Mark, mergeAttributes, Node } from "@tiptap/core"
import { BulletList } from "@tiptap/extension-list/bullet-list"
import { SHORTCUT_MAP, type BulletStyle } from "./symbols"

/* ══════════════════════════════════════════════════════════════════════════
   Symbol shortcuts — `:pi ` becomes π as you type.
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Matches a colon, a shortcut name, and the terminator that commits it.
 *
 * The terminator is required: without it `:in` would fire while the student is
 * still typing `:integral`, and there would be no way to reach the longer name.
 * Space, tab and semicolon all commit — semicolon so `:pi;` works mid-word,
 * where a space would be wrong.
 *
 * The leading `(^|[^\w:])` stops it firing inside a URL (`https://…`) or after
 * a word character, where a colon is almost never a symbol shortcut.
 */
const SHORTCUT_PATTERN = /(^|[^\w:])[:]([A-Za-z][\w^\-/.]{0,11}|\.\.\.|--|\^-?\d|_\d)([ \t;])$/

export const SymbolShortcuts = Extension.create({
  name: "symbolShortcuts",

  addInputRules() {
    return [
      new InputRule({
        find: SHORTCUT_PATTERN,
        handler: ({ state, range, match }) => {
          const [, prefix = "", name = "", terminator = ""] = match
          const char = SHORTCUT_MAP.get(name)
          // An unknown name is left exactly as typed — a student writing
          // "see :note below" should not have their text eaten.
          if (!char) return null

          // A semicolon is the commit key itself, so it is consumed; a space
          // or tab was the student's own and is kept.
          const tail = terminator === ";" ? "" : terminator
          state.tr.insertText(`${prefix}${char}${tail}`, range.from, range.to)
        },
      }),
    ]
  },
})

/* ══════════════════════════════════════════════════════════════════════════
   Bullet styles — the marker glyph is a property of the list, not the theme.
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * `BulletList` with a `data-bullet` attribute, so a list can be a dash list or
 * an arrow list. The attribute round-trips through the stored HTML, which is
 * why the style survives a reload; `globals.css` turns it into a glyph.
 */
export const StyledBulletList = BulletList.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      bulletStyle: {
        default: "disc" as BulletStyle,
        parseHTML: (element) => element.getAttribute("data-bullet") ?? "disc",
        renderHTML: (attributes) => {
          if (!attributes.bulletStyle || attributes.bulletStyle === "disc") {
            return {}
          }
          return { "data-bullet": attributes.bulletStyle }
        },
      },
    }
  },

  addCommands() {
    return {
      ...this.parent?.(),
      /** Switches the list the cursor is in, creating one if there isn't one. */
      setBulletStyle:
        (style: BulletStyle) =>
        ({ chain, editor }) => {
          const inList = editor.isActive("bulletList")
          return inList
            ? chain().focus().updateAttributes("bulletList", { bulletStyle: style }).run()
            : chain()
                .focus()
                .toggleBulletList()
                .updateAttributes("bulletList", { bulletStyle: style })
                .run()
        },
    }
  },
})

/* ══════════════════════════════════════════════════════════════════════════
   Equations.
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * An inline equation: a mark, not a node, so the text inside stays ordinary
 * editable text that the symbol picker and shortcuts work in as normal.
 *
 * Deliberately not LaTeX. A real TeX engine (KaTeX) would render `\frac{a}{b}`
 * beautifully in the browser and then be a blank in the PDF export, the AI
 * summary and the plain-text search — all of which read the stored string.
 * Unicode maths plus a serif italic setting is legible everywhere.
 */
export const MathInline = Mark.create({
  name: "mathInline",
  // Bold-inside-an-equation is noise; keep the run visually uniform.
  excludes: "_",

  parseHTML() {
    return [{ tag: 'span[data-math="inline"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, { "data-math": "inline", class: "math-inline" }),
      0,
    ]
  },

  addCommands() {
    return {
      toggleMathInline:
        () =>
        ({ commands }) =>
          commands.toggleMark(this.name),
    }
  },

  addKeyboardShortcuts() {
    return { "Mod-Shift-e": () => this.editor.commands.toggleMathInline() }
  },
})

/** A displayed equation — its own centred block, the way a textbook sets one. */
export const MathBlock = Node.create({
  name: "mathBlock",
  group: "block",
  content: "inline*",
  marks: "",
  defining: true,

  parseHTML() {
    return [{ tag: 'div[data-math="block"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-math": "block", class: "math-block" }),
      0,
    ]
  },

  addCommands() {
    return {
      setMathBlock:
        () =>
        ({ commands }) =>
          commands.setNode(this.name),
      toggleMathBlock:
        () =>
        ({ commands }) =>
          commands.toggleNode(this.name, "paragraph"),
    }
  },

  addInputRules() {
    return [
      new InputRule({
        // `$$ ` at the start of an empty line opens a display equation — the
        // same trigger TeX uses, so it is already in muscle memory.
        find: /^\$\$\s$/,
        handler: ({ chain, range }) => {
          chain().deleteRange(range).setNode(this.name).run()
        },
      }),
    ]
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Shift-m": () => this.editor.commands.toggleMathBlock(),
      // Enter on an empty equation line drops back to a paragraph, so there is
      // always a way out without reaching for the mouse.
      Enter: () => {
        const { $from, empty } = this.editor.state.selection
        if (!empty || $from.parent.type.name !== this.name) return false
        if ($from.parent.content.size > 0) return false
        return this.editor.commands.setNode("paragraph")
      },
    }
  },
})

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    styledBulletList: {
      setBulletStyle: (style: BulletStyle) => ReturnType
    }
    mathInline: {
      toggleMathInline: () => ReturnType
    }
    mathBlock: {
      setMathBlock: () => ReturnType
      toggleMathBlock: () => ReturnType
    }
  }
}
