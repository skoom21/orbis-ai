'use client'

import { useMemo, useState } from 'react'
import { PanelRightClose, PanelRightOpen, FileCode2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
    return (
      <aside className="hidden border-l border-border bg-background/70 lg:flex lg:w-12 lg:flex-col lg:items-center lg:py-3" aria-label="Artifacts side panel collapsed">
        <Button variant="ghost" size="icon" onClick={onToggle} aria-label="Open side panel" aria-expanded={false}>
          <PanelRightOpen className="h-4 w-4" />
        </Button>
      </aside>
    )
  }

  return (
    <aside className="hidden w-80 flex-col border-l border-border bg-background/70 lg:flex" aria-label="Artifacts side panel">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Artifacts</h2>
          <p className="text-xs text-muted-foreground">Panel mount for generated outputs</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onToggle} aria-label="Close side panel" aria-expanded={true}>
          <PanelRightClose className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-[auto,1fr]">
        <div className="max-h-40 overflow-y-auto border-b border-border p-2" role="listbox" aria-label="Artifact list">
          {artifacts.length === 0 ? (
            <p className="text-xs text-muted-foreground" role="status" aria-live="polite">No artifacts yet.</p>
          ) : (
            <div className="space-y-1">
              {artifacts.map((artifact) => {
                const selected = artifact.id === selectedArtifact?.id
                return (
                  <button
                    key={artifact.id}
                    type="button"
                    onClick={() => setSelectedArtifactId(artifact.id)}
                    className={selected
                      ? 'w-full rounded-md border border-primary/40 bg-primary/10 px-2 py-1.5 text-left'
                      : 'w-full rounded-md border border-border px-2 py-1.5 text-left hover:bg-muted/50'}
                    role="option"
                    aria-selected={selected}
                  >
                    <div className="truncate text-xs font-medium text-foreground">{artifact.label}</div>
                    <div className="text-[10px] text-muted-foreground">{new Date(artifact.createdAt).toLocaleString()}</div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="overflow-y-auto p-3" aria-live="polite">
          {selectedArtifact ? (
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
                <FileCode2 className="h-3.5 w-3.5" />
                {selectedArtifact.label}
              </div>
              <pre className="overflow-x-auto rounded-md border border-border bg-muted/60 p-2 text-[11px] text-foreground">
                {JSON.stringify(selectedArtifact.data ?? {}, null, 2)}
              </pre>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Artifacts will appear here when available.</p>
          )}
        </div>
      </div>
    </aside>
  )
}
