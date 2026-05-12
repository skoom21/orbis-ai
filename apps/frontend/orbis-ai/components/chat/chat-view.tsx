'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import {
  AddedChatProvider,
  ChatFormProvider,
  ChatSettingsProvider,
  ChatProvider,
  MessagesViewProvider,
  useChatSettingsContext,
} from './providers';
import type { ChatConversation, ChatMessage } from './types';
import { TripContextStrip, type TripContextState } from './trip-context-strip';
import { PreferenceOnboarding } from './onboarding/preference-onboarding';

function ChatViewContent() {
  const { id } = useParams();
  const conversationId = id as string;
  const { session, user } = useAuth();
  const { settings } = useChatSettingsContext()
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false)
  const [tripState, setTripState] = useState<TripContextState>({})
  const [showOnboarding, setShowOnboarding] = useState(false)

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
  const { sendMessage, isStreaming, streamingMessage, agentTrace, currentAgent, regenerateLastMessage, stopStreaming, suggestions } = useChatStream({
    conversationId,
    onError: (error) => {
      console.error('[ChatView] Stream error:', error)
    },
  });

  // Check if user has preferences; if not, show onboarding on empty conversations
  useEffect(() => {
    if (!session?.access_token || messagesLoading) return
    if ((messages?.length ?? 0) > 0) return // Only on fresh conversations
    apiClient.getPreferences().then((res) => {
      if (!res.preferences) setShowOnboarding(true)
    }).catch(() => {/* ignore */})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token, messagesLoading])

  // Listen for "View in Workspace" button clicks from deep in message content
  useEffect(() => {
    const handler = () => setIsSidePanelOpen(true)
    window.addEventListener('orbis:open-workspace', handler)
    return () => window.removeEventListener('orbis:open-workspace', handler)
  }, [])

  // Auto-open workspace when agents produce itinerary or search results
  useEffect(() => {
    if (!messages || messages.length === 0) return
    const last = [...messages].reverse().find(m => m.role === 'assistant')
    if (!last) return
    const hasItinerary = /Day\s*\d+/i.test(last.content) && /Day\s*\d+/i.test(last.content.replace(/Day\s*1/i, ''))
    const hasResults = last.content.includes('"flights"') || last.content.includes('"hotels"')
    if (hasItinerary || hasResults) setIsSidePanelOpen(true)
  }, [messages])

  // Open workspace while planner is streaming an itinerary
  useEffect(() => {
    if (isStreaming && (currentAgent === 'planner' || currentAgent === 'itinerary')) {
      setIsSidePanelOpen(true)
    }
  }, [isStreaming, currentAgent])

  // Auto-send first message if it was stored before navigation from /chat
  const hasSentPending = useRef(false)
  useEffect(() => {
    if (hasSentPending.current || !conversationId || !session?.access_token || messagesLoading) return
    const pending = sessionStorage.getItem('orbis-pending-first-message')
    if (!pending) return
    hasSentPending.current = true
    sessionStorage.removeItem('orbis-pending-first-message')
    sendMessage(pending)
  }, [conversationId, session?.access_token, messagesLoading, sendMessage])

  const handleSendMessage = useCallback(
    (message: string) => {
      // Intercept flight selection to update trip context strip
      const flightMatch = message.match(/book the (.+?) flight (.+?) from (.+?) to (.+?) .+?(\$[\d,]+|\d+ USD)/i)
      if (flightMatch) {
        setTripState((prev) => ({
          ...prev,
          destination: flightMatch[4]?.split(' ')[0] ?? prev.destination,
          flightLabel: `${flightMatch[1]} ${flightMatch[2]}`,
          flightPrice: parseFloat(flightMatch[5]?.replace(/[$,]/g, '') ?? '0'),
        }))
      }
      // Intercept hotel selection
      const hotelMatch = message.match(/book (.+?)(?:\s+in (.+?))?(?:\.\s*Offer|\.?)$/i)
      if (hotelMatch && !flightMatch) {
        setTripState((prev) => ({
          ...prev,
          destination: hotelMatch[2] ?? prev.destination,
          hotelLabel: hotelMatch[1],
        }))
      }
      sendMessage(message)
    },
    [sendMessage]
  )

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
      agentTrace,
      currentAgent,
      suggestions,
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
      agentTrace,
      currentAgent,
      suggestions,
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
            <div className="flex h-full w-full flex-row overflow-hidden">
              <div
                className={settings.maximizeChat
                  ? 'flex min-w-0 flex-1 flex-col overflow-hidden bg-card/50 text-foreground'
                  : 'flex min-w-0 flex-1 flex-col overflow-hidden border border-border bg-card/50 text-foreground'}
              >
                <ChatHeader
                  title={conversation?.title || 'Chat'}
                  conversationId={conversationId}
                  sidePanelOpen={isSidePanelOpen}
                  onToggleSidePanel={() => setIsSidePanelOpen((current) => !current)}
                />
                <TripContextStrip
                  state={tripState}
                  onClear={() => setTripState({})}
                />
                <div className="flex flex-1 flex-col overflow-hidden">
                  <MessagesView
                    messages={messages || []}
                    isStreaming={isStreaming}
                    streamingMessage={streamingMessage}
                    agentTrace={agentTrace}
                    currentAgent={currentAgent}
                    suggestions={suggestions}
                    onSendMessage={handleSendMessage}
                    onRegenerate={regenerateLastMessage}
                    onEditResubmit={handleEditResubmit}
                    onContinue={handleContinue}
                    onFork={handleFork}
                    onFeedback={handleFeedback}
                    emptyState={showOnboarding ? (
                      <PreferenceOnboarding onComplete={() => setShowOnboarding(false)} />
                    ) : (
                      <ChatLanding
                        displayName={displayName}
                        onSelectStarter={handleSendMessage}
                        form={
                          <ChatForm
                            onSend={handleSendMessage}
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
                    )}
                  />
                </div>
                {!isLandingState && (
                  <ChatForm
                    onSend={handleSendMessage}
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
                messages={(messages || []) as ChatMessage[]}
                isStreaming={isStreaming}
                streamingMessage={streamingMessage}
                currentAgent={currentAgent}
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
