'use client'

import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ActionChipsProps {
  chips: string[]
  onSelect: (chip: string) => void
  className?: string
}

export function ActionChips({ chips, onSelect, className }: ActionChipsProps) {
  if (chips.length === 0) return null

  return (
    <div className={cn('flex flex-wrap gap-2 mt-3 mb-1', className)} role="group" aria-label="Suggested follow-ups">
      {chips.map((chip) => (
        <button
          key={chip}
          type="button"
          onClick={() => onSelect(chip)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80',
            'px-3.5 py-1.5 text-[13px] font-medium text-foreground/80',
            'backdrop-blur-sm shadow-sm transition-all duration-200',
            'hover:border-primary/40 hover:bg-primary/5 hover:text-primary hover:shadow-md hover:shadow-primary/5',
            'active:scale-95',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          )}
        >
          <Sparkles className="h-3 w-3 text-primary/60 shrink-0" />
          {chip}
        </button>
      ))}
    </div>
  )
}
