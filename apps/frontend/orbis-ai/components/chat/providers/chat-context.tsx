'use client'

import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import type { ChatConversation, ChatMessage } from '../types'

interface ChatContextValue {
  conversationId: string
  messages: ChatMessage[]
  conversation: ChatConversation | null
  messagesLoading: boolean
  isStreaming: boolean
  streamingMessage?: string
  sendMessage: (message: string) => void
  stopStreaming: () => void
  regenerateLastMessage: () => void
}

const ChatContext = createContext<ChatContextValue | null>(null)

interface ChatProviderProps {
  value: ChatContextValue
  children: ReactNode
}

export function ChatProvider({ value, children }: ChatProviderProps) {
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useChatContext() {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChatContext must be used within ChatProvider')
  }
  return context
}

export { ChatContext }
