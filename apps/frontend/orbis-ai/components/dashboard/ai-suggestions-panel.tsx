"use client"

import { useState } from "react"
import { Sparkles, X, ChevronUp, MapPin, Calendar, DollarSign, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"

const suggestions = [
  {
    id: "1",
    icon: Calendar,
    title: "Add activities to Day 2",
    description: "Your Paris trip has a free afternoon",
    color: "#6b7dc4",
  },
  {
    id: "2",
    icon: TrendingUp,
    title: "Cherry Blossom Peak",
    description: "Book Tokyo hotels soon - prices rising",
    color: "#db5844",
  },
  {
    id: "3",
    icon: DollarSign,
    title: "Budget-friendly hotels",
    description: "Found 3 options under $150/night in Rome",
    color: "#4ade80",
  },
]

export function AISuggestionsPanel() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isVisible, setIsVisible] = useState(true)

  if (!isVisible) return null

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Expanded Panel */}
      {isExpanded && (
        <div className="absolute bottom-16 right-0 w-80 bg-card border border-border rounded-2xl shadow-2xl shadow-primary/10 overflow-hidden mb-3 animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-primary/10 to-accent/10">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="font-semibold text-foreground">Orbis Suggestions</span>
            </div>
            <button onClick={() => setIsVisible(false)} className="p-1 hover:bg-muted rounded-lg transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Suggestions List */}
          <div className="p-3 space-y-2 max-h-80 overflow-auto">
            {suggestions.map((suggestion, index) => {
              const Icon = suggestion.icon
              return (
                <button
                  key={suggestion.id}
                  className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-left group"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                    style={{ backgroundColor: `${suggestion.color}20` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: suggestion.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground text-sm group-hover:text-primary transition-colors">
                      {suggestion.title}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{suggestion.description}</p>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-border">
            <button className="w-full flex items-center justify-center gap-2 p-3 bg-primary/10 hover:bg-primary/20 rounded-xl transition-colors">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">View all suggestions</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "flex items-center gap-2 px-5 py-3 rounded-full font-medium shadow-lg transition-all duration-300 group",
          isExpanded
            ? "bg-card border border-border text-foreground"
            : "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-primary/30 hover:shadow-primary/50",
        )}
      >
        {isExpanded ? (
          <>
            <ChevronUp className="w-5 h-5" />
            <span>Close</span>
          </>
        ) : (
          <>
            <div className="relative">
              <Sparkles className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full animate-ping" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full" />
            </div>
            <span>Ask Orbis</span>
          </>
        )}
      </button>
    </div>
  )
}
