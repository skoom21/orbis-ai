"use client"

import { useState } from "react"
import { FolderOpen, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

interface Collection {
  id: string
  name: string
  itemCount: number
  color: string
}

interface CollectionsGridProps {
  collections: Collection[]
  expanded?: boolean
}

export function CollectionsGrid({ collections, expanded = false }: CollectionsGridProps) {
  return (
    <div className={cn("grid gap-4", expanded ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-2")}>
      {collections.map((collection, index) => (
        <CollectionCard key={collection.id} collection={collection} index={index} />
      ))}

      {/* Add New Collection */}
      <button className="flex flex-col items-center justify-center gap-2 p-6 bg-card/50 border-2 border-dashed border-border rounded-xl hover:border-primary/50 hover:bg-card transition-all duration-200 cursor-pointer group min-h-[120px]">
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center group-hover:bg-primary/20 transition-colors">
          <Plus className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
          New Collection
        </span>
      </button>
    </div>
  )
}

function CollectionCard({ collection, index }: { collection: Collection; index: number }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "relative flex flex-col items-center justify-center gap-3 p-6 bg-card border border-border rounded-xl transition-all duration-200 cursor-pointer min-h-[120px]",
        isHovered && "shadow-lg -translate-y-1",
      )}
      style={{
        animationDelay: `${index * 50}ms`,
        borderColor: isHovered ? collection.color : undefined,
      }}
    >
      {/* Folder Icon with Art Brut style */}
      <div
        className={cn(
          "w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300",
          isHovered && "scale-110",
        )}
        style={{
          backgroundColor: `${collection.color}20`,
        }}
      >
        <FolderOpen
          className={cn("w-7 h-7 transition-all duration-200", isHovered && "animate-pulse")}
          style={{ color: collection.color }}
        />
      </div>

      {/* Name */}
      <h4 className="font-semibold text-foreground text-center">{collection.name}</h4>

      {/* Item count */}
      <span className="text-xs text-muted-foreground">
        {collection.itemCount} {collection.itemCount === 1 ? "item" : "items"}
      </span>

      {/* Hover wobble effect indicator */}
      {isHovered && (
        <div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            boxShadow: `0 0 20px ${collection.color}30`,
          }}
        />
      )}
    </div>
  )
}
