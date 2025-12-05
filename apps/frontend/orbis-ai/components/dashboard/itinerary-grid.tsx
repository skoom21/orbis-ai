"use client"

import { useState } from "react"
import { Calendar, MapPin, MoreHorizontal, Share2, Download, Pencil, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface Itinerary {
  id: string
  title: string
  coverImage: string
  dateRange: string
  destinations: string[]
  status: "draft" | "in-progress" | "booked"
  lastUpdated: string
  collaborators: { name: string; avatar: string }[]
}

interface ItineraryGridProps {
  itineraries: Itinerary[]
}

const statusConfig = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  "in-progress": { label: "In Progress", className: "bg-primary/20 text-primary" },
  booked: { label: "Booked", className: "bg-green-500/20 text-green-400" },
}

export function ItineraryGrid({ itineraries }: ItineraryGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {itineraries.map((itinerary, index) => (
        <ItineraryCard key={itinerary.id} itinerary={itinerary} index={index} />
      ))}
    </div>
  )
}

function ItineraryCard({ itinerary, index }: { itinerary: Itinerary; index: number }) {
  const [isHovered, setIsHovered] = useState(false)
  const status = statusConfig[itinerary.status]

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative bg-card border border-border rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 hover:border-primary/30 cursor-pointer"
      style={{
        animationDelay: `${index * 100}ms`,
      }}
    >
      {/* Cover Image */}
      <div className="relative h-40 overflow-hidden">
        <img
          src={itinerary.coverImage || "/placeholder.svg"}
          alt={itinerary.title}
          className={cn("w-full h-full object-cover transition-transform duration-500", isHovered && "scale-110")}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />

        {/* Status Badge */}
        <Badge className={cn("absolute top-3 left-3", status.className)}>{status.label}</Badge>

        {/* Quick Actions - appear on hover */}
        <div
          className={cn(
            "absolute top-3 right-3 flex items-center gap-1 transition-all duration-200",
            isHovered ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2",
          )}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 bg-background/80 backdrop-blur-sm rounded-lg hover:bg-background transition-colors">
                <MoreHorizontal className="w-4 h-4 text-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="gap-2 cursor-pointer">
                <ExternalLink className="w-4 h-4" />
                Open
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 cursor-pointer">
                <Pencil className="w-4 h-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 cursor-pointer">
                <Share2 className="w-4 h-4" />
                Share
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 cursor-pointer">
                <Download className="w-4 h-4" />
                Export
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4">
        <h3 className="font-serif font-semibold text-foreground text-lg mb-2 line-clamp-1 group-hover:text-primary transition-colors">
          {itinerary.title}
        </h3>

        {/* Date Range */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Calendar className="w-4 h-4" />
          <span>{itinerary.dateRange}</span>
        </div>

        {/* Destinations */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <MapPin className="w-4 h-4" />
          <span className="line-clamp-1">{itinerary.destinations.join(" → ")}</span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <span className="text-xs text-muted-foreground">Updated {itinerary.lastUpdated}</span>

          {/* Collaborators */}
          {itinerary.collaborators.length > 0 && (
            <div className="flex -space-x-2">
              {itinerary.collaborators.slice(0, 3).map((collab, i) => (
                <img
                  key={i}
                  src={collab.avatar || "/placeholder.svg"}
                  alt={collab.name}
                  className="w-6 h-6 rounded-full border-2 border-card"
                />
              ))}
              {itinerary.collaborators.length > 3 && (
                <div className="w-6 h-6 rounded-full bg-muted border-2 border-card flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">+{itinerary.collaborators.length - 3}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Hover glow effect */}
      <div
        className={cn(
          "absolute inset-0 rounded-2xl transition-opacity duration-300 pointer-events-none",
          isHovered ? "opacity-100" : "opacity-0",
        )}
        style={{
          boxShadow: "inset 0 0 0 1px rgba(107, 125, 196, 0.3)",
        }}
      />
    </div>
  )
}
