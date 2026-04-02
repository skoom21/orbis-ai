'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, Sparkles, ChevronDown, Download, Link2, Plus, Bookmark, Clock3, PanelRightOpen, PanelRightClose, MoreVertical } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/lib/api-client'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ChatHeaderProps {
  title: string
  subtitle?: string
  modelLabel?: string
  conversationId?: string
  onToggleSidePanel?: () => void
  sidePanelOpen?: boolean
}

const MODELS = ['Gemini 2.0 Flash', 'Gemini 1.5 Pro', 'GPT-4o Mini']
const PRESETS = ['Trip Planner', 'Budget Advisor', 'Local Expert']

export function ChatHeader({
  title,
  subtitle,
  modelLabel = 'Gemini 2.0 Flash',
  conversationId,
  onToggleSidePanel,
  sidePanelOpen = false,
}: ChatHeaderProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [selectedModel, setSelectedModel] = useState(modelLabel)
  const [selectedPreset, setSelectedPreset] = useState(PRESETS[0])
  const [temporaryChat, setTemporaryChat] = useState(false)
  const [isExportingMarkdown, setIsExportingMarkdown] = useState(false)
  const [isExportingJson, setIsExportingJson] = useState(false)
  const displayName = user?.full_name || user?.email?.split('@')[0] || 'Traveler'

  const downloadTextFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const sanitizeFileName = (value: string) => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 60) || 'chat-export'
  }

  const handleCopyShareLink = async () => {
    if (!conversationId) return
    await navigator.clipboard.writeText(apiClient.getConversationShareLink(conversationId))
  }

  const handleExportMarkdown = async () => {
    if (!conversationId || isExportingMarkdown) return
    setIsExportingMarkdown(true)
    try {
      const markdown = await apiClient.exportConversationAsMarkdown(conversationId)
      downloadTextFile(`${sanitizeFileName(title)}.md`, markdown)
    } finally {
      setIsExportingMarkdown(false)
    }
  }

  const handleExportJson = async () => {
    if (!conversationId || isExportingJson) return
    setIsExportingJson(true)
    try {
      const json = await apiClient.exportConversationAsJson(conversationId)
      downloadTextFile(`${sanitizeFileName(title)}.json`, json)
    } finally {
      setIsExportingJson(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-foreground">{title}</h1>
          <p className="text-xs text-muted-foreground">{subtitle || `Chatting as ${displayName}`}</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="inline-flex h-9 w-9 sm:hidden" aria-label="More chat actions">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Mobile Chat Controls</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[11px] text-muted-foreground">Model</DropdownMenuLabel>
            {MODELS.map((model) => (
              <DropdownMenuItem key={`mobile-${model}`} onClick={() => setSelectedModel(model)}>
                {model}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[11px] text-muted-foreground">Preset</DropdownMenuLabel>
            {PRESETS.map((preset) => (
              <DropdownMenuItem key={`mobile-${preset}`} onClick={() => setSelectedPreset(preset)}>
                {preset}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setTemporaryChat((current) => !current)}>
              <Clock3 className="h-4 w-4" />
              Temporary chat: {temporaryChat ? 'On' : 'Off'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCopyShareLink} disabled={!conversationId}>
              <Link2 className="h-4 w-4" />
              Copy share link
            </DropdownMenuItem>
            {onToggleSidePanel && (
              <DropdownMenuItem onClick={onToggleSidePanel}>
                {sidePanelOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                {sidePanelOpen ? 'Hide panel' : 'Show panel'}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              <span className="max-w-28 truncate text-xs sm:max-w-none">{selectedModel}</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Model</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {MODELS.map((model) => (
              <DropdownMenuItem key={model} onClick={() => setSelectedModel(model)}>
                {model}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="hidden gap-1.5 sm:inline-flex">
              <Bookmark className="h-3.5 w-3.5" />
              <span className="max-w-20 truncate">{selectedPreset}</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel>Preset</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {PRESETS.map((preset) => (
              <DropdownMenuItem key={preset} onClick={() => setSelectedPreset(preset)}>
                {preset}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant={temporaryChat ? 'default' : 'outline'}
          size="sm"
          className="hidden gap-1.5 sm:inline-flex"
          onClick={() => setTemporaryChat((current) => !current)}
          aria-pressed={temporaryChat}
          aria-label={temporaryChat ? 'Disable temporary chat' : 'Enable temporary chat'}
        >
          <Clock3 className="h-3.5 w-3.5" />
          Temp
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="hidden gap-1.5 md:inline-flex">
              <Download className="h-3.5 w-3.5" />
              Export
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={handleExportMarkdown} disabled={!conversationId || isExportingMarkdown}>
              {isExportingMarkdown ? 'Exporting markdown...' : 'Export markdown'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportJson} disabled={!conversationId || isExportingJson}>
              {isExportingJson ? 'Exporting JSON...' : 'Export JSON'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleCopyShareLink} disabled={!conversationId}>
              <Link2 className="h-4 w-4" />
              Copy share link
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="default" size="sm" className="h-9 gap-1.5 px-3" onClick={() => router.push('/chat')}>
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Add Chat</span>
        </Button>

        {onToggleSidePanel && (
          <Button
            variant="outline"
            size="sm"
            className="hidden gap-1.5 lg:inline-flex"
            onClick={onToggleSidePanel}
            aria-pressed={sidePanelOpen}
            aria-label={sidePanelOpen ? 'Hide side panel' : 'Show side panel'}
          >
            {sidePanelOpen ? <PanelRightClose className="h-3.5 w-3.5" /> : <PanelRightOpen className="h-3.5 w-3.5" />}
            Panel
          </Button>
        )}

        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground" aria-hidden="true">
          <User className="h-4 w-4" />
        </div>
      </div>
    </div>
  )
}
