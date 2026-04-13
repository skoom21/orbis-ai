'use client'

import type { ReactNode } from 'react'
import { Globe, Ghost } from 'lucide-react'
import { ConversationStarters } from './conversation-starters'

interface ChatLandingProps {
  displayName: string
  onSelectStarter: (prompt: string) => void
  form: ReactNode
  showStarters?: boolean
  centerComposer?: boolean
  isIncognito?: boolean
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
  isIncognito = false,
}: ChatLandingProps) {
  return (
    <div className="relative w-full mx-auto flex flex-col items-center justify-start px-4 pb-20 lg:pb-12 overflow-visible">
      {/* Subtle map/travel or incognito inspired background */}
      <div className={`absolute inset-0 z-0 opacity-10 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] ${isIncognito ? 'from-muted-foreground via-background to-background' : 'from-primary/30 via-background to-background'} pointer-events-none`} />
      
      <div className="mb-7 text-center z-10">
        <div className={`mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full shadow-sm ${isIncognito ? 'bg-muted/50 text-muted-foreground ring-1 ring-muted' : 'bg-primary/10 text-primary ring-1 ring-primary/20'}`}>
          {isIncognito ? <Ghost className="h-7 w-7" /> : <Globe className="h-7 w-7" />}
        </div>
        <h2 className="text-3xl font-serif font-semibold text-foreground sm:text-4xl tracking-tight">
          {isIncognito ? 'Incognito Mode' : `${getGreeting()}, ${displayName}`}
        </h2>
        <p className="mt-3 text-base text-muted-foreground font-medium">
          {isIncognito ? 'Your chat will not be saved to your history.' : 'Your AI-powered travel companion'}
        </p>
      </div>

      <div className={`z-10 ${centerComposer ? 'w-full max-w-3xl' : 'w-full max-w-4xl'}`}>{form}</div>

      {showStarters && (
        <div className="mt-8 w-full z-10">
          <ConversationStarters onSelect={onSelectStarter} />
        </div>
      )}
    </div>
  )
}
