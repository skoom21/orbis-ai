/**
 * Chat Streaming Hook
 * Handles SSE streaming for chat messages with proper state management
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from './use-auth'
import { apiClient } from '@/lib/api-client'

interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  parent_message_id?: string | null
}

interface StreamMessage {
  type?: 'created' | 'type' | 'sync' | 'attachment' | 'final' | 'cancel' | 'error'
  content?: string
  message?: string
  conversation_id?: string
  message_id?: string
  detail?: string
}

interface ParsedSSEEvent {
  event: string
  data: StreamMessage | null
}

interface UseChatStreamOptions {
  conversationId: string
  onError?: (error: Error) => void
}

export function useChatStream({ conversationId, onError }: UseChatStreamOptions) {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  
  const [isStreaming, setIsStreaming] = useState(false)
  const [rawStreamingMessage, setRawStreamingMessage] = useState('')
  const [streamingMessage, setStreamingMessage] = useState('')
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!isStreaming) {
      setStreamingMessage('')
      setRawStreamingMessage('')
      return
    }
    
    if (streamingMessage === rawStreamingMessage) return

    const interval = setInterval(() => {
      setStreamingMessage((prev) => {
        if (prev.length >= rawStreamingMessage.length) {
          clearInterval(interval)
          return prev
        }
        const diff = rawStreamingMessage.length - prev.length
        const chunkSize = Math.max(1, Math.min(4, Math.ceil(diff / 5)))
        return rawStreamingMessage.slice(0, prev.length + chunkSize)
      })
    }, 15)

    return () => clearInterval(interval)
  }, [rawStreamingMessage, isStreaming, streamingMessage])

  const parseSSE = useCallback((rawText: string): ParsedSSEEvent[] => {
    const blocks = rawText.split(/\n\n+/)
    const parsed: ParsedSSEEvent[] = []

    for (const block of blocks) {
      if (!block.trim()) continue

      let event = 'message'
      const dataLines: string[] = []

      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) {
          event = line.slice(6).trim()
          continue
        }
        if (line.startsWith('data:')) {
          dataLines.push(line.slice(5).trim())
        }
      }

      const dataText = dataLines.join('\n')
      if (!dataText) {
        parsed.push({ event, data: null })
        continue
      }

      try {
        parsed.push({ event, data: JSON.parse(dataText) as StreamMessage })
      } catch {
        parsed.push({
          event,
          data: { content: dataText, type: event as StreamMessage['type'] },
        })
      }
    }

    return parsed
  }, [])

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsStreaming(false)
    setRawStreamingMessage('')
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
      setRawStreamingMessage('')

      // Create abort controller
      abortControllerRef.current = new AbortController()

      try {
        const existingMessages = queryClient.getQueryData<Message[]>(['messages', conversationId]) || []
        const lastPersistedMessage = [...existingMessages]
          .reverse()
          .find((item) => !item.id.startsWith('temp-'))
        const parentMessageId = lastPersistedMessage?.id

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
            parent_message_id: parentMessageId || null,
          },
        ])

        const response = await apiClient.createChatStream(
          {
            message,
            conversation_id: conversationId,
            parent_message_id: parentMessageId,
          },
          abortControllerRef.current?.signal
        )

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

        while (true) {
          const { done, value } = await reader.read()

          if (done) break

          buffer += decoder.decode(value, { stream: true })

          const eventChunks = buffer.split('\n\n')
          buffer = eventChunks.pop() || ''

          for (const parsedEvent of parseSSE(eventChunks.join('\n\n'))) {
            const normalizedType = parsedEvent.data?.type || parsedEvent.event

            if (normalizedType === 'created' || normalizedType === 'sync' || normalizedType === 'agent') {
              continue
            }

            if (normalizedType === 'token' || normalizedType === 'type' || normalizedType === 'attachment' || normalizedType === 'message') {
              const delta = parsedEvent.data?.content || parsedEvent.data?.message || ''
              if (!delta) continue
              
              setRawStreamingMessage((prev) => {
                // If it's already accumulating this exactly, don't double append
                if (prev && prev.endsWith(delta) && delta.length > 20) return prev;
                // If the delta IS the full string so far (cumulative mode)
                if (delta.startsWith(prev)) return delta;
                // Otherwise append
                return prev + delta;
              })
              continue
            }

            if (normalizedType === 'final' || normalizedType === 'done') {
              break
            }

            if (normalizedType === 'cancel') {
              stopStreaming()
              break
            }

            if (normalizedType === 'error') {
              throw new Error(
                parsedEvent.data?.detail ||
                  parsedEvent.data?.message ||
                  (parsedEvent.data as { error?: string } | null)?.error ||
                  'Stream error'
              )
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
        setRawStreamingMessage('')
        abortControllerRef.current = null
      }
    },
    [session, conversationId, isStreaming, queryClient, onError, parseSSE, stopStreaming]
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
