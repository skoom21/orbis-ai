'use client'

import { Sparkles, Map, Hotel, Wallet, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConversationStarter {
  icon: React.ComponentType<{ className?: string }>
  title: string
  prompt: string
}

const starters: ConversationStarter[] = [
  {
    icon: Map,
    title: 'Plan a Trip',
    prompt: 'Plan a 7-day trip to Paris with a mid-range budget.',
  },
  {
    icon: Hotel,
    title: 'Find Hotels',
    prompt: 'Find boutique hotels in Tokyo near Shibuya under $200/night.',
  },
  {
    icon: Calendar,
    title: 'Build Itinerary',
    prompt: 'Create a 5-day itinerary for Rome with food and culture focus.',
  },
  {
    icon: Wallet,
    title: 'Budget Planner',
    prompt: 'Help me budget a 10-day Southeast Asia trip for two people.',
  },
]

interface ConversationStartersProps {
  onSelect: (prompt: string) => void
}

export function ConversationStarters({ onSelect }: ConversationStartersProps) {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Sparkles className="h-4 w-4 text-primary" />
        Try one of these to get started
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {starters.map((starter) => (
          <button
            key={starter.title}
            onClick={() => onSelect(starter.prompt)}
            className={cn(
              'flex items-start gap-3 rounded-xl border border-border bg-card/50 p-4 text-left transition-all',
              'hover:border-primary/40 hover:bg-muted/60'
            )}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <starter.icon className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">{starter.title}</div>
              <div className="text-xs text-muted-foreground mt-1">{starter.prompt}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
