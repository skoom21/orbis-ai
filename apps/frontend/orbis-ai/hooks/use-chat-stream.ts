/**
 * Chat Streaming Hook
 * Handles SSE streaming for chat messages with proper state management
 */

import { useState, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from './use-auth'

interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

interface StreamMessage {
  content: string
  conversation_id: string
}

interface UseChatStreamOptions {
  conversationId: string
  onError?: (error: Error) => void
}

export function useChatStream({ conversationId, onError }: UseChatStreamOptions) {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState('')
  const abortControllerRef = useRef<AbortController | null>(null)

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsStreaming(false)
    setStreamingMessage('')
  }, [])

  const sendMessage = useCallback(
    async (message: string) => {
      if (!session?.access_token || !conversationId) {
        console.error('[ChatStream] No session or conversation ID')
        return
      }

      if (isStreaming) {
        console.warn('[ChatStream] Already streaming, ignoring new message')
        return
      }

      setIsStreaming(true)
      setStreamingMessage('')

      // Create abort controller
      abortControllerRef.current = new AbortController()

      try {
        // Optimistically add user message
        const tempUserId = `temp-user-${Date.now()}`
        queryClient.setQueryData<Message[]>(['messages', conversationId], (old = []) => [
          ...old,
          {
            id: tempUserId,
            conversation_id: conversationId,
            role: 'user' as const,
            content: message,
            created_at: new Date().toISOString(),
          },
        ])

        // Start SSE stream
        const response = await fetch('http://localhost:8000/api/v1/chat/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            message,
            conversation_id: conversationId,
          }),
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`)
        }

        if (!response.body) {
          throw new Error('No response body')
        }

        // Read SSE stream
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let accumulatedContent = ''

        while (true) {
          const { done, value } = await reader.read()

          if (done) {
            break
          }

          buffer += decoder.decode(value, { stream: true })
          
          // Process complete SSE events
          const lines = buffer.split('\n')
          buffer = lines.pop() || '' // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6) // Remove 'data: ' prefix
              
              try {
                const data: StreamMessage = JSON.parse(dataStr)
                accumulatedContent += data.content
                setStreamingMessage(accumulatedContent)
              } catch (e) {
                console.warn('[ChatStream] Failed to parse SSE data:', dataStr)
              }
            } else if (line === 'event: done') {
              // Stream complete
              console.log('[ChatStream] Stream complete')
            } else if (line === 'event: error') {
              console.error('[ChatStream] Stream error event')
            }
          }
        }

        // After stream completes, refetch messages to get final persisted messages with IDs
        await queryClient.invalidateQueries({ queryKey: ['messages', conversationId] })

      } catch (error) {
        console.error('[ChatStream] Error:', error)
        
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            console.log('[ChatStream] Stream aborted by user')
          } else {
            onError?.(error)
          }
        }

        // Remove optimistic message on error
        queryClient.setQueryData<Message[]>(['messages', conversationId], (old = []): Message[] =>
          (old as Message[]).filter((m) => !m.id.startsWith('temp-'))
        )
      } finally {
        setIsStreaming(false)
        setStreamingMessage('')
        abortControllerRef.current = null
      }
    },
    [session, conversationId, isStreaming, queryClient, onError]
  )

  const regenerateLastMessage = useCallback(async () => {
    const messages = queryClient.getQueryData<Message[]>(['messages', conversationId]) || []
    
    // Find last user message
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')
    
    if (lastUserMessage) {
      // Remove last assistant message if exists
      const lastAssistantIndex = messages.length - 1
      if (messages[lastAssistantIndex]?.role === 'assistant') {
        queryClient.setQueryData<Message[]>(['messages', conversationId], (old = []) =>
          old.slice(0, -1)
        )
      }
      
      // Resend last user message
      await sendMessage(lastUserMessage.content)
    }
  }, [conversationId, queryClient, sendMessage])

  return {
    sendMessage,
    regenerateLastMessage,
    stopStreaming,
    isStreaming,
    streamingMessage,
  }
}
