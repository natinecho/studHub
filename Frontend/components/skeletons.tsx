/**
 * Shimmer skeletons.
 *
 * Every skeleton here mirrors the real markup it stands in for — same
 * wrappers, same paddings, same borders — so the layout does not jump when
 * the data lands. Only the text and avatars become `.sk` bars.
 *
 * `.sk` and the shimmer keyframes live in app/globals.css.
 */

import { cn } from "@/lib/utils"

/** A single shimmering bar. Give it size/radius with utilities. */
export function Sk({
  className,
  style,
}: {
  className?: string
  style?: React.CSSProperties
}) {
  return <span aria-hidden className={cn("sk", className)} style={style} />
}

/** Wraps a set of skeletons so screen readers announce one pending region. */
function SkRegion({
  label,
  className,
  style,
  children,
}: {
  label: string
  className?: string
  style?: React.CSSProperties
  children: React.ReactNode
}) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      className={cn("sk-stagger", className)}
      style={style}
    >
      {children}
      <span className="sr-only">{label}</span>
    </div>
  )
}

/** `--sk-i` staggers the sweep so a list reads as one wave. */
const row = (index: number) => ({ "--sk-i": index }) as React.CSSProperties

const range = (count: number) => Array.from({ length: count }, (_, i) => i)

/* ── Dashboard ─────────────────────────────────────────────────────────── */

/** Stat tiles: label, big number, and the progress rule underneath. */
export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <>
      {range(count).map((i) => (
        <div
          key={i}
          className="bp sk-stagger grid gap-2.5 px-4 pb-3.5 pt-4"
          style={row(i)}
          aria-hidden
        >
          <div className="flex items-center justify-between gap-2">
            <Sk className="h-2.5 w-20" />
            <Sk className="h-2.5 w-9" />
          </div>
          <div className="flex items-end gap-2">
            <Sk className="h-[30px] w-14 rounded-[8px]" />
            <Sk className="mb-[6px] h-2.5 w-10" />
          </div>
          <Sk className="h-[3px] w-full rounded-full" />
        </div>
      ))}
    </>
  )
}

/** Task queue rows: checkbox, title, meta line, trailing pill. */
export function TaskRowsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <SkRegion label="Loading tasks">
      {range(rows).map((i) => (
        <div
          key={i}
          className="grid grid-cols-[auto_1fr_auto] items-start gap-3 border-b px-4.5 py-3.5"
          style={{
            ...row(i),
            borderColor: "color-mix(in srgb, var(--color-text) 8%, transparent)",
          }}
        >
          <Sk className="mt-0.5 h-5 w-5 rounded-[7px]" />
          <div className="grid min-w-0 gap-[7px]">
            <Sk
              className="h-3.5"
              style={{ width: `${72 - (i % 3) * 14}%`, maxWidth: "22rem" }}
            />
            <Sk className="h-2.5 w-32" />
          </div>
          <Sk className="h-5 w-14 rounded-full" />
        </div>
      ))}
    </SkRegion>
  )
}

/** Activity feed rows: tag chip plus three stacked text lines. */
export function ActivityRowsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <SkRegion label="Loading activity">
      {range(rows).map((i) => (
        <div
          key={i}
          className="grid grid-cols-[auto_1fr] gap-3 border-b px-4.5 py-3.5"
          style={{
            ...row(i),
            borderColor: "color-mix(in srgb, var(--color-text) 8%, transparent)",
          }}
        >
          <Sk className="h-7 w-7 rounded-[9px]" />
          <div className="grid min-w-0 gap-[5px]">
            <Sk className="h-3.5" style={{ width: `${76 - (i % 3) * 12}%` }} />
            <Sk className="h-2.5" style={{ width: `${58 - (i % 2) * 10}%` }} />
            <Sk className="h-2.5 w-16" />
          </div>
        </div>
      ))}
    </SkRegion>
  )
}

/** The seven-day bar chart. Heights vary so it reads as a chart, not a grid. */
export function WeekChartSkeleton() {
  const heights = [26, 44, 18, 58, 34, 50, 22]
  return (
    <SkRegion
      label="Loading weekly activity"
      className="grid h-[88px] grid-cols-7 items-end gap-1.5"
    >
      {heights.map((height, i) => (
        <div key={i} className="grid justify-items-center gap-1.5" style={row(i)}>
          <Sk
            className="w-full rounded-t-[7px]"
            style={{ height, borderRadius: "7px 7px 0 0" }}
          />
          <Sk className="h-2 w-5" />
        </div>
      ))}
    </SkRegion>
  )
}

/* ── Lists (notes, forum, groups) ──────────────────────────────────────── */

/**
 * A `.list-card` placeholder. `lines` controls how much body text the real
 * card shows, so notes/posts/groups can each match their own density.
 */
export function ListCardsSkeleton({
  count = 4,
  padding,
  titleHeight = 18,
  showTags = false,
}: {
  count?: number
  padding?: number
  titleHeight?: number
  showTags?: boolean
}) {
  return (
    <SkRegion label="Loading list" className="contents">
      {range(count).map((i) => (
        <div
          key={i}
          className="list-card pointer-events-none"
          style={{ ...row(i), ...(padding ? { padding } : {}) }}
        >
          <span className="flex items-center gap-2">
            <Sk className="h-4 w-14 rounded-full" />
            <Sk className="ml-auto h-2.5 w-12" />
          </span>
          <Sk
            className="w-4/5 rounded-[7px]"
            style={{ height: titleHeight }}
          />
          <span className="grid gap-1.5">
            <Sk className="h-2.5 w-full" />
            <Sk className="h-2.5" style={{ width: `${70 - (i % 3) * 12}%` }} />
          </span>
          <span className="flex items-center gap-2">
            <Sk className="h-[22px] w-[22px] rounded-full" />
            <Sk className="h-2.5 w-24" />
          </span>
          {showTags && <Sk className="h-2.5 w-32" />}
        </div>
      ))}
    </SkRegion>
  )
}

/* ── Notes editor ──────────────────────────────────────────────────────── */

/** Title, author strip, toolbar, then paragraph text of varying width. */
export function NoteEditorSkeleton() {
  const widths = ["96%", "88%", "72%", "93%", "60%", "84%", "45%"]
  return (
    <SkRegion label="Opening note" className="flex min-w-0 flex-1 flex-col">
      <div className="flex flex-wrap items-start gap-3.5 border-b border-[var(--color-divider)] px-4.5 py-4">
        <div className="grid min-w-0 flex-1 gap-2.5">
          <Sk className="h-6 w-[60%] max-w-[24rem] rounded-[8px]" />
          <div className="flex items-center gap-2">
            <Sk className="h-[22px] w-[22px] rounded-full" />
            <Sk className="h-2.5 w-24" />
            <Sk className="h-2.5 w-16" />
          </div>
        </div>
        <div className="flex flex-none gap-2">
          <Sk className="h-8 w-8 rounded-[10px]" />
          <Sk className="h-8 w-8 rounded-[10px]" />
          <Sk className="h-8 w-20 rounded-[10px]" />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-[var(--color-divider)] px-4.5 py-2.5">
        {range(8).map((i) => (
          <Sk key={i} className="h-7 w-7 rounded-[8px]" style={row(i)} />
        ))}
      </div>

      <div className="grid gap-3 p-4.5">
        {widths.map((width, i) => (
          <Sk key={i} className="h-3.5" style={{ ...row(i), width }} />
        ))}
      </div>
    </SkRegion>
  )
}

/* ── Chat ──────────────────────────────────────────────────────────────── */

/** Conversation rail rows: avatar, name + time, preview, status line. */
export function ConversationsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <SkRegion label="Loading conversations">
      {range(count).map((i) => (
        <div
          key={i}
          className="mx-2 my-[3px] flex items-center gap-[11px] rounded-[14px] px-3 py-[11px]"
          style={row(i)}
        >
          <Sk className="h-9 w-9 flex-none rounded-full" />
          <div className="grid min-w-0 flex-1 gap-1.5">
            <div className="flex items-center gap-2">
              <Sk className="h-3 flex-1" style={{ maxWidth: "8rem" }} />
              <Sk className="ml-auto h-2.5 w-8 flex-none" />
            </div>
            <Sk className="h-2.5" style={{ width: `${82 - (i % 3) * 16}%` }} />
            <Sk className="h-2 w-16" />
          </div>
        </div>
      ))}
    </SkRegion>
  )
}

/** Message bubbles, alternating sides and widths like a real thread. */
export function MessagesSkeleton({ count = 6 }: { count?: number }) {
  const bubbles = [
    { own: false, w: 190, h: 40 },
    { own: true, w: 140, h: 34 },
    { own: false, w: 240, h: 56 },
    { own: true, w: 200, h: 40 },
    { own: false, w: 160, h: 34 },
    { own: true, w: 220, h: 52 },
  ]
  return (
    <SkRegion label="Loading messages" className="flex flex-1 flex-col gap-3">
      {range(count).map((i) => {
        const bubble = bubbles[i % bubbles.length]
        return (
          <div
            key={i}
            className="flex"
            style={{
              ...row(i),
              justifyContent: bubble.own ? "flex-end" : "flex-start",
            }}
          >
            <Sk
              style={{
                width: bubble.w,
                maxWidth: "78%",
                height: bubble.h,
                borderRadius: bubble.own
                  ? "16px 16px 5px 16px"
                  : "16px 16px 16px 5px",
              }}
            />
          </div>
        )
      })}
    </SkRegion>
  )
}

/* ── People / notifications ────────────────────────────────────────────── */

/** Avatar + two lines — the people picker and the notification feed. */
export function PeopleRowsSkeleton({
  count = 5,
  lines = 2,
  className,
}: {
  count?: number
  lines?: number
  className?: string
}) {
  return (
    <SkRegion label="Loading" className={className}>
      {range(count).map((i) => (
        <div
          key={i}
          className="mx-2 flex items-start gap-2.5 rounded-[14px] px-3 py-2.5"
          style={row(i)}
        >
          <Sk className="h-[30px] w-[30px] flex-none rounded-full" />
          <div className="grid min-w-0 flex-1 gap-1.5">
            <Sk className="h-3" style={{ width: `${70 - (i % 3) * 12}%` }} />
            {lines > 1 && (
              <Sk className="h-2.5" style={{ width: `${88 - (i % 2) * 20}%` }} />
            )}
            {lines > 2 && <Sk className="h-2 w-14" />}
          </div>
        </div>
      ))}
    </SkRegion>
  )
}

/* ── Whole-page shells ─────────────────────────────────────────────────── */

/** The public shared-note page, before the note resolves. */
export function SharedNoteSkeleton() {
  const widths = ["94%", "86%", "70%", "91%", "58%", "80%"]
  return (
    <SkRegion label="Opening the note" className="grid gap-5 py-6">
      <div className="grid gap-3">
        <Sk className="h-3 w-28" />
        <Sk className="h-8 w-[70%] max-w-[28rem] rounded-[8px]" />
        <div className="flex items-center gap-2">
          <Sk className="h-7 w-7 rounded-full" />
          <Sk className="h-2.5 w-24" />
          <Sk className="h-2.5 w-20" />
        </div>
      </div>
      <div
        className="grid gap-3 rounded-[16px] border border-[var(--color-divider)] p-6"
        style={{ background: "var(--color-surface)" }}
      >
        {widths.map((width, i) => (
          <Sk key={i} className="h-3.5" style={{ ...row(i), width }} />
        ))}
      </div>
    </SkRegion>
  )
}

/**
 * First paint of the authenticated app, while the session is being restored.
 * Draws the rail and top bar at their real sizes so the shell does not shift
 * once auth resolves.
 */
export function WorkspaceSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading your workspace"
      className="sk-stagger flex h-screen overflow-hidden bg-[var(--color-bg)]"
    >
      <aside
        className="hidden flex-none flex-col border-r border-[var(--color-divider)] sm:flex"
        style={{ width: 236, background: "var(--color-surface)" }}
      >
        <div className="flex h-[58px] flex-none items-center gap-2.5 border-b border-[var(--color-divider)] px-3.5">
          <Sk className="h-[26px] w-[26px] flex-none rounded-[9px]" />
          <Sk className="h-3.5 w-28" />
        </div>
        <div className="grid flex-1 content-start gap-[7px] px-2.5 py-4">
          {range(7).map((i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 px-2.5 py-2"
              style={row(i)}
            >
              <Sk className="h-[17px] w-[17px] flex-none rounded-[5px]" />
              <Sk className="h-3" style={{ width: `${58 + (i % 3) * 12}px` }} />
            </div>
          ))}
        </div>
        <div className="flex-none border-t border-[var(--color-divider)] p-2.5">
          <div className="flex items-center gap-2.5 px-2.5 py-2">
            <Sk className="h-7 w-7 flex-none rounded-full" />
            <Sk className="h-3 w-24" />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[58px] flex-none items-center gap-3 border-b border-[var(--color-divider)] px-[clamp(14px,2vw,22px)]">
          <Sk className="h-8 w-8 flex-none rounded-[10px]" />
          <div className="grid gap-1.5">
            <Sk className="h-3.5 w-32" />
            <Sk className="h-2.5 w-44" />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Sk className="h-8 w-8 rounded-[10px]" />
            <Sk className="h-8 w-8 rounded-[10px]" />
          </div>
        </header>

        <main className="flex-1 overflow-hidden p-[clamp(16px,2.2vw,26px)]">
          <div className="grid gap-5">
            <div className="grid gap-2.5">
              <Sk className="h-7 w-56 rounded-[8px]" />
              <Sk className="h-3 w-72" />
            </div>
            <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]">
              <StatCardsSkeleton />
            </div>
            <div className="bp hidden p-0 md:block">
              <ActivityRowsSkeleton rows={4} />
            </div>
          </div>
        </main>
      </div>
      <span className="sr-only">Loading your workspace</span>
    </div>
  )
}
