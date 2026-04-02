'use client';

import { useCallback, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useChatStream } from '@/hooks/use-chat-stream';
import { apiClient } from '@/lib/api-client';
import { Loader2 } from 'lucide-react';
import { MessagesView } from './messages/messages-view';
import { ChatForm } from './input/chat-form';
import { ChatLanding } from './input/chat-landing';
import { ChatHeader } from './header';
import { ChatFooter } from './footer';
import { ChatSidePanel } from './side-panel';
import { parseMessageParts } from './messages/content-parts';
import {
  AddedChatProvider,
  ChatFormProvider,
  ChatSettingsProvider,
  ChatProvider,
  MessagesViewProvider,
  useChatSettingsContext,
} from './providers';
import type { ChatConversation, ChatMessage, MessageContentPart } from './types';

function ChatViewContent() {
  const { id } = useParams();
  const conversationId = id as string;
  const { session, user } = useAuth();
  const { settings } = useChatSettingsContext()
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false)

  // Fetch messages
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => apiClient.getMessages(conversationId),
    enabled: !!conversationId && !!session?.access_token,
  });

  // Fetch conversation details
  const { data: conversation } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => apiClient.getConversation(conversationId),
    enabled: !!conversationId && !!session?.access_token,
  });

  // Chat streaming hook
  const { sendMessage, isStreaming, streamingMessage, regenerateLastMessage, stopStreaming } = useChatStream({
    conversationId,
    onError: (error) => {
      console.error('[ChatView] Stream error:', error)
    },
  });

  const handleEditResubmit = useCallback(
    async (_messageId: string, content: string) => {
      if (!content.trim()) return
      await sendMessage(content.trim())
    },
    [sendMessage]
  )

  const handleContinue = useCallback(
    async (_messageId: string, content: string) => {
      await sendMessage(`Continue this response with more detail:\n\n${content}`)
    },
    [sendMessage]
  )

  const handleFork = useCallback(
    async (_messageId: string, content: string) => {
      await sendMessage(`Give an alternative approach to this response:\n\n${content}`)
    },
    [sendMessage]
  )

  const handleFeedback = useCallback((messageId: string, feedback: 'up' | 'down') => {
    console.log('[ChatView] Message feedback', { messageId, feedback })
  }, [])

  const chatContextValue = useMemo(
    () => ({
      conversationId,
      messages: (messages || []) as ChatMessage[],
      conversation: (conversation || null) as ChatConversation | null,
      messagesLoading,
      isStreaming,
      streamingMessage,
      sendMessage,
      stopStreaming,
      regenerateLastMessage,
    }),
    [
      conversationId,
      messages,
      conversation,
      messagesLoading,
      isStreaming,
      streamingMessage,
      sendMessage,
      stopStreaming,
      regenerateLastMessage,
    ]
  )

  const addedChatContextValue = useMemo(
    () => ({
      isSubmittingAdditional: false,
      setIsSubmittingAdditional: () => undefined,
    }),
    []
  )

  const isLandingState = (messages?.length || 0) === 0 && !streamingMessage
  const displayName = user?.full_name || user?.email?.split('@')[0] || 'Traveler'
  const artifactItems = useMemo(() => {
    const sourceMessages = (messages || []) as ChatMessage[]
    return sourceMessages.flatMap((message) =>
      parseMessageParts(message.content)
        .filter((part): part is Extract<MessageContentPart, { type: 'artifact' }> => part.type === 'artifact')
        .map((part, index) => ({
          id: `${message.id}-artifact-${index}`,
          label: part.label,
          messageId: message.id,
          createdAt: message.created_at,
          data: part.data,
        }))
    )
  }, [messages])

  if (messagesLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ChatFormProvider conversationId={conversationId}>
      <ChatProvider value={chatContextValue}>
        <AddedChatProvider value={addedChatContextValue}>
          <MessagesViewProvider>
            <div className="flex h-full w-full flex-col overflow-hidden">
              <div
                className={settings.maximizeChat
                  ? 'flex min-w-0 flex-1 flex-col overflow-hidden bg-card/50 text-foreground'
                  : 'flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card/50 text-foreground'}
              >
                <ChatHeader
                  title={conversation?.title || 'Chat'}
                  conversationId={conversationId}
                  sidePanelOpen={isSidePanelOpen}
                  onToggleSidePanel={() => setIsSidePanelOpen((current) => !current)}
                />
                <div className="flex flex-1 flex-col overflow-hidden">
                  <MessagesView 
                    messages={messages || []} 
                    isStreaming={isStreaming}
                    streamingMessage={streamingMessage}
                    onRegenerate={regenerateLastMessage}
                    onEditResubmit={handleEditResubmit}
                    onContinue={handleContinue}
                    onFork={handleFork}
                    onFeedback={handleFeedback}
                    emptyState={
                      <ChatLanding
                        displayName={displayName}
                        onSelectStarter={sendMessage}
                        form={
                          <ChatForm
                            onSend={sendMessage}
                            isLoading={isStreaming}
                            onStop={stopStreaming}
                            commandCapabilities={{
                              slash: settings.slashCommands,
                              mentions: settings.mentionCommands,
                              plus: settings.plusCommands,
                            }}
                            voiceCapabilities={{
                              enabled: settings.voiceInput,
                              autoSendDefault: settings.voiceAutoSend,
                            }}
                          />
                        }
                        showStarters={settings.showLandingStarters}
                        centerComposer={settings.centerLandingComposer}
                      />
                    }
                  />
                </div>
                {!isLandingState && (
                  <ChatForm
                    onSend={sendMessage}
                    isLoading={isStreaming}
                    onStop={stopStreaming}
                    commandCapabilities={{
                      slash: settings.slashCommands,
                      mentions: settings.mentionCommands,
                      plus: settings.plusCommands,
                    }}
                    voiceCapabilities={{
                      enabled: settings.voiceInput,
                      autoSendDefault: settings.voiceAutoSend,
                    }}
                  />
                )}
                <ChatFooter />
              </div>
              <ChatSidePanel
                isOpen={isSidePanelOpen}
                onToggle={() => setIsSidePanelOpen((current) => !current)}
                artifacts={artifactItems}
              />
            </div>
          </MessagesViewProvider>
        </AddedChatProvider>
      </ChatProvider>
    </ChatFormProvider>
  );
}

export function ChatView() {
  return (
    <ChatSettingsProvider>
      <ChatViewContent />
    </ChatSettingsProvider>
  )
}
