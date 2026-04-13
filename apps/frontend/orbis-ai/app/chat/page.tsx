'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/use-auth'
import { apiClient } from '@/lib/api-client'
import { ChatHeader } from '@/components/chat/header'
import { ChatLanding } from '@/components/chat/input/chat-landing'
import { ChatForm } from '@/components/chat/input/chat-form'
import { ChatFooter } from '@/components/chat/footer'
import { ChatFormProvider, ChatSettingsProvider, useChatSettingsContext } from '@/components/chat/providers'

const PENDING_MESSAGE_KEY = 'orbis-pending-first-message'

function NewChatContent() {
  const { user } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { settings } = useChatSettingsContext()
  const displayName = user?.full_name || user?.email?.split('@')[0] || 'Traveler'

  const handleSend = useCallback(async (message: string) => {
    if (!message.trim()) return
    try {
      const convo = await apiClient.createConversation('New Trip Chat')
      sessionStorage.setItem(PENDING_MESSAGE_KEY, message.trim())
      await queryClient.invalidateQueries({ queryKey: ['conversations'] })
      router.push(`/chat/${convo.id}`)
    } catch (err) {
      console.error('[NewChat] Failed to create conversation:', err)
    }
  }, [router, queryClient])

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background text-foreground">
      <ChatHeader
        title="New Trip Chat"
        hasMessages={false}
      />
      <div className="flex flex-1 flex-col overflow-hidden relative">
        <div className="flex-1 overflow-y-auto flex flex-col">
          <div className="flex w-full flex-col items-center justify-start text-muted-foreground mt-4 sm:mt-8 lg:mt-16 mb-8">
            <ChatLanding
              displayName={displayName}
              onSelectStarter={handleSend}
              form={
                <ChatForm
                  onSend={handleSend}
                  isLoading={false}
                  commandCapabilities={{
                    slash: settings.slashCommands,
                    mentions: settings.mentionCommands,
                    plus: settings.plusCommands,
                  }}
                  voiceCapabilities={{
                    enabled: settings.voiceInput,
                    autoSendDefault: settings.voiceAutoSend,
                  }}
                  variant="floating"
                />
              }
              showStarters={settings.showLandingStarters}
              centerComposer={settings.centerLandingComposer}
            />
          </div>
        </div>
      </div>
      <ChatFooter />
    </div>
  )
}

export default function ChatIndexPage() {
  return (
    <ChatSettingsProvider>
      <ChatFormProvider conversationId="">
        <NewChatContent />
      </ChatFormProvider>
    </ChatSettingsProvider>
  )
}
