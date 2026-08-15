"use client"

import type { CSSProperties, ReactNode } from "react"

/** The design's `.btn .btn-secondary .btn-icon` — a 36px hairline circle. */
export function IconButton({
  title,
  onClick,
  children,
  className = "",
  style,
  disabled,
}: {
  title: string
  onClick?: () => void
  children: ReactNode
  className?: string
  style?: CSSProperties
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={`grid h-9 w-9 flex-none place-items-center rounded-full border border-[var(--color-divider)] transition-colors hover:bg-[color-mix(in_srgb,var(--color-text)_7%,transparent)] disabled:opacity-45 ${className}`}
      style={style}
    >
      {children}
    </button>
  )
}
