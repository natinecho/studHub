import type { Metadata } from "next"
import { NotesScreen } from "@/components/screens/notes-screen"

export const metadata: Metadata = { title: "Notes | Student Hub" }

export default function NotesPage() {
  return <NotesScreen />
}
