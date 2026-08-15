/**
 * The symbol catalogue behind the editor's Ω picker and its `:name` shortcuts.
 *
 * These are real Unicode characters, not markup. That matters more than it
 * looks: a π typed here survives the PDF export, the AI summary, the search
 * index and a copy-paste into an email, none of which would understand a
 * custom node or a LaTeX string.
 */

export interface SymbolEntry {
  /** The character itself. */
  char: string
  /** What to call it in the picker's tooltip. */
  label: string
  /** Typed as `:name` followed by a space. First entry is the canonical one. */
  shortcuts: string[]
}

export interface SymbolGroup {
  name: string
  symbols: SymbolEntry[]
}

export const SYMBOL_GROUPS: SymbolGroup[] = [
  {
    name: "Greek",
    symbols: [
      { char: "π", label: "pi", shortcuts: ["pi"] },
      { char: "α", label: "alpha", shortcuts: ["alpha"] },
      { char: "β", label: "beta", shortcuts: ["beta"] },
      { char: "γ", label: "gamma", shortcuts: ["gamma"] },
      { char: "δ", label: "delta", shortcuts: ["delta"] },
      { char: "ε", label: "epsilon", shortcuts: ["epsilon", "eps"] },
      { char: "θ", label: "theta", shortcuts: ["theta"] },
      { char: "λ", label: "lambda", shortcuts: ["lambda"] },
      { char: "μ", label: "mu", shortcuts: ["mu"] },
      { char: "σ", label: "sigma", shortcuts: ["sigma"] },
      { char: "φ", label: "phi", shortcuts: ["phi"] },
      { char: "ω", label: "omega", shortcuts: ["omega"] },
      { char: "Δ", label: "Delta (change in)", shortcuts: ["Delta"] },
      { char: "Σ", label: "Sigma (sum)", shortcuts: ["Sigma"] },
      { char: "Ω", label: "Omega (ohm)", shortcuts: ["Omega", "ohm"] },
      { char: "Φ", label: "Phi", shortcuts: ["Phi"] },
    ],
  },
  {
    name: "Maths",
    symbols: [
      { char: "×", label: "times", shortcuts: ["times", "x"] },
      { char: "÷", label: "divide", shortcuts: ["div"] },
      { char: "±", label: "plus or minus", shortcuts: ["pm"] },
      { char: "√", label: "square root", shortcuts: ["sqrt", "root"] },
      { char: "∛", label: "cube root", shortcuts: ["cbrt"] },
      { char: "∑", label: "sum", shortcuts: ["sum"] },
      { char: "∏", label: "product", shortcuts: ["prod"] },
      { char: "∫", label: "integral", shortcuts: ["int"] },
      { char: "∂", label: "partial derivative", shortcuts: ["partial"] },
      { char: "∇", label: "nabla / grad", shortcuts: ["nabla", "grad"] },
      { char: "∞", label: "infinity", shortcuts: ["inf", "infty"] },
      { char: "≈", label: "approximately", shortcuts: ["approx"] },
      { char: "≠", label: "not equal", shortcuts: ["neq", "ne"] },
      { char: "≡", label: "identical to", shortcuts: ["equiv"] },
      { char: "≤", label: "less or equal", shortcuts: ["leq", "le"] },
      { char: "≥", label: "greater or equal", shortcuts: ["geq", "ge"] },
      { char: "∝", label: "proportional to", shortcuts: ["propto"] },
      { char: "°", label: "degree", shortcuts: ["deg"] },
      { char: "′", label: "prime", shortcuts: ["prime"] },
      { char: "⌀", label: "diameter", shortcuts: ["diameter"] },
    ],
  },
  {
    name: "Logic & sets",
    symbols: [
      { char: "∈", label: "element of", shortcuts: ["in"] },
      { char: "∉", label: "not an element of", shortcuts: ["notin"] },
      { char: "⊂", label: "subset of", shortcuts: ["subset"] },
      { char: "⊆", label: "subset or equal", shortcuts: ["subseteq"] },
      { char: "∪", label: "union", shortcuts: ["union", "cup"] },
      { char: "∩", label: "intersection", shortcuts: ["inter", "cap"] },
      { char: "∅", label: "empty set", shortcuts: ["empty"] },
      { char: "∀", label: "for all", shortcuts: ["forall"] },
      { char: "∃", label: "there exists", shortcuts: ["exists"] },
      { char: "¬", label: "not", shortcuts: ["not", "neg"] },
      { char: "∧", label: "and", shortcuts: ["and", "land"] },
      { char: "∨", label: "or", shortcuts: ["or", "lor"] },
      { char: "⊕", label: "exclusive or", shortcuts: ["xor", "oplus"] },
      { char: "∴", label: "therefore", shortcuts: ["therefore"] },
      { char: "∵", label: "because", shortcuts: ["because"] },
    ],
  },
  {
    name: "Arrows",
    symbols: [
      { char: "→", label: "right arrow", shortcuts: ["to", "rarr"] },
      { char: "←", label: "left arrow", shortcuts: ["larr"] },
      { char: "↔", label: "left-right arrow", shortcuts: ["harr"] },
      { char: "⇒", label: "implies", shortcuts: ["implies", "rArr"] },
      { char: "⇔", label: "if and only if", shortcuts: ["iff"] },
      { char: "↑", label: "up arrow", shortcuts: ["uarr"] },
      { char: "↓", label: "down arrow", shortcuts: ["darr"] },
      { char: "⟶", label: "reaction arrow", shortcuts: ["reacts"] },
      { char: "⇌", label: "equilibrium", shortcuts: ["equil"] },
    ],
  },
  {
    name: "Super & sub",
    symbols: [
      { char: "²", label: "squared", shortcuts: ["^2", "sq"] },
      { char: "³", label: "cubed", shortcuts: ["^3", "cube"] },
      { char: "⁴", label: "to the fourth", shortcuts: ["^4"] },
      { char: "ⁿ", label: "to the n", shortcuts: ["^n"] },
      { char: "⁻¹", label: "inverse", shortcuts: ["^-1", "inv"] },
      { char: "₀", label: "subscript 0", shortcuts: ["_0"] },
      { char: "₁", label: "subscript 1", shortcuts: ["_1"] },
      { char: "₂", label: "subscript 2", shortcuts: ["_2"] },
      { char: "₃", label: "subscript 3", shortcuts: ["_3"] },
      { char: "ₙ", label: "subscript n", shortcuts: ["_n"] },
      { char: "½", label: "one half", shortcuts: ["1/2", "half"] },
      { char: "¼", label: "one quarter", shortcuts: ["1/4"] },
      { char: "¾", label: "three quarters", shortcuts: ["3/4"] },
      { char: "⁄", label: "fraction slash", shortcuts: ["frac"] },
    ],
  },
  {
    name: "Notes",
    symbols: [
      { char: "•", label: "bullet", shortcuts: ["bullet"] },
      { char: "✓", label: "check", shortcuts: ["check", "tick"] },
      { char: "✗", label: "cross", shortcuts: ["cross"] },
      { char: "★", label: "star", shortcuts: ["star"] },
      { char: "⚠", label: "warning", shortcuts: ["warn"] },
      { char: "→", label: "leads to", shortcuts: ["leads"] },
      { char: "…", label: "ellipsis", shortcuts: ["..."] },
      { char: "—", label: "em dash", shortcuts: ["--"] },
      { char: "†", label: "dagger", shortcuts: ["dagger"] },
      { char: "§", label: "section", shortcuts: ["sect"] },
      { char: "€", label: "euro", shortcuts: ["euro"] },
      { char: "£", label: "pound", shortcuts: ["pound"] },
    ],
  },
]

/**
 * `shortcut → character`, built once at module load.
 *
 * A later duplicate does not overwrite an earlier one, so the first group that
 * claims a name keeps it (`:to` is the arrow, not something in Notes).
 */
export const SHORTCUT_MAP: ReadonlyMap<string, string> = (() => {
  const map = new Map<string, string>()
  for (const group of SYMBOL_GROUPS) {
    for (const entry of group.symbols) {
      for (const shortcut of entry.shortcuts) {
        if (!map.has(shortcut)) map.set(shortcut, entry.char)
      }
    }
  }
  return map
})()

/** Every symbol, flattened — used by the picker's search box. */
export const ALL_SYMBOLS: SymbolEntry[] = SYMBOL_GROUPS.flatMap(
  (group) => group.symbols
)

/** The bullet glyphs a list can be switched between. */
export const BULLET_STYLES = [
  { value: "disc", label: "Disc", preview: "•" },
  { value: "circle", label: "Circle", preview: "◦" },
  { value: "square", label: "Square", preview: "▪" },
  { value: "dash", label: "Dash", preview: "–" },
  { value: "arrow", label: "Arrow", preview: "→" },
  { value: "check", label: "Check", preview: "✓" },
] as const

export type BulletStyle = (typeof BULLET_STYLES)[number]["value"]
