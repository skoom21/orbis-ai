'use client'

import { createContext, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import { useChatContext } from './chat-context'
import { useAddedChatContext } from './added-chat-context'
import type { ChatMessage } from '../types'

interface MessagesViewContextValue {
  messages: ChatMessage[]
  isStreaming: boolean
  streamingMessage?: string
  isSubmittingFamily: boolean
  regenerateLastMessage: () => void
}

const MessagesViewContext = createContext<MessagesViewContextValue | null>(null)

interface MessagesViewProviderProps {
  children: ReactNode
}

export function MessagesViewProvider({ children }: MessagesViewProviderProps) {
  const {
    messages,
    isStreaming,
    streamingMessage,
    regenerateLastMessage,
  } = useChatContext()
  const { isSubmittingAdditional } = useAddedChatContext()

  const value = useMemo(
    () => ({
      messages,
      isStreaming,
      streamingMessage,
      regenerateLastMessage,
      isSubmittingFamily: isStreaming || isSubmittingAdditional,
    }),
    [messages, isStreaming, streamingMessage, regenerateLastMessage, isSubmittingAdditional]
  )

  return <MessagesViewContext.Provider value={value}>{children}</MessagesViewContext.Provider>
}

export function useMessagesViewContext() {
  const context = useContext(MessagesViewContext)
  if (!context) {
    throw new Error('useMessagesViewContext must be used within MessagesViewProvider')
  }
  return context
}

export { MessagesViewContext }
