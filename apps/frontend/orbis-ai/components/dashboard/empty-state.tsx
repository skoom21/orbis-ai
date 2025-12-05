"use client"

import { MapPin, Plane, Sparkles } from "lucide-react"

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      {/* Art Brut Style Illustration */}
      <div className="relative w-64 h-64 mb-8">
        {/* Background circle with brushstroke texture */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 border-2 border-dashed border-primary/20" />

        {/* Decorative elements */}
        <div className="absolute top-4 right-8 w-8 h-8 rounded-full bg-accent/20 animate-pulse" />
        <div
          className="absolute bottom-8 left-4 w-6 h-6 rounded-full bg-primary/20 animate-pulse"
          style={{ animationDelay: "500ms" }}
        />

        {/* Main icons */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center rotate-12 absolute -top-2 -left-2">
              <Plane className="w-10 h-10 text-primary -rotate-12" />
            </div>
            <div className="w-20 h-20 rounded-2xl bg-accent/20 flex items-center justify-center -rotate-6 relative z-10">
              <MapPin className="w-10 h-10 text-accent rotate-6" />
            </div>
          </div>
        </div>

        {/* Sparkles */}
        <Sparkles
          className="absolute top-12 left-12 w-6 h-6 text-primary/50 animate-bounce"
          style={{ animationDelay: "200ms" }}
        />
        <Sparkles
          className="absolute bottom-16 right-12 w-5 h-5 text-accent/50 animate-bounce"
          style={{ animationDelay: "400ms" }}
        />
      </div>

      {/* Text Content */}
      <h2 className="text-3xl font-serif font-bold text-foreground mb-3">Your journey begins here</h2>
      <p className="text-muted-foreground max-w-md mb-8">
        Start planning your first adventure with Orbis AI. Tell us where you want to go, and we'll help you create the
        perfect itinerary.
      </p>

      {/* CTA Button */}
      <button className="flex items-center gap-3 px-8 py-4 bg-accent text-accent-foreground rounded-xl font-semibold text-lg shadow-lg shadow-accent/25 hover:shadow-accent/40 hover:-translate-y-1 transition-all duration-200 group">
        <Sparkles className="w-5 h-5 transition-transform group-hover:rotate-12 duration-300" />
        <span>Create Your First Trip</span>
      </button>

      {/* Suggestions */}
      <div className="mt-12 space-y-3">
        <p className="text-sm text-muted-foreground">Popular destinations to explore:</p>
        <div className="flex flex-wrap justify-center gap-2">
          {["Paris", "Tokyo", "Bali", "New York", "Rome"].map((dest) => (
            <button
              key={dest}
              className="px-4 py-2 bg-card border border-border rounded-full text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
            >
              {dest}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
