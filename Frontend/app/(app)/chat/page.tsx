import type { Metadata } from "next"
import { ChatScreen } from "@/components/screens/chat-screen"

export const metadata: Metadata = { title: "Messages | Student Hub" }

export default function ChatPage() {
  return <ChatScreen />
}
