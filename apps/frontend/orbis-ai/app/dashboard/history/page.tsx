"use client"

import { useState } from "react"
import Link from "next/link"
import { 
  Calendar,
  MapPin,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Download,
  Share2,
  Plane,
  Hotel,
  Camera,
  Star,
  Globe,
  TrendingUp
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

// Mock data for travel history
const mockHistory = [
  {
    id: "1",
    title: "New York City Weekend",
    coverImage: "/nyc-skyline.png",
    dateRange: "Dec 15 - Dec 18, 2024",
    destinations: ["New York City"],
    year: 2024,
    duration: "4 days",
    highlights: ["Broadway Show", "Central Park", "Times Square"],
    photos: 127,
    rating: 5,
    totalSpent: "$2,400",
    companions: ["Solo"],
  },
  {
    id: "2",
    title: "London & Edinburgh",
    coverImage: "/london-big-ben.png",
    dateRange: "Aug 5 - Aug 15, 2024",
    destinations: ["London", "Edinburgh"],
    year: 2024,
    duration: "10 days",
    highlights: ["Big Ben", "Edinburgh Castle", "Harry Potter Studio Tour"],
    photos: 342,
    rating: 5,
    totalSpent: "$4,800",
    companions: ["Partner"],
  },
  {
    id: "3",
    title: "Barcelona Beach Trip",
    coverImage: "/barcelona-beach.png",
    dateRange: "Jun 20 - Jun 27, 2024",
    destinations: ["Barcelona"],
    year: 2024,
    duration: "7 days",
    highlights: ["La Sagrada Familia", "Gothic Quarter", "Beach Days"],
    photos: 215,
    rating: 4,
    totalSpent: "$3,200",
    companions: ["Friends (3)"],
  },
  {
    id: "4",
    title: "Swiss Alps Skiing",
    coverImage: "/swiss-alps-snow-mountains.jpg",
    dateRange: "Feb 10 - Feb 18, 2023",
    destinations: ["Zermatt", "Interlaken"],
    year: 2023,
    duration: "8 days",
    highlights: ["Matterhorn", "Skiing", "Fondue Dinners"],
    photos: 189,
    rating: 5,
    totalSpent: "$5,500",
    companions: ["Family (4)"],
  },
  {
    id: "5",
    title: "Thailand Adventure",
    coverImage: "/thailand-temple.jpg",
    dateRange: "Nov 1 - Nov 14, 2023",
    destinations: ["Bangkok", "Chiang Mai", "Phuket"],
    year: 2023,
    duration: "14 days",
    highlights: ["Grand Palace", "Elephant Sanctuary", "Island Hopping"],
    photos: 456,
    rating: 5,
    totalSpent: "$3,800",
    companions: ["Partner"],
  },
  {
    id: "6",
    title: "Iceland Northern Lights",
    coverImage: "/iceland-northern-lights.jpg",
    dateRange: "Mar 5 - Mar 12, 2023",
    destinations: ["Reykjavik", "Golden Circle"],
    year: 2023,
    duration: "7 days",
    highlights: ["Northern Lights", "Blue Lagoon", "Glacier Hiking"],
    photos: 278,
    rating: 5,
    totalSpent: "$4,200",
    companions: ["Solo"],
  },
  {
    id: "7",
    title: "Morocco Desert Tour",
    coverImage: "/morocco-desert.jpg",
    dateRange: "Oct 10 - Oct 20, 2022",
    destinations: ["Marrakech", "Sahara Desert", "Fes"],
    year: 2022,
    duration: "10 days",
    highlights: ["Sahara Camping", "Medina Exploration", "Camel Ride"],
    photos: 312,
    rating: 4,
    totalSpent: "$2,900",
    companions: ["Friends (2)"],
  },
]

// Group by year
const groupByYear = (trips: typeof mockHistory) => {
  return trips.reduce((acc, trip) => {
    if (!acc[trip.year]) acc[trip.year] = []
    acc[trip.year].push(trip)
    return acc
  }, {} as Record<number, typeof mockHistory>)
}

export default function HistoryPage() {
  const groupedTrips = groupByYear(mockHistory)
  const years = Object.keys(groupedTrips).sort((a, b) => Number(b) - Number(a))

  // Calculate stats
  const totalTrips = mockHistory.length
  const totalCountries = new Set(mockHistory.flatMap(t => t.destinations)).size
  const totalPhotos = mockHistory.reduce((sum, t) => sum + t.photos, 0)
  const totalDays = mockHistory.reduce((sum, t) => sum + parseInt(t.duration), 0)

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Travel History</h1>
          <p className="text-muted-foreground mt-1">Relive your past adventures and memories</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export All
          </Button>
          <Button variant="outline" className="gap-2">
            <Share2 className="w-4 h-4" />
            Share
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard 
          label="Total Trips" 
          value={totalTrips} 
          icon={<Plane className="w-4 h-4" />}
        />
        <StatCard 
          label="Destinations" 
          value={totalCountries} 
          icon={<Globe className="w-4 h-4" />}
        />
        <StatCard 
          label="Photos Taken" 
          value={totalPhotos.toLocaleString()} 
          icon={<Camera className="w-4 h-4" />}
        />
        <StatCard 
          label="Days Traveled" 
          value={totalDays} 
          icon={<Calendar className="w-4 h-4" />}
        />
      </div>

      {/* World Map Placeholder */}
      <div className="bg-card border border-border rounded-2xl p-6 overflow-hidden relative">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            Places You&apos;ve Visited
          </h2>
          <Badge className="bg-primary/20 text-primary">{totalCountries} destinations</Badge>
        </div>
        <div className="h-48 bg-muted/30 rounded-xl flex items-center justify-center border border-dashed border-border">
          <div className="text-center">
            <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Interactive world map coming soon</p>
            <p className="text-xs text-muted-foreground mt-1">See all your visited destinations visualized</p>
          </div>
        </div>
      </div>

      {/* Timeline by Year */}
      <div className="space-y-8">
        {years.map((year) => (
          <YearSection key={year} year={year} trips={groupedTrips[Number(year)]} />
        ))}
      </div>
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
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

interface Trip {
  id: string
  title: string
  coverImage: string
  dateRange: string
  destinations: string[]
  year: number
  duration: string
  highlights: string[]
  photos: number
  rating: number
  totalSpent: string
  companions: string[]
}

function YearSection({ year, trips }: { year: string; trips: Trip[] }) {
  const [isExpanded, setIsExpanded] = useState(true)
  const totalSpent = trips.reduce((sum, t) => sum + parseFloat(t.totalSpent.replace(/[^0-9.-]+/g, "")), 0)

  return (
    <section className="relative">
      {/* Year Header */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)} 
        className="flex items-center gap-4 mb-4 group cursor-pointer w-full"
      >
        <div className="flex items-center gap-3">
          <span className="text-3xl font-serif font-bold text-foreground group-hover:text-primary transition-colors">
            {year}
          </span>
          <Badge variant="outline" className="text-xs">
            {trips.length} trip{trips.length > 1 ? "s" : ""}
          </Badge>
          <span className="text-sm text-muted-foreground">
            ${totalSpent.toLocaleString()} spent
          </span>
        </div>
        <div className="flex-1 h-px bg-border" />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {isExpanded ? (
            <>
              <span>Collapse</span>
              <ChevronUp className="w-4 h-4" />
            </>
          ) : (
            <>
              <span>Expand</span>
              <ChevronDown className="w-4 h-4" />
            </>
          )}
        </div>
      </button>

      {/* Trip Cards */}
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {trips.map((trip, index) => (
            <TripCard key={trip.id} trip={trip} index={index} />
          ))}
        </div>
      )}
    </section>
  )
}

function TripCard({ trip, index }: { trip: Trip; index: number }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <Link href={`/dashboard/history/${trip.id}`}>
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="group bg-card border border-border rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 hover:border-primary/30 cursor-pointer"
        style={{ animationDelay: `${index * 100}ms` }}
      >
        {/* Cover Image - with grayscale effect for past trips */}
        <div className="relative h-44 overflow-hidden">
          <img
            src={trip.coverImage || "/placeholder.svg"}
            alt={trip.title}
            className={cn(
              "w-full h-full object-cover transition-all duration-500 grayscale-[50%]",
              isHovered && "scale-110 grayscale-0"
            )}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />

          {/* Rating */}
          <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 bg-background/80 backdrop-blur-sm rounded-lg">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={cn(
                  "w-3 h-3",
                  i < trip.rating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"
                )}
              />
            ))}
          </div>

          {/* Photos count */}
          <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-background/80 backdrop-blur-sm rounded-lg text-xs text-foreground">
            <Camera className="w-3 h-3" />
            {trip.photos}
          </div>

          {/* Quick view on hover */}
          <div
            className={cn(
              "absolute bottom-3 right-3 transition-all duration-200",
              isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
            )}
          >
            <button className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-semibold text-foreground text-lg mb-1 group-hover:text-primary transition-colors">
            {trip.title}
          </h3>

          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Calendar className="w-3.5 h-3.5" />
            <span>{trip.dateRange}</span>
            <span>•</span>
            <span>{trip.duration}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <MapPin className="w-3.5 h-3.5" />
            <span>{trip.destinations.join(" → ")}</span>
          </div>

          {/* Highlights */}
          <div className="flex flex-wrap gap-1 mb-3">
            {trip.highlights.slice(0, 3).map((highlight, i) => (
              <span key={i} className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                {highlight}
              </span>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <span className="text-xs text-muted-foreground">{trip.companions.join(", ")}</span>
            <span className="font-medium text-foreground">{trip.totalSpent}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
