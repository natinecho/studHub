"use client"

import { useState, type ComponentPropsWithoutRef } from "react"
import { Eye, EyeOff } from "lucide-react"

/**
 * A password field with a reveal toggle.
 *
 * Typing a password you cannot see, into a form that only tells you it was
 * wrong after a round trip, is the main reason sign-in fails twice before it
 * works. The eye is per-field: on the change-password form the current and the
 * new password reveal independently, which is what you want when checking one
 * against the other.
 *
 * `type` is owned here and deliberately not accepted as a prop — everything
 * else passes straight through to the input.
 */
export function PasswordInput({
  className = "field-input h-10",
  ...props
}: Omit<ComponentPropsWithoutRef<"input">, "type">) {
  const [visible, setVisible] = useState(false)

  return (
    // The wrapper is what the button positions against. `block` because a bare
    // span is inline, and an inline box has no height to centre against.
    <span className="relative block">
      <input
        {...props}
        type={visible ? "text" : "password"}
        // Room for the button, so a long password does not run underneath it.
        className={`${className} pr-[38px]`}
      />
      <button
        type="button" // Not "submit": this sits inside the sign-in form.
        onClick={() => setVisible((shown) => !shown)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        title={visible ? "Hide password" : "Show password"}
        className="absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-[8px] transition-colors"
        style={{
          color: visible
            ? "var(--color-accent-700)"
            : "color-mix(in srgb, var(--color-text) 50%, transparent)",
        }}
      >
        {visible ? (
          <EyeOff size={15} strokeWidth={1.6} />
        ) : (
          <Eye size={15} strokeWidth={1.6} />
        )}
      </button>
    </span>
  )
}
