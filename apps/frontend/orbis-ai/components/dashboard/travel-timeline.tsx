"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

interface HistoryItem {
  id: string
  title: string
  date: string
  image: string
  year: number
}

interface TravelTimelineProps {
  history: HistoryItem[]
}

export function TravelTimeline({ history }: TravelTimelineProps) {
  // Group by year
  const groupedByYear = history.reduce(
    (acc, item) => {
      if (!acc[item.year]) acc[item.year] = []
      acc[item.year].push(item)
      return acc
    },
    {} as Record<number, HistoryItem[]>,
  )

  const years = Object.keys(groupedByYear).sort((a, b) => Number(b) - Number(a))

  return (
    <div className="space-y-6">
      {years.map((year) => (
        <YearSection key={year} year={year} items={groupedByYear[Number(year)]} />
      ))}
    </div>
  )
}

function YearSection({ year, items }: { year: string; items: HistoryItem[] }) {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <div className="relative">
      {/* Year Header */}
      <button onClick={() => setIsExpanded(!isExpanded)} className="flex items-center gap-3 mb-4 group cursor-pointer">
        <span className="text-2xl font-serif font-bold text-muted-foreground group-hover:text-foreground transition-colors">
          {year}
        </span>
        <div className="flex-1 h-px bg-border" />
        <span className="text-sm text-muted-foreground">{isExpanded ? "Collapse" : "Expand"}</span>
      </button>

      {/* Timeline Items */}
      {isExpanded && (
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {items.map((item, index) => (
            <TimelineCard key={item.id} item={item} index={index} />
          ))}
        </div>
      )}
    </div>
  )
}

function TimelineCard({ item, index }: { item: HistoryItem; index: number }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "relative flex-shrink-0 w-48 bg-card border border-border rounded-xl overflow-hidden transition-all duration-200 cursor-pointer",
        isHovered && "shadow-lg -translate-y-1 border-muted",
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Image - Grayscale for past trips */}
      <div className="relative h-28 overflow-hidden">
        <img
          src={item.image || "/placeholder.svg"}
          alt={item.title}
          className={cn(
            "w-full h-full object-cover transition-all duration-300 grayscale",
            isHovered && "grayscale-0 scale-105",
          )}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="p-3">
        <h4 className="font-medium text-foreground text-sm line-clamp-1">{item.title}</h4>
        <span className="text-xs text-muted-foreground">{item.date}</span>
      </div>
    </div>
  )
}
