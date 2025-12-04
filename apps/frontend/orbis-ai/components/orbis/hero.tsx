"use client"

import { motion } from "framer-motion"
import { useState, useEffect } from "react"
import { Plane, MapPin, Calendar, Sparkles } from "lucide-react"
import Image from "next/image"
export function OrbisHero() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <section className="relative overflow-hidden min-h-screen flex flex-col">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-card/30" />

      <div className="container mx-auto px-4 py-24 sm:py-32 relative z-10 flex-1 flex flex-col">
        <div className="mx-auto max-w-4xl text-center flex-1 flex flex-col justify-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-full bg-primary/20 border border-primary/30 text-primary">
              <Sparkles className="h-4 w-4" />
              AI-Powered Travel Planning
            </span>
          </motion.div>

          {/* Main Heading */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-8"
          >
            <h1 className="font-serif text-4xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl text-balance">
              Your Intelligent <span className="text-accent">Travel Companion</span>
            </h1>
          </motion.div>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mx-auto mb-12 max-w-2xl text-lg text-muted-foreground leading-relaxed"
          >
            Orbis AI is your agentic travel planning and booking assistant. Search flights, compare hotels, and get
            personalized day-by-day itineraries tailored to your budget and preferences—all through natural
            conversation.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            {/* Primary CTA */}
            <a
              href="/signup"
              className="group cursor-pointer bg-accent hover:bg-accent/90 text-accent-foreground rounded-full px-8 py-4 font-semibold text-lg shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-3"
            >
              <Plane className="h-5 w-5" />
              Start Planning
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="group-hover:translate-x-1 transition-transform"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </a>

            {/* Secondary CTA - Updated for dark mode */}
            <a
              href="#features"
              className="cursor-pointer border-2 border-primary/50 text-primary hover:bg-primary/20 hover:border-primary rounded-full px-8 py-4 font-semibold text-lg transition-all duration-200"
            >
              See How It Works
            </a>
          </motion.div>

          {/* Feature Pills - Updated for dark mode */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-16 flex flex-wrap items-center justify-center gap-4"
          >
            <div className="flex items-center gap-2 px-4 py-2 bg-card/80 rounded-full border border-border text-sm text-muted-foreground">
              <Plane className="h-4 w-4 text-primary" />
              Flight Search
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-card/80 rounded-full border border-border text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 text-accent" />
              Hotel Booking
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-card/80 rounded-full border border-border text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 text-primary" />
              Itinerary Planning
            </div>
          </motion.div>
        </div>

        {/* Hero Visual - Globe/Travel Illustration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-16 flex justify-center"
        >
          <div className="relative w-full max-w-3xl">
            {/* Decorative globe element */}
            <div className="relative mx-auto w-64 h-64 sm:w-80 sm:h-80">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 blur-3xl" />
              <Image
                width={256}
                height={256}
                src="/images/the-logo.jpeg"
                alt="Orbis AI Globe"
                className="relative w-full h-full object-contain rounded-2xl shadow-2xl"
              />

              {/* Floating elements */}
              <motion.div
                className="absolute -top-4 -right-4 bg-card border border-border rounded-xl p-3 shadow-lg"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
              >
                <Plane className="h-6 w-6 text-primary" />
              </motion.div>

              <motion.div
                className="absolute -bottom-4 -left-4 bg-card border border-border rounded-xl p-3 shadow-lg"
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay: 1 }}
              >
                <MapPin className="h-6 w-6 text-accent" />
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Trust Indicators */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-auto pt-16 pb-8"
        >
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-6">Powered by cutting-edge technology</p>
            <div className="flex items-center justify-center gap-8 flex-wrap">
              <div className="flex items-center gap-2 text-muted-foreground">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
                <span className="text-sm font-medium">Multi-Agent AI</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                <span className="text-sm font-medium">Amadeus APIs</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                </svg>
                <span className="text-sm font-medium">Secure Payments</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
