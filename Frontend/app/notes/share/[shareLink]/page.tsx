import type { Metadata } from "next"
import { SharedNoteView } from "@/components/notes/shared-note-view"

export const metadata: Metadata = {
  title: "Shared note | Student Hub",
  // A share link is for the people it was sent to, not for search engines.
  robots: "noindex, nofollow",
}

/**
 * Public read-only note. It lives outside the `(app)` route group on purpose —
 * that group's layout puts the sign-in page in front of everything it wraps,
 * and a share link has to open for someone with no account.
 */
export default async function SharedNotePage({
  params,
}: {
  params: Promise<{ shareLink: string }>
}) {
  const { shareLink } = await params
  return <SharedNoteView shareLink={shareLink} />
}
