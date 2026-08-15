import type { Metadata } from "next"
import { GroupsScreen } from "@/components/screens/groups-screen"

export const metadata: Metadata = { title: "Groups | Student Hub" }

export default function GroupsPage() {
  return <GroupsScreen />
}
