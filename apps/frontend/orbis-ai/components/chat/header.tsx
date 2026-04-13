'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { User, Globe, ChevronDown, Download, Link2, Plus, Ghost, Bookmark, Clock3, PanelRightOpen, PanelRightClose, MoreVertical, Menu, Home } from 'lucide-react'
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ChatHeaderProps {
  title: string
  subtitle?: string
  modelLabel?: string
  conversationId?: string
  onToggleSidePanel?: () => void
  sidePanelOpen?: boolean
  isIncognito?: boolean
  onToggleIncognito?: () => void
  hasMessages?: boolean
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
  isIncognito = false,
  onToggleIncognito,
  hasMessages = false,
}: ChatHeaderProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [selectedModel, setSelectedModel] = useState(modelLabel)
  const [selectedPreset, setSelectedPreset] = useState(PRESETS[0])
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
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/70 px-4 py-3 backdrop-blur-xl z-20">
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Menu */}
        <button
          onClick={() => document.dispatchEvent(new CustomEvent('toggle-mobile-sidebar'))}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted text-foreground transition-colors lg:hidden"
          aria-label="Open chat sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="hidden lg:flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20 shadow-sm">
          <Globe className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-foreground line-clamp-1 max-w-[150px] sm:max-w-xs">{title}</h1>
          <p className="text-xs text-muted-foreground">{subtitle || `Chatting as ${displayName}`}</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <Link
          href="/chat"
          className="lg:hidden inline-flex h-8 w-8 items-center justify-center rounded-md bg-transparent hover:bg-muted text-foreground transition-colors shrink-0"
          aria-label="New Chat"
        >
          <Plus className="h-5 w-5" />
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 min-w-max max-w-[140px] sm:min-w-[140px] justify-between">
              <div className="flex items-center gap-1.5 truncate">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 shrink-0" title="Model active and connected" />
                <span className="truncate text-xs hidden sm:inline-block">{selectedModel}</span>
                <span className="truncate text-xs sm:hidden">{selectedModel.split(' ')[0]}</span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
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
            <Button variant="outline" size="sm" className="hidden gap-1.5 sm:inline-flex min-w-[140px] justify-between">
              <div className="flex items-center gap-1.5 truncate">
                <Bookmark className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate text-xs px-1" title={`Current Trip: ${selectedPreset}`}>{selectedPreset}</span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
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

        

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="hidden gap-1.5 md:inline-flex border-primary/20 text-primary hover:bg-primary/5">
              <Download className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Export</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={handleExportMarkdown} disabled={!conversationId || isExportingMarkdown}>
              {isExportingMarkdown ? 'Exporting markdown...' : 'Export Itinerary PDF'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportJson} disabled={!conversationId || isExportingJson}>
              {isExportingJson ? 'Exporting JSON...' : 'Export Raw Data'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleCopyShareLink} disabled={!conversationId}>
              <Link2 className="h-4 w-4 mr-2" />
              Copy share link
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {!hasMessages && (
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <Button
                variant={isIncognito ? 'secondary' : 'ghost'}
                size="sm"
                className="hidden gap-1.5 sm:inline-flex text-muted-foreground hover:text-foreground"
                onClick={onToggleIncognito}
                aria-pressed={isIncognito}
                aria-label={isIncognito ? 'Disable incognito session' : 'Enable incognito session'}
              >
                <Ghost className="h-4 w-4" />
                <span className="sr-only md:not-sr-only md:text-xs">Incognito</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Incognito Session</p>
            </TooltipContent>
          </Tooltip>
        )}

        {onToggleSidePanel && (
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="hidden lg:inline-flex text-muted-foreground hover:text-foreground hover:bg-muted/60"
                onClick={onToggleSidePanel}
                aria-pressed={sidePanelOpen}
                aria-label={sidePanelOpen ? 'Hide side panel' : 'Show side panel'}
              >
                {sidePanelOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Toggle Workspace Panel</p>
            </TooltipContent>
          </Tooltip>
        )}

        <Button variant="outline" size="sm" asChild className="ml-1 border-primary/20 text-primary hover:bg-primary/5">
          <Link href="/dashboard">
            <Home className="h-3.5 w-3.5" />
            <span className="hidden sm:inline-block ml-1.5 text-xs font-medium">Dashboard</span>
          </Link>
        </Button>
      </div>
    </div>
  )
}
