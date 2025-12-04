import type React from "react"
import type { Metadata } from "next"
import { Istok_Web, Open_Sans } from "next/font/google"
import "./globals.css"

const istokWeb = Istok_Web({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-istok",
})

const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-open-sans",
})

export const metadata: Metadata = {
  title: "Orbis AI - Your Intelligent Travel Companion",
  description:
    "An agentic travel planning and booking system. Plan trips, book flights, hotels, and get personalized itineraries with AI-powered assistance.",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${istokWeb.variable} ${openSans.variable}`}>
      <head>
        <style>{`
html {
  font-family: 'Open Sans', sans-serif;
  --font-sans: 'Open Sans', sans-serif;
  --font-serif: 'Istok Web', sans-serif;
}
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  )
}
