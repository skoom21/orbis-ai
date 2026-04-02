'use client'

import { Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useChatSettingsContext } from './providers'

export function ChatFooter() {
  const { settings, setSetting, resetSettings } = useChatSettingsContext()

  const toggle = <K extends keyof typeof settings>(key: K) => {
    setSetting(key, !settings[key] as (typeof settings)[K])
  }

  return (
    <div className="flex items-center justify-between border-t border-border bg-background/80 px-4 py-2 text-xs text-muted-foreground">
      <span>Orbis AI can make mistakes. Verify important travel details.</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
            <Settings2 className="h-3.5 w-3.5" />
            Chat Settings
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel>Behavior</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => toggle('enterToSend')}>
            Enter to send: {settings.enterToSend ? 'On' : 'Off'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => toggle('maximizeChat')}>
            Maximize chat shell: {settings.maximizeChat ? 'On' : 'Off'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => toggle('autoScroll')}>
            Auto-scroll: {settings.autoScroll ? 'On' : 'Off'}
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuLabel>Commands & Voice</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => toggle('slashCommands')}>
            Slash commands: {settings.slashCommands ? 'On' : 'Off'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => toggle('mentionCommands')}>
            Mention commands: {settings.mentionCommands ? 'On' : 'Off'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => toggle('plusCommands')}>
            Plus commands: {settings.plusCommands ? 'On' : 'Off'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => toggle('voiceInput')}>
            Voice input: {settings.voiceInput ? 'On' : 'Off'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => toggle('voiceAutoSend')}>
            Voice auto-send: {settings.voiceAutoSend ? 'On' : 'Off'}
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuLabel>Landing</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => toggle('showLandingStarters')}>
            Show starters: {settings.showLandingStarters ? 'On' : 'Off'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => toggle('centerLandingComposer')}>
            Center composer: {settings.centerLandingComposer ? 'On' : 'Off'}
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={resetSettings}>Reset defaults</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
