import type { Metadata } from "next"
import { ForumScreen } from "@/components/screens/forum-screen"

export const metadata: Metadata = { title: "Forum | Student Hub" }

export default function ForumPage() {
  return <ForumScreen />
}
