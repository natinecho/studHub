import { redirect } from "next/navigation"

/** The workspace starts on the dashboard, which has its own URL. */
export default function Home() {
  redirect("/dashboard")
}
