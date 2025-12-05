"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Home,
  Map,
  MessageSquare,
  Clock,
  FolderOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

const navItems = [
  { icon: Home, label: "Home", href: "/dashboard", active: true },
  { icon: Map, label: "Itineraries", href: "/dashboard/itineraries" },
  { icon: MessageSquare, label: "Chats", href: "/dashboard/chats" },
  { icon: Clock, label: "Travel History", href: "/dashboard/history" },
  { icon: FolderOpen, label: "Collections", href: "/dashboard/collections" },
  { icon: Settings, label: "Settings", href: "/dashboard/settings" },
]

export function DashboardSidebar({ collapsed, onToggle }: SidebarProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 z-50",
        collapsed ? "w-20" : "w-64",
      )}
    >
      {/* Logo */}
      <div className={cn("flex items-center gap-3 p-4 border-b border-sidebar-border", collapsed && "justify-center")}>
        <img
          src="/images/logo.svg"
          alt="Orbis AI"
          className="h-10 w-10 rounded-full object-cover ring-2 ring-primary/20"
        />
        {!collapsed && <span className="font-serif font-bold text-sidebar-foreground text-xl">Orbis AI</span>}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isHovered = hoveredItem === item.label
          const isActive = item.active

          return (
            <Link
              key={item.label}
              href={item.href}
              onMouseEnter={() => setHoveredItem(item.label)}
              onMouseLeave={() => setHoveredItem(null)}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative",
                collapsed && "justify-center",
                isActive
                  ? "bg-sidebar-primary/15 text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-primary/10 hover:text-sidebar-foreground",
              )}
            >
              {/* Art Brut active indicator - brushstroke style */}
              {isActive && (
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-sidebar-accent rounded-full"
                  style={{
                    clipPath: "polygon(0 0, 100% 10%, 100% 90%, 0 100%)",
                  }}
                />
              )}

              <Icon
                className={cn(
                  "transition-all duration-200",
                  collapsed ? "w-6 h-6" : "w-5 h-5",
                  isActive || isHovered ? "stroke-[2.5px]" : "stroke-[1.5px]",
                )}
              />

              {!collapsed && (
                <span className={cn("font-medium transition-all duration-200", isActive ? "text-sidebar-primary" : "")}>
                  {item.label}
                </span>
              )}

              {/* Tooltip for collapsed state */}
              {collapsed && isHovered && (
                <div className="absolute left-full ml-3 px-3 py-2 bg-popover text-popover-foreground text-sm font-medium rounded-lg shadow-lg border border-border whitespace-nowrap z-50">
                  {item.label}
                </div>
              )}
            </Link>
          )
        })}
      </nav>

      {/* AI Assistant Quick Access */}
      <div className={cn("p-3 border-t border-sidebar-border", collapsed && "flex justify-center")}>
        <button
          className={cn(
            "flex items-center gap-3 w-full px-3 py-3 rounded-xl bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30 hover:border-primary/50 transition-all duration-200 group",
            collapsed && "w-auto p-3",
          )}
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 text-primary" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full animate-pulse" />
          </div>
          {!collapsed && (
            <div className="text-left">
              <span className="text-sm font-medium text-sidebar-foreground block">Ask Orbis</span>
              <span className="text-xs text-muted-foreground">AI Assistant</span>
            </div>
          )}
        </button>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-card border border-border rounded-full flex items-center justify-center shadow-md hover:bg-muted transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
    </aside>
  )
}
