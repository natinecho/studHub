"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { Modal } from "@/components/modal"

export interface ConfirmOptions {
  title: string
  /** The consequence, in a sentence. Say what can't be undone. */
  body?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** Paints the confirm button as a warning. On by default. */
  destructive?: boolean
}

type Confirm = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<Confirm | null>(null)

/**
 * Replaces `window.confirm` for destructive actions: same await-a-boolean
 * shape, but rendered in the app's own dialog instead of a browser chrome box
 * that ignores the theme and can be suppressed by the browser.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<ConfirmOptions | null>(null)
  const resolveRef = useRef<((answer: boolean) => void) | null>(null)

  const confirm = useCallback<Confirm>((options) => {
    return new Promise<boolean>((resolve) => {
      // A second request while one is open cancels the first, so its caller
      // never hangs waiting on a promise nothing will settle.
      resolveRef.current?.(false)
      resolveRef.current = resolve
      setPending(options)
    })
  }, [])

  const settle = useCallback((answer: boolean) => {
    resolveRef.current?.(answer)
    resolveRef.current = null
    setPending(null)
  }, [])

  const value = useMemo(() => confirm, [confirm])

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {pending && (
        <Modal
          title={pending.title}
          onClose={() => settle(false)}
          maxWidth={440}
          bodyClassName="grid content-start gap-2 py-[20px]"
          footer={
            <>
              <span className="flex-1" />
              <button
                type="button"
                className="rounded-[10px] border border-[var(--color-divider)] px-4 py-2 text-[13px]"
                onClick={() => settle(false)}
              >
                {pending.cancelLabel ?? "Cancel"}
              </button>
              <button
                type="button"
                autoFocus
                className="rounded-[10px] border px-4 py-2 text-[13px] font-medium"
                style={
                  pending.destructive === false
                    ? {
                        background: "var(--color-accent)",
                        borderColor: "var(--color-accent)",
                        color: "var(--color-bg)",
                      }
                    : {
                        // Red, not accent-blue: the whole point of this dialog
                        // is that the confirm button is the dangerous one.
                        background: "var(--color-danger)",
                        borderColor: "var(--color-danger)",
                        color: "#fff",
                      }
                }
                onClick={() => settle(true)}
              >
                {pending.confirmLabel ?? "Delete"}
              </button>
            </>
          }
        >
          <p className="m-0 text-[13.5px] leading-[1.55] opacity-75">
            {pending.body ?? "This cannot be undone."}
          </p>
        </Modal>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error("useConfirm must be used inside <ConfirmProvider>")
  }
  return context
}
