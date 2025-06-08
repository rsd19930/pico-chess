import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"

// Load the Inter font from Google Fonts
const inter = Inter({ subsets: ["latin"] })

// Metadata that appears in the browser tab and search engines
export const metadata: Metadata = {
  title: "Pico Chess - Endless Fun",
  description: "A simplified chess variant on a 6x6 board",
    generator: 'v0.dev'
}

// The root layout component that wraps all pages
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
