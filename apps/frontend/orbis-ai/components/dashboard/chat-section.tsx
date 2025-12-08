"use client"

import { useState } from "react"
import { MessageSquare, LinkIcon, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

interface Chat {
  id: string
  title: string
  lastMessage: string
  timestamp: string
  linkedItinerary: string | null
  category: "general" | "trip-draft" | "planning"
}

interface ChatSectionProps {
  chats: Chat[]
  expanded?: boolean
}

const categoryConfig = {
  general: { label: "General", className: "bg-muted text-muted-foreground" },
  "trip-draft": { label: "Trip Draft", className: "bg-primary/20 text-primary" },
  planning: { label: "Planning", className: "bg-accent/20 text-accent" },
}

export function ChatSection({ chats, expanded = false }: ChatSectionProps) {
  return (
    <div className={cn("space-y-3", expanded && "grid grid-cols-1 md:grid-cols-2 gap-4")}>
      {chats.map((chat, index) => (
        <ChatCard key={chat.id} chat={chat} index={index} />
      ))}
    </div>
  )
}

import Link from "next/link"

function ChatCard({ chat, index }: { chat: Chat; index: number }) {
  const [isHovered, setIsHovered] = useState(false)
  const category = categoryConfig[chat.category]

  return (
    <Link href={`/chat/${chat.id}`}>
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="group relative flex items-start gap-4 p-4 bg-card border border-border rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30 cursor-pointer"
        style={{ animationDelay: `${index * 50}ms` }}
      >
        {/* Icon */}
        <div
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-200",
            isHovered ? "bg-primary/20" : "bg-muted",
          )}
        >
          <MessageSquare
            className={cn("w-5 h-5 transition-colors duration-200", isHovered ? "text-primary" : "text-muted-foreground")}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
              {chat.title}
            </h4>
            <Badge className={cn("text-xs", category.className)}>{category.label}</Badge>
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{chat.lastMessage}</p>

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{chat.timestamp}</span>

            {chat.linkedItinerary && (
              <div className="flex items-center gap-1 text-xs text-primary">
                <LinkIcon className="w-3 h-3" />
                <span className="truncate max-w-[120px]">{chat.linkedItinerary}</span>
              </div>
            )}
          </div>
        </div>

        {/* Arrow */}
        <ChevronRight
          className={cn(
            "w-5 h-5 text-muted-foreground transition-all duration-200 flex-shrink-0",
            isHovered && "translate-x-1 text-primary",
          )}
        />

        {/* Typing indicator on hover */}
        {isHovered && (
          <div className="absolute bottom-3 left-14 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        )}
      </div>
    </Link>
  )
}
