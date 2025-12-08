"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search, Bell, Plus, User, ChevronDown, LogOut, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth, type AuthUser } from "@/hooks/use-auth"
import { apiClient } from "@/lib/api-client"
import { toast } from "sonner"

interface DashboardHeaderProps {
  user: AuthUser | null
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchFocused, setSearchFocused] = useState(false)
  const [hasNotifications] = useState(true)
  const [isCreatingTrip, setIsCreatingTrip] = useState(false)
  const { logout } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  const handleNewTrip = async () => {
    setIsCreatingTrip(true)
    try {
      const conversation = await apiClient.createConversation('New Trip Planning')
      router.push(`/chat/${conversation.id}`)
    } catch (error) {
      console.error('[Header] Failed to create trip:', error)
      toast.error('Failed to create new trip')
    } finally {
      setIsCreatingTrip(false)
    }
  }

  // Get display name and email from user
  const displayName = user?.full_name || user?.email?.split('@')[0] || 'Traveler'
  const displayEmail = user?.email || ''

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        {/* Global Search */}
        <div className={cn("relative flex-1 max-w-xl transition-all duration-300", searchFocused && "max-w-2xl")}>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search itineraries, chats, destinations..."
            className={cn(
              "w-full pl-12 pr-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200",
              searchFocused && "shadow-lg shadow-primary/10",
            )}
          />
          {searchQuery && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
              <div className="p-3 text-sm text-muted-foreground">Searching for "{searchQuery}"...</div>
            </div>
          )}
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-3">
          {/* New Trip Button */}
          <button 
            onClick={handleNewTrip}
            disabled={isCreatingTrip}
            className="relative flex items-center gap-2 px-5 py-3 bg-accent text-accent-foreground rounded-xl font-semibold shadow-lg shadow-accent/25 hover:shadow-accent/40 hover:-translate-y-0.5 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            <Plus className={cn(
              "w-5 h-5 transition-transform duration-300",
              isCreatingTrip ? "animate-spin" : "group-hover:rotate-90"
            )} />
            <span>{isCreatingTrip ? 'Creating...' : 'New Trip'}</span>
            {/* Glowing effect */}
            <div className="absolute inset-0 rounded-xl bg-accent/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
          </button>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="relative p-3 bg-card border border-border rounded-xl hover:bg-muted transition-colors">
                <Bell className="w-5 h-5 text-foreground" />
                {hasNotifications && (
                  <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-accent rounded-full border-2 border-card" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="p-3 border-b border-border">
                <h3 className="font-semibold text-foreground">Notifications</h3>
              </div>
              <div className="max-h-80 overflow-auto">
                <DropdownMenuItem className="p-4 cursor-pointer">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                      <Bell className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">Flight prices dropped!</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Paris flights are 20% cheaper</p>
                      <p className="text-xs text-muted-foreground mt-1">2 hours ago</p>
                    </div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem className="p-4 cursor-pointer">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center">
                      <Bell className="w-5 h-5 text-accent" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">Cherry Blossom Alert</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Peak season starts in 2 weeks</p>
                      <p className="text-xs text-muted-foreground mt-1">Yesterday</p>
                    </div>
                  </div>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Profile Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 p-2 bg-card border border-border rounded-xl hover:bg-muted transition-colors">
                <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="p-3 border-b border-border">
                <p className="font-medium text-foreground">{displayName}</p>
                <p className="text-sm text-muted-foreground">{displayEmail}</p>
              </div>
              <DropdownMenuItem className="gap-2 cursor-pointer">
                <User className="w-4 h-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 cursor-pointer">
                <Settings className="w-4 h-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
