import type { Metadata } from "next"
import { DashboardScreen } from "@/components/screens/dashboard-screen"

export const metadata: Metadata = { title: "Dashboard | Student Hub" }

export default function DashboardPage() {
  return <DashboardScreen />
}
