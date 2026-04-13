'use client'

import { useMemo, useState } from 'react'
import { PanelRightClose, PanelRightOpen, FileCode2, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface ChatArtifactItem {
  id: string
  label: string
  messageId: string
  createdAt: string
  data?: unknown
}

interface ChatSidePanelProps {
  isOpen: boolean
  onToggle: () => void
  artifacts: ChatArtifactItem[]
}

export function ChatSidePanel({ isOpen, onToggle, artifacts }: ChatSidePanelProps) {
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null)

  const selectedArtifact = useMemo(() => {
    if (!artifacts.length) return null
    if (!selectedArtifactId) return artifacts[artifacts.length - 1]
    return artifacts.find((artifact) => artifact.id === selectedArtifactId) ?? artifacts[artifacts.length - 1]
  }, [artifacts, selectedArtifactId])

  if (!isOpen) {
    return null
  }

  return (
    <aside className="hidden border-l border-border bg-background lg:flex lg:w-[320px] lg:flex-col shrink-0 transition-all duration-300" aria-label="Artifacts side panel">
      {/* Inner container */}
      <div className="w-full h-full flex flex-col">
        <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-background/80 backdrop-blur-xl shrink-0 h-[61px]">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Trip Workspace</h2>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-background p-4 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 ring-1 ring-primary/20">
            <Globe className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-[15px] font-medium text-foreground mb-1">Your Trip Plan</h3>
          <p className="text-[13px] text-muted-foreground max-w-[200px] mb-4">
            Flights, hotels, and daily itineraries will appear here as we plan.
          </p>
          <Button variant="outline" size="sm" className="w-full text-xs font-medium">
            Start a new plan
          </Button>
        </div>
      </div>
    </aside>
  )
}
