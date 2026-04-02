"use client"

import { useState } from "react"
import Link from "next/link"
import { 
  Plus, 
  Search, 
  Filter, 
  Grid3X3, 
  List, 
  Calendar, 
  MapPin, 
  MoreHorizontal, 
  Share2, 
  Download, 
  Pencil, 
  Trash2,
  ChevronRight,
  Plane,
  Hotel,
  Clock,
  Users
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Mock data - in production this would come from API
const mockItineraries = [
  {
    id: "1",
    title: "Paris Spring Adventure",
    coverImage: "/eiffel-tower-spring.png",
    dateRange: "Mar 15 - Mar 22, 2025",
    destinations: ["Paris", "Versailles"],
    status: "booked" as const,
    lastUpdated: "2 hours ago",
    collaborators: [{ name: "You", avatar: "/diverse-person-avatars.png" }],
    duration: "7 days",
    budget: "$3,500",
    flights: 2,
    hotels: 1,
  },
  {
    id: "2",
    title: "Tokyo Cherry Blossom",
    coverImage: "/tokyo-cherry-blossom-japan.jpg",
    dateRange: "Apr 1 - Apr 10, 2025",
    destinations: ["Tokyo", "Kyoto", "Osaka"],
    status: "in-progress" as const,
    lastUpdated: "Yesterday",
    collaborators: [
      { name: "You", avatar: "/diverse-person-avatars.png" },
      { name: "Alex", avatar: "/diverse-person-avatar-2.png" },
    ],
    duration: "9 days",
    budget: "$5,200",
    flights: 4,
    hotels: 3,
  },
  {
    id: "3",
    title: "Italian Summer Escape",
    coverImage: "/rome-colosseum-italy.png",
    dateRange: "Jun 5 - Jun 15, 2025",
    destinations: ["Rome", "Florence", "Venice"],
    status: "draft" as const,
    lastUpdated: "3 days ago",
    collaborators: [],
    duration: "10 days",
    budget: "$4,800",
    flights: 0,
    hotels: 0,
  },
  {
    id: "4",
    title: "Bali Wellness Retreat",
    coverImage: "/bali-beach-sunset-temple.jpg",
    dateRange: "Jul 20 - Jul 30, 2025",
    destinations: ["Ubud", "Seminyak"],
    status: "draft" as const,
    lastUpdated: "1 week ago",
    collaborators: [],
    duration: "10 days",
    budget: "$2,800",
    flights: 0,
    hotels: 0,
  },
  {
    id: "5",
    title: "Greek Islands Hopping",
    coverImage: "/santorini-greece.jpg",
    dateRange: "Aug 10 - Aug 20, 2025",
    destinations: ["Athens", "Santorini", "Mykonos"],
    status: "draft" as const,
    lastUpdated: "2 weeks ago",
    collaborators: [],
    duration: "10 days",
    budget: "$4,200",
    flights: 0,
    hotels: 0,
  },
]

const statusConfig = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  "in-progress": { label: "In Progress", className: "bg-primary/20 text-primary" },
  booked: { label: "Booked", className: "bg-green-500/20 text-green-400" },
}

type ViewMode = "grid" | "list"
type StatusFilter = "all" | "draft" | "in-progress" | "booked"

export default function ItinerariesPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")

  const filteredItineraries = mockItineraries.filter((itinerary) => {
    const matchesSearch = itinerary.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      itinerary.destinations.some(d => d.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesStatus = statusFilter === "all" || itinerary.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Itineraries</h1>
          <p className="text-muted-foreground mt-1">Manage and organize all your travel plans</p>
        </div>
        <Link href="/chat">
          <Button className="gap-2 bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4" />
            New Itinerary
          </Button>
        </Link>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search itineraries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card border-border"
          />
        </div>

        {/* Filters & View Toggle */}
        <div className="flex items-center gap-3">
          {/* Status Filter Tabs */}
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <TabsList className="bg-card/50 border border-border">
              <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              <TabsTrigger value="draft" className="text-xs">Drafts</TabsTrigger>
              <TabsTrigger value="in-progress" className="text-xs">In Progress</TabsTrigger>
              <TabsTrigger value="booked" className="text-xs">Booked</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* View Mode Toggle */}
          <div className="flex items-center border border-border rounded-lg bg-card/50 p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-2 rounded-md transition-colors",
                viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-2 rounded-md transition-colors",
                viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard 
          label="Total Itineraries" 
          value={mockItineraries.length} 
          icon={<MapPin className="w-4 h-4" />}
        />
        <StatCard 
          label="Upcoming Trips" 
          value={mockItineraries.filter(i => i.status === "booked").length} 
          icon={<Calendar className="w-4 h-4" />}
        />
        <StatCard 
          label="In Progress" 
          value={mockItineraries.filter(i => i.status === "in-progress").length} 
          icon={<Clock className="w-4 h-4" />}
        />
        <StatCard 
          label="Drafts" 
          value={mockItineraries.filter(i => i.status === "draft").length} 
          icon={<Pencil className="w-4 h-4" />}
        />
      </div>

      {/* Itineraries Display */}
      {filteredItineraries.length === 0 ? (
        <EmptyState searchQuery={searchQuery} />
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredItineraries.map((itinerary, index) => (
            <ItineraryGridCard key={itinerary.id} itinerary={itinerary} index={index} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItineraries.map((itinerary, index) => (
            <ItineraryListCard key={itinerary.id} itinerary={itinerary} index={index} />
          ))}
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
        <MapPin className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {searchQuery ? "No itineraries found" : "No itineraries yet"}
      </h3>
      <p className="text-muted-foreground mb-6 max-w-md">
        {searchQuery 
          ? `We couldn't find any itineraries matching "${searchQuery}". Try a different search term.`
          : "Start planning your next adventure by creating a new itinerary with our AI assistant."
        }
      </p>
      {!searchQuery && (
        <Link href="/chat">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Create Your First Itinerary
          </Button>
        </Link>
      )}
    </div>
  )
}

interface Itinerary {
  id: string
  title: string
  coverImage: string
  dateRange: string
  destinations: string[]
  status: "draft" | "in-progress" | "booked"
  lastUpdated: string
  collaborators: { name: string; avatar: string }[]
  duration: string
  budget: string
  flights: number
  hotels: number
}

function ItineraryGridCard({ itinerary, index }: { itinerary: Itinerary; index: number }) {
  const [isHovered, setIsHovered] = useState(false)
  const status = statusConfig[itinerary.status]

  return (
    <Link href={`/dashboard/itineraries/${itinerary.id}`}>
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="group relative bg-card border border-border rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 hover:border-primary/30 cursor-pointer"
        style={{ animationDelay: `${index * 100}ms` }}
      >
        {/* Cover Image */}
        <div className="relative h-40 overflow-hidden">
          <img
            src={itinerary.coverImage || "/placeholder.svg"}
            alt={itinerary.title}
            className={cn("w-full h-full object-cover transition-transform duration-500", isHovered && "scale-110")}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />

          <Badge className={cn("absolute top-3 left-3", status.className)}>{status.label}</Badge>

          <div
            className={cn(
              "absolute top-3 right-3 flex items-center gap-1 transition-all duration-200",
              isHovered ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2",
            )}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                <button className="p-2 bg-background/80 backdrop-blur-sm rounded-lg hover:bg-background transition-colors">
                  <MoreHorizontal className="w-4 h-4 text-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
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
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 cursor-pointer text-destructive">
                  <Trash2 className="w-4 h-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-semibold text-foreground mb-1 line-clamp-1 group-hover:text-primary transition-colors">
            {itinerary.title}
          </h3>

          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Calendar className="w-3.5 h-3.5" />
            <span>{itinerary.dateRange}</span>
          </div>

          <div className="flex items-center gap-1 flex-wrap mb-3">
            {itinerary.destinations.map((dest, i) => (
              <span key={i} className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                {dest}
              </span>
            ))}
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{itinerary.duration}</span>
            <span className="font-medium text-foreground">{itinerary.budget}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

function ItineraryListCard({ itinerary, index }: { itinerary: Itinerary; index: number }) {
  const [isHovered, setIsHovered] = useState(false)
  const status = statusConfig[itinerary.status]

  return (
    <Link href={`/dashboard/itineraries/${itinerary.id}`}>
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="group flex items-center gap-4 p-4 bg-card border border-border rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30 cursor-pointer"
        style={{ animationDelay: `${index * 50}ms` }}
      >
        {/* Thumbnail */}
        <div className="relative w-24 h-16 rounded-lg overflow-hidden flex-shrink-0">
          <img
            src={itinerary.coverImage || "/placeholder.svg"}
            alt={itinerary.title}
            className={cn("w-full h-full object-cover transition-transform duration-300", isHovered && "scale-110")}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              {itinerary.title}
            </h3>
            <Badge className={cn("text-xs flex-shrink-0", status.className)}>{status.label}</Badge>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {itinerary.dateRange}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {itinerary.destinations.join(", ")}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Plane className="w-4 h-4" />
            <span>{itinerary.flights}</span>
          </div>
          <div className="flex items-center gap-1">
            <Hotel className="w-4 h-4" />
            <span>{itinerary.hotels}</span>
          </div>
          <span className="font-medium text-foreground">{itinerary.budget}</span>
        </div>

        {/* Arrow */}
        <ChevronRight
          className={cn(
            "w-5 h-5 text-muted-foreground transition-all duration-200 flex-shrink-0",
            isHovered && "translate-x-1 text-primary",
          )}
        />
      </div>
    </Link>
  )
}
