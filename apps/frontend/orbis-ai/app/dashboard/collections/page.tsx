"use client"

import { useState } from "react"
import Link from "next/link"
import { 
  Plus, 
  FolderOpen, 
  MoreHorizontal,
  Pencil,
  Trash2,
  Share2,
  ChevronRight,
  MapPin,
  Calendar,
  Folder,
  FolderPlus,
  Grid3X3,
  List,
  Lock,
  Users,
  Globe
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

// Mock data for collections
const mockCollections = [
  {
    id: "1",
    name: "Europe 2025",
    description: "All my European adventures planned for next year",
    color: "#6b7dc4",
    icon: "🇪🇺",
    itemCount: 3,
    visibility: "private" as const,
    createdAt: "2 weeks ago",
    trips: [
      { id: "1", title: "Paris Spring Adventure", coverImage: "/eiffel-tower-spring.png" },
      { id: "3", title: "Italian Summer Escape", coverImage: "/rome-colosseum-italy.png" },
      { id: "5", title: "Greek Islands Hopping", coverImage: "/santorini-greece.jpg" },
    ],
  },
  {
    id: "2",
    name: "Asia Adventures",
    description: "Exploring the wonders of Asia",
    color: "#db5844",
    icon: "🌏",
    itemCount: 2,
    visibility: "shared" as const,
    createdAt: "1 month ago",
    trips: [
      { id: "2", title: "Tokyo Cherry Blossom", coverImage: "/tokyo-cherry-blossom-japan.jpg" },
      { id: "4", title: "Bali Wellness Retreat", coverImage: "/bali-beach-sunset-temple.jpg" },
    ],
  },
  {
    id: "3",
    name: "Beach Getaways",
    description: "Sun, sand, and relaxation",
    color: "#4ade80",
    icon: "🏖️",
    itemCount: 2,
    visibility: "private" as const,
    createdAt: "3 weeks ago",
    trips: [
      { id: "4", title: "Bali Wellness Retreat", coverImage: "/bali-beach-sunset-temple.jpg" },
      { id: "5", title: "Greek Islands Hopping", coverImage: "/santorini-greece.jpg" },
    ],
  },
  {
    id: "4",
    name: "Bucket List",
    description: "Dream destinations I want to visit someday",
    color: "#f59e0b",
    icon: "⭐",
    itemCount: 5,
    visibility: "public" as const,
    createdAt: "2 months ago",
    trips: [
      { id: "1", title: "Paris Spring Adventure", coverImage: "/eiffel-tower-spring.png" },
      { id: "2", title: "Tokyo Cherry Blossom", coverImage: "/tokyo-cherry-blossom-japan.jpg" },
    ],
  },
  {
    id: "5",
    name: "Solo Travel",
    description: "Adventures for one",
    color: "#8b5cf6",
    icon: "🎒",
    itemCount: 1,
    visibility: "private" as const,
    createdAt: "1 week ago",
    trips: [
      { id: "4", title: "Bali Wellness Retreat", coverImage: "/bali-beach-sunset-temple.jpg" },
    ],
  },
]

const visibilityConfig = {
  private: { label: "Private", icon: Lock, className: "text-muted-foreground" },
  shared: { label: "Shared", icon: Users, className: "text-blue-400" },
  public: { label: "Public", icon: Globe, className: "text-green-400" },
}

type ViewMode = "grid" | "list"

export default function CollectionsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState("")

  const filteredCollections = mockCollections.filter((collection) =>
    collection.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    collection.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Collections</h1>
          <p className="text-muted-foreground mt-1">Organize your trips into themed folders</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-primary hover:bg-primary/90">
              <FolderPlus className="w-4 h-4" />
              New Collection
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Collection</DialogTitle>
              <DialogDescription>
                Organize your trips by creating a new collection.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Collection Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Summer 2025"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  placeholder="What's this collection about?"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsCreateDialogOpen(false)}>
                Create Collection
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search & View Toggle */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search collections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card border-border"
          />
        </div>

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

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard 
          label="Total Collections" 
          value={mockCollections.length} 
          icon={<Folder className="w-4 h-4" />}
        />
        <StatCard 
          label="Total Trips" 
          value={mockCollections.reduce((sum, c) => sum + c.itemCount, 0)} 
          icon={<MapPin className="w-4 h-4" />}
        />
        <StatCard 
          label="Shared" 
          value={mockCollections.filter(c => c.visibility === "shared").length} 
          icon={<Users className="w-4 h-4" />}
        />
        <StatCard 
          label="Public" 
          value={mockCollections.filter(c => c.visibility === "public").length} 
          icon={<Globe className="w-4 h-4" />}
        />
      </div>

      {/* Collections Display */}
      {filteredCollections.length === 0 ? (
        <EmptyState searchQuery={searchQuery} onCreateClick={() => setIsCreateDialogOpen(true)} />
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCollections.map((collection, index) => (
            <CollectionGridCard key={collection.id} collection={collection} index={index} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCollections.map((collection, index) => (
            <CollectionListCard key={collection.id} collection={collection} index={index} />
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

function EmptyState({ searchQuery, onCreateClick }: { searchQuery: string; onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <FolderOpen className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {searchQuery ? "No collections found" : "No collections yet"}
      </h3>
      <p className="text-muted-foreground mb-6 max-w-md">
        {searchQuery 
          ? `We couldn't find any collections matching "${searchQuery}". Try a different search term.`
          : "Create your first collection to organize your trips by theme, destination, or season."
        }
      </p>
      {!searchQuery && (
        <Button className="gap-2" onClick={onCreateClick}>
          <FolderPlus className="w-4 h-4" />
          Create Your First Collection
        </Button>
      )}
    </div>
  )
}

interface Collection {
  id: string
  name: string
  description: string
  color: string
  icon: string
  itemCount: number
  visibility: "private" | "shared" | "public"
  createdAt: string
  trips: { id: string; title: string; coverImage: string }[]
}

function CollectionGridCard({ collection, index }: { collection: Collection; index: number }) {
  const [isHovered, setIsHovered] = useState(false)
  const visibility = visibilityConfig[collection.visibility]
  const VisibilityIcon = visibility.icon

  return (
    <Link href={`/dashboard/collections/${collection.id}`}>
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="group bg-card border border-border rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 hover:border-primary/30 cursor-pointer"
        style={{ animationDelay: `${index * 100}ms` }}
      >
        {/* Trip Thumbnails Preview */}
        <div className="relative h-32 overflow-hidden">
          {collection.trips.length > 0 ? (
            <div className="flex h-full">
              {collection.trips.slice(0, 3).map((trip, i) => (
                <div 
                  key={trip.id} 
                  className="flex-1 relative"
                  style={{ marginLeft: i > 0 ? "-8px" : 0, zIndex: 3 - i }}
                >
                  <img
                    src={trip.coverImage || "/placeholder.svg"}
                    alt={trip.title}
                    className={cn(
                      "w-full h-full object-cover transition-transform duration-500",
                      isHovered && "scale-105"
                    )}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <FolderOpen className="w-12 h-12 text-muted-foreground/50" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />

          {/* Color indicator strip */}
          <div 
            className="absolute top-0 left-0 right-0 h-1"
            style={{ backgroundColor: collection.color }}
          />

          {/* Menu */}
          <div
            className={cn(
              "absolute top-3 right-3 transition-all duration-200",
              isHovered ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
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
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{collection.icon}</span>
            <h3 className="font-semibold text-foreground text-lg group-hover:text-primary transition-colors truncate">
              {collection.name}
            </h3>
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {collection.description}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-3.5 h-3.5" />
              <span>{collection.itemCount} trip{collection.itemCount !== 1 ? "s" : ""}</span>
            </div>
            <div className={cn("flex items-center gap-1 text-xs", visibility.className)}>
              <VisibilityIcon className="w-3 h-3" />
              <span>{visibility.label}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

function CollectionListCard({ collection, index }: { collection: Collection; index: number }) {
  const [isHovered, setIsHovered] = useState(false)
  const visibility = visibilityConfig[collection.visibility]
  const VisibilityIcon = visibility.icon

  return (
    <Link href={`/dashboard/collections/${collection.id}`}>
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="group flex items-center gap-4 p-4 bg-card border border-border rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30 cursor-pointer"
        style={{ animationDelay: `${index * 50}ms` }}
      >
        {/* Icon */}
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl"
          style={{ backgroundColor: `${collection.color}20` }}
        >
          {collection.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              {collection.name}
            </h3>
            <div className={cn("flex items-center gap-1 text-xs", visibility.className)}>
              <VisibilityIcon className="w-3 h-3" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-1">{collection.description}</p>
        </div>

        {/* Stats */}
        <div className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            {collection.itemCount}
          </span>
          <span>{collection.createdAt}</span>
        </div>

        {/* Trip Thumbnails */}
        <div className="hidden md:flex items-center -space-x-2">
          {collection.trips.slice(0, 3).map((trip) => (
            <div
              key={trip.id}
              className="w-8 h-8 rounded-lg overflow-hidden border-2 border-card"
            >
              <img
                src={trip.coverImage || "/placeholder.svg"}
                alt={trip.title}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
          {collection.itemCount > 3 && (
            <div className="w-8 h-8 rounded-lg bg-muted border-2 border-card flex items-center justify-center text-xs text-muted-foreground">
              +{collection.itemCount - 3}
            </div>
          )}
        </div>

        {/* Arrow */}
        <ChevronRight
          className={cn(
            "w-5 h-5 text-muted-foreground transition-all duration-200",
            isHovered && "translate-x-1 text-primary"
          )}
        />
      </div>
    </Link>
  )
}
