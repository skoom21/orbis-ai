"use client"

import { Activity } from "lucide-react"

interface ActivityItem {
  id: string
  action: string
  item: string
  time: string
}

interface RecentActivityProps {
  activities: ActivityItem[]
}

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="space-y-3">
        {activities.map((activity, index) => (
          <div
            key={activity.id}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <Activity className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">
                <span className="text-muted-foreground">{activity.action}</span>{" "}
                <span className="font-medium text-primary">{activity.item}</span>
              </p>
            </div>
            <span className="text-xs text-muted-foreground flex-shrink-0">{activity.time}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
