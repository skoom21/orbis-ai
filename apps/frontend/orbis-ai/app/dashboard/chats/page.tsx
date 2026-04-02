"use client"

import { useState } from "react"
import Link from "next/link"
import { 
  Plus, 
  Search, 
  MessageSquare, 
  LinkIcon, 
  ChevronRight,
  Sparkles,
  Clock,
  Trash2,
  Archive,
  Pin,
  MoreHorizontal,
  Filter
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Mock data
const mockChats = [
  {
    id: "1",
    title: "Planning Paris Trip",
    lastMessage: "I found 3 great hotel options near the Eiffel Tower. The first one is Hotel Le Marais with a 4.8 rating...",
    timestamp: "10 min ago",
    linkedItinerary: { id: "1", name: "Paris Spring Adventure" },
    category: "planning" as const,
    isPinned: true,
    messageCount: 24,
    agentType: "planner",
  },
  {
    id: "2",
    title: "Tokyo Restaurant Recommendations",
    lastMessage: "Here are my top picks for authentic ramen in Shibuya. Ichiran is famous for their tonkotsu...",
    timestamp: "2 hours ago",
    linkedItinerary: { id: "2", name: "Tokyo Cherry Blossom" },
    category: "trip-draft" as const,
    isPinned: true,
    messageCount: 18,
    agentType: "itinerary",
  },
  {
    id: "3",
    title: "General Travel Tips",
    lastMessage: "The best time to visit Southeast Asia is typically from November to February when the weather...",
    timestamp: "Yesterday",
    linkedItinerary: null,
    category: "general" as const,
    isPinned: false,
    messageCount: 8,
    agentType: "planner",
  },
  {
    id: "4",
    title: "Flight Options to Rome",
    lastMessage: "I found several direct flights from JFK to Rome. The best value option is with ITA Airways...",
    timestamp: "2 days ago",
    linkedItinerary: { id: "3", name: "Italian Summer Escape" },
    category: "planning" as const,
    isPinned: false,
    messageCount: 12,
    agentType: "flight",
  },
  {
    id: "5",
    title: "Bali Hotel Comparison",
    lastMessage: "Based on your preferences, I recommend the Ubud Hanging Gardens for the wellness experience...",
    timestamp: "3 days ago",
    linkedItinerary: { id: "4", name: "Bali Wellness Retreat" },
    category: "trip-draft" as const,
    isPinned: false,
    messageCount: 15,
    agentType: "hotel",
  },
  {
    id: "6",
    title: "Budget Trip Ideas",
    lastMessage: "For budget-friendly destinations in Europe, I recommend Portugal, Poland, and Greece...",
    timestamp: "1 week ago",
    linkedItinerary: null,
    category: "general" as const,
    isPinned: false,
    messageCount: 6,
    agentType: "planner",
  },
]

const categoryConfig = {
  general: { label: "General", className: "bg-muted text-muted-foreground", icon: MessageSquare },
  "trip-draft": { label: "Trip Draft", className: "bg-primary/20 text-primary", icon: Sparkles },
  planning: { label: "Planning", className: "bg-accent/20 text-accent", icon: Clock },
}

const agentConfig = {
  planner: { label: "Planner", color: "text-blue-400" },
  flight: { label: "Flight", color: "text-cyan-400" },
  hotel: { label: "Hotel", color: "text-purple-400" },
  itinerary: { label: "Itinerary", color: "text-green-400" },
  booking: { label: "Booking", color: "text-orange-400" },
}

type CategoryFilter = "all" | "general" | "trip-draft" | "planning"

export default function ChatsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all")

  const pinnedChats = mockChats.filter(chat => chat.isPinned)
  const recentChats = mockChats.filter(chat => !chat.isPinned)

  const filteredChats = mockChats.filter((chat) => {
    const matchesSearch = chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === "all" || chat.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const filteredPinned = filteredChats.filter(chat => chat.isPinned)
  const filteredRecent = filteredChats.filter(chat => !chat.isPinned)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Chats</h1>
          <p className="text-muted-foreground mt-1">Your conversations with Orbis AI assistant</p>
        </div>
        <Link href="/chat">
          <Button className="gap-2 bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4" />
            New Chat
          </Button>
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card border-border"
          />
        </div>

        {/* Category Filter */}
        <Tabs value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as CategoryFilter)}>
          <TabsList className="bg-card/50 border border-border">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="planning" className="text-xs">Planning</TabsTrigger>
            <TabsTrigger value="trip-draft" className="text-xs">Trip Drafts</TabsTrigger>
            <TabsTrigger value="general" className="text-xs">General</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard 
          label="Total Chats" 
          value={mockChats.length} 
          icon={<MessageSquare className="w-4 h-4" />}
        />
        <StatCard 
          label="Linked to Trips" 
          value={mockChats.filter(c => c.linkedItinerary).length} 
          icon={<LinkIcon className="w-4 h-4" />}
        />
        <StatCard 
          label="Pinned" 
          value={pinnedChats.length} 
          icon={<Pin className="w-4 h-4" />}
        />
        <StatCard 
          label="This Week" 
          value={4} 
          icon={<Clock className="w-4 h-4" />}
        />
      </div>

      {/* Chats List */}
      {filteredChats.length === 0 ? (
        <EmptyState searchQuery={searchQuery} />
      ) : (
        <div className="space-y-6">
          {/* Pinned Section */}
          {filteredPinned.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Pin className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Pinned</h2>
              </div>
              <div className="space-y-2">
                {filteredPinned.map((chat, index) => (
                  <ChatCard key={chat.id} chat={chat} index={index} />
                ))}
              </div>
            </section>
          )}

          {/* Recent Section */}
          {filteredRecent.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Recent</h2>
              </div>
              <div className="space-y-2">
                {filteredRecent.map((chat, index) => (
                  <ChatCard key={chat.id} chat={chat} index={index} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

function EmptyState({ searchQuery }: { searchQuery: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <MessageSquare className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {searchQuery ? "No chats found" : "No conversations yet"}
      </h3>
      <p className="text-muted-foreground mb-6 max-w-md">
        {searchQuery 
          ? `We couldn't find any chats matching "${searchQuery}". Try a different search term.`
          : "Start a conversation with Orbis AI to plan your next trip."
        }
      </p>
      {!searchQuery && (
        <Link href="/chat">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Start Your First Chat
          </Button>
        </Link>
      )}
    </div>
  )
}

interface Chat {
  id: string
  title: string
  lastMessage: string
  timestamp: string
  linkedItinerary: { id: string; name: string } | null
  category: "general" | "trip-draft" | "planning"
  isPinned: boolean
  messageCount: number
  agentType: string
}

function ChatCard({ chat, index }: { chat: Chat; index: number }) {
  const [isHovered, setIsHovered] = useState(false)
  const category = categoryConfig[chat.category]
  const agent = agentConfig[chat.agentType as keyof typeof agentConfig] || agentConfig.planner
  const CategoryIcon = category.icon

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
            "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-200",
            isHovered ? "bg-primary/20" : "bg-muted",
          )}
        >
          <CategoryIcon
            className={cn("w-6 h-6 transition-colors duration-200", isHovered ? "text-primary" : "text-muted-foreground")}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h4 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              {chat.title}
            </h4>
            {chat.isPinned && <Pin className="w-3 h-3 text-primary flex-shrink-0" />}
            <Badge className={cn("text-xs flex-shrink-0", category.className)}>{category.label}</Badge>
            <span className={cn("text-xs", agent.color)}>{agent.label} Agent</span>
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{chat.lastMessage}</p>

          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{chat.timestamp}</span>
              <span>•</span>
              <span>{chat.messageCount} messages</span>
            </div>

            {chat.linkedItinerary && (
              <div className="flex items-center gap-1 text-xs text-primary">
                <LinkIcon className="w-3 h-3" />
                <span className="truncate max-w-[150px]">{chat.linkedItinerary.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
              <button 
                className={cn(
                  "p-2 rounded-lg transition-all duration-200",
                  isHovered ? "opacity-100 bg-muted" : "opacity-0"
                )}
              >
                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="gap-2 cursor-pointer">
                <Pin className="w-4 h-4" />
                {chat.isPinned ? "Unpin" : "Pin"}
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 cursor-pointer">
                <Archive className="w-4 h-4" />
                Archive
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 cursor-pointer text-destructive">
                <Trash2 className="w-4 h-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <ChevronRight
            className={cn(
              "w-5 h-5 text-muted-foreground transition-all duration-200",
              isHovered && "translate-x-1 text-primary",
            )}
          />
        </div>

        {/* Typing indicator on hover */}
        {isHovered && (
          <div className="absolute bottom-3 left-16 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        )}
      </div>
    </Link>
  )
}
