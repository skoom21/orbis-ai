'use client'

import type { ReactNode } from 'react'
import { Sparkles } from 'lucide-react'
import { ConversationStarters } from './conversation-starters'

interface ChatLandingProps {
  displayName: string
  onSelectStarter: (prompt: string) => void
  form: ReactNode
  showStarters?: boolean
  centerComposer?: boolean
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function ChatLanding({
  displayName,
  onSelectStarter,
  form,
  showStarters = true,
  centerComposer = true,
}: ChatLandingProps) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col items-center px-4 pb-6 pt-10 sm:pt-14">
      <div className="mb-7 text-center">
        <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="h-5 w-5" />
        </div>
        <h2 className="text-2xl font-serif font-semibold text-foreground sm:text-3xl">
          {getGreeting()}, {displayName}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Plan your next adventure with Orbis AI.
        </p>
      </div>

      <div className={centerComposer ? 'w-full max-w-3xl' : 'w-full max-w-4xl'}>{form}</div>

      {showStarters && (
        <div className="mt-8 w-full">
          <ConversationStarters onSelect={onSelectStarter} />
        </div>
      )}
    </div>
  )
}
