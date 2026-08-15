import type { Metadata } from "next"
import { SettingsScreen } from "@/components/screens/settings-screen"

export const metadata: Metadata = { title: "Settings | Student Hub" }

export default function SettingsPage() {
  return <SettingsScreen />
}
