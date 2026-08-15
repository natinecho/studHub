"use client"

import { useEffect, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { IconButton } from "@/components/icon-button"

/**
 * The one modal shell every dialog uses.
 *
 * A translucent scrim covers the entire viewport — sidebar included — and the
 * card sits centred on top of it. The header and footer stay put while only the
 * middle scrolls, so a tall form is never clipped on a short screen.
 */
export function Modal({
  kicker,
  title,
  subtitle,
  onClose,
  footer,
  maxWidth = 560,
  bodyClassName = "grid content-start gap-[15px] py-[20px]",
  children,
}: {
  kicker?: string
  title: string
  subtitle?: string
  onClose: () => void
  footer?: ReactNode
  maxWidth?: number
  bodyClassName?: string
  children: ReactNode
}) {
  // Rendered into <body> rather than wherever it was declared, so no ancestor's
  // overflow, transform or stacking context can box the overlay in — it always
  // covers the whole window, sidebar included.
  const [container, setContainer] = useState<HTMLElement | null>(null)
  useEffect(() => setContainer(document.body), [])

  // Escape closes, and the page behind must not scroll while we're open.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = previous
    }
  }, [onClose])

  if (!container) return null

  return createPortal(
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center p-[clamp(12px,3vw,28px)]"
      // `--color-scrim` is a fixed darkening layer rather than a neutral-ramp
      // mix: the ramp inverts in dark mode, which would light the backdrop up.
      style={{
        background: "var(--color-scrim)",
        backdropFilter: "blur(2px)",
      }}
      // Only a click that lands on the scrim itself closes — comparing the
      // target keeps a selection drag that ends outside the card from counting.
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="animate-rise-in-fast flex w-full flex-col overflow-hidden rounded-[18px] border border-[var(--color-divider)]"
        style={{
          maxWidth,
          maxHeight: "100%",
          background: "var(--color-bg)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <div className="flex flex-none items-start gap-3 border-b border-[var(--color-divider)] px-[20px] py-4">
          <div className="min-w-0 flex-1">
            {kicker && <p className="kicker mb-1">{kicker}</p>}
            <h2
              className="m-0 text-[22px] leading-tight"
              style={{ fontFamily: "var(--font-heading)", fontWeight: 600 }}
            >
              {title}
            </h2>
            {subtitle && (
              <p
                className="m-0 mt-1 text-[12.5px]"
                style={{
                  color:
                    "color-mix(in srgb, var(--color-text) 55%, transparent)",
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
          <IconButton title="Close" onClick={onClose}>
            <X size={15} strokeWidth={1.5} />
          </IconButton>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-[20px]">
          <div className={bodyClassName}>{children}</div>
        </div>

        {footer && (
          <div className="flex flex-none items-center gap-2 border-t border-[var(--color-divider)] px-[20px] py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>,
    container
  )
}
