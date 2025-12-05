"use client"

import { useState } from "react"
import { ItineraryGrid } from "@/components/dashboard/itinerary-grid"
import { ChatSection } from "@/components/dashboard/chat-section"
import { CollectionsGrid } from "@/components/dashboard/collections-grid"
import { TravelTimeline } from "@/components/dashboard/travel-timeline"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { EmptyState } from "@/components/dashboard/empty-state"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/hooks/use-auth"

// Mock data - in production this would come from API/database
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
  },
]

const mockChats = [
  {
    id: "1",
    title: "Planning Paris Trip",
    lastMessage: "I found 3 great hotel options near the Eiffel Tower...",
    timestamp: "10 min ago",
    linkedItinerary: "Paris Spring Adventure",
    category: "planning" as const,
  },
  {
    id: "2",
    title: "Tokyo Restaurant Recommendations",
    lastMessage: "Here are my top picks for authentic ramen in Shibuya...",
    timestamp: "2 hours ago",
    linkedItinerary: "Tokyo Cherry Blossom",
    category: "trip-draft" as const,
  },
  {
    id: "3",
    title: "General Travel Tips",
    lastMessage: "The best time to visit Southeast Asia is typically...",
    timestamp: "Yesterday",
    linkedItinerary: null,
    category: "general" as const,
  },
]

const mockCollections = [
  { id: "1", name: "Europe 2025", itemCount: 3, color: "#6b7dc4" },
  { id: "2", name: "Asia Adventures", itemCount: 2, color: "#db5844" },
  { id: "3", name: "Beach Getaways", itemCount: 1, color: "#4ade80" },
]

const mockHistory = [
  {
    id: "1",
    title: "New York City Weekend",
    date: "Dec 2024",
    image: "/nyc-skyline.png",
    year: 2024,
  },
  {
    id: "2",
    title: "London & Edinburgh",
    date: "Aug 2024",
    image: "/london-big-ben.png",
    year: 2024,
  },
  {
    id: "3",
    title: "Barcelona Beach Trip",
    date: "Jun 2024",
    image: "/barcelona-beach.png",
    year: 2024,
  },
  {
    id: "4",
    title: "Swiss Alps Skiing",
    date: "Feb 2023",
    image: "/swiss-alps-snow-mountains.jpg",
    year: 2023,
  },
]

const mockActivity = [
  { id: "1", action: "Created new itinerary", item: "Bali Wellness Retreat", time: "1 week ago" },
  { id: "2", action: "Booked flights for", item: "Paris Spring Adventure", time: "2 days ago" },
  { id: "3", action: "Updated", item: "Tokyo Cherry Blossom", time: "Yesterday" },
  { id: "4", action: "Started chat about", item: "Italian Summer Escape", time: "3 days ago" },
]

export default function DashboardPage() {
  const [isNewUser] = useState(false) // Toggle this to see empty state
  const [activeTab, setActiveTab] = useState("all")
  const { user } = useAuth()

  // Get first name for greeting
  const firstName = user?.full_name?.split(' ')[0] || 'Traveler'

  if (isNewUser) {
    return <EmptyState />
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Welcome back, {firstName}</h1>
          <p className="text-muted-foreground mt-1">Your next adventure awaits. Let&apos;s plan something amazing.</p>
        </div>
        <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/10 border border-accent/20">
          <span className="text-accent font-medium text-sm">Cherry Blossom Season Alert</span>
          <span className="text-xs text-muted-foreground">Book Tokyo now!</span>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-card/50 border border-border p-1">
          <TabsTrigger
            value="all"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            All
          </TabsTrigger>
          <TabsTrigger
            value="itineraries"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Itineraries
          </TabsTrigger>
          <TabsTrigger
            value="chats"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Chats
          </TabsTrigger>
          <TabsTrigger
            value="collections"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Collections
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6 space-y-10">
          {/* Itineraries Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-serif font-semibold text-foreground">Your Itineraries</h2>
              <button className="text-sm text-primary hover:text-primary/80 transition-colors">View all</button>
            </div>
            <ItineraryGrid itineraries={mockItineraries} />
          </section>

          {/* Two Column Layout for Chats and Collections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Chats */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-serif font-semibold text-foreground">Recent Chats</h2>
                <button className="text-sm text-primary hover:text-primary/80 transition-colors">View all</button>
              </div>
              <ChatSection chats={mockChats} />
            </section>

            {/* Collections */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-serif font-semibold text-foreground">Collections</h2>
                <button className="text-sm text-primary hover:text-primary/80 transition-colors">Manage</button>
              </div>
              <CollectionsGrid collections={mockCollections} />
            </section>
          </div>

          {/* Travel History Timeline */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-serif font-semibold text-foreground">Travel History</h2>
              <button className="text-sm text-primary hover:text-primary/80 transition-colors">
                See full timeline
              </button>
            </div>
            <TravelTimeline history={mockHistory} />
          </section>

          {/* Recent Activity */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-serif font-semibold text-foreground">Recent Activity</h2>
            </div>
            <RecentActivity activities={mockActivity} />
          </section>
        </TabsContent>

        <TabsContent value="itineraries" className="mt-6">
          <ItineraryGrid itineraries={mockItineraries} />
        </TabsContent>

        <TabsContent value="chats" className="mt-6">
          <ChatSection chats={mockChats} expanded />
        </TabsContent>

        <TabsContent value="collections" className="mt-6">
          <CollectionsGrid collections={mockCollections} expanded />
        </TabsContent>
      </Tabs>
    </div>
  )
}
