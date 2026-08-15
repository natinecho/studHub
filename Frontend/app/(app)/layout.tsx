import type { ReactNode } from "react"
import { AppShell } from "@/components/app-shell"

/** Chrome shared by every signed-in screen: rail, header, palette, assistant. */
export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>
}
