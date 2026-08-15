import type React from "react"
import type { Metadata } from "next"
import { Barlow, Barlow_Condensed } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"
import { StructuredData } from "@/components/structured-data"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/lib/auth-context"
import { ChatUnreadProvider } from "@/lib/chat-unread"
import { ConfirmProvider } from "@/lib/confirm"
import { SocketProvider } from "@/lib/socket-context"

// Industry pairs Barlow Condensed headings over Barlow body text.
const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-barlow",
  display: "swap",
})

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-barlow-condensed",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Student Hub - Your Collaborative Workspace | Study Smarter Together",
  description:
    "A modern productivity platform for students featuring collaborative notes, task management, real-time chat, and AI assistance. Boost your academic performance with our comprehensive study tools.",
  keywords:
    "student productivity, collaborative notes, study groups, task management, academic tools, student chat, AI tutor",
  authors: [{ name: "Student Hub Team" }],
  creator: "Student Hub",
  publisher: "Student Hub",
  robots: "index, follow",
  openGraph: {
    title: "Student Hub - Your Collaborative Workspace",
    description:
      "Boost your academic performance with collaborative notes, smart task management, and AI-powered study assistance.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Student Hub - Your Collaborative Workspace",
    description:
      "Boost your academic performance with collaborative notes, smart task management, and AI-powered study assistance.",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // The font variables must live on <html> so `:root` can read them —
    // `--font-body` is defined there and would otherwise be invalid.
    <html
      lang="en"
      className={`${barlow.variable} ${barlowCondensed.variable}`}
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <SocketProvider>
              <ChatUnreadProvider>
                <ConfirmProvider>
                  <StructuredData />
                  {children}
                  <Toaster />
                </ConfirmProvider>
              </ChatUnreadProvider>
            </SocketProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
