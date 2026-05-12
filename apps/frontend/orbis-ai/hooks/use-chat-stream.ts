/**
 * Chat Streaming Hook
 * Handles SSE streaming for chat messages with proper state management.
 *
 * Character-reveal animation: incoming chunks are enqueued and revealed
 * gradually via requestAnimationFrame so the UI looks like live streaming
 * even when the model sends large, infrequent chunks.
 *
 * Agent trace: processes step / agent / tool_start / tool_end SSE events
 * and builds an AgentTraceStep[] array that the UI renders as a live
 * activity panel above the streaming message.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { useQueryClient, QueryClient } from '@tanstack/react-query'
import { useAuth } from './use-auth'
import { apiClient } from '@/lib/api-client'

// ─── Agent trace types ──────────────────────────────────────────────────────

export type AgentTraceStepStatus = 'running' | 'done' | 'warning' | 'error' | 'success'

export interface AgentTraceStep {
  id: string
  type: 'step' | 'agent' | 'tool'
  status: AgentTraceStepStatus
  label: string
  /** Only set for type === 'agent' */
  agentType?: string
  /** Only set for type === 'tool' */
  tool?: string
  /** Serialisable input dict passed to the tool */
  input?: Record<string, unknown>
  /** Short preview of the tool output */
  outputPreview?: string
  timestamp: number
}

const noopQueryClient = {
  getQueryData: () => undefined,
  setQueryData: () => undefined,
  invalidateQueries: async () => undefined,
} as unknown as QueryClient

function useQueryClientSafe(): QueryClient {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useQueryClient()
  } catch {
    console.warn('[ChatStream] No QueryClientProvider found; cache operations will be no-ops')
    return noopQueryClient
  }
}

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
  // agent trace payloads
  step?: string
  label?: string
  status?: string
  agent_type?: string
  tool?: string
  input?: Record<string, unknown>
  output_preview?: string
  suggestions?: string[]
}

interface ParsedSSEEvent {
  event: string
  data: StreamMessage | null
}

interface UseChatStreamOptions {
  conversationId: string
  onError?: (error: Error) => void
}

let _traceIdCounter = 0
function nextTraceId() {
  return `trace-${++_traceIdCounter}`
}

// Characters revealed per animation frame (~60fps → ~720 chars/sec).
// Fast enough that even 1000-char responses finish in ~1.4s, but slow
// enough for the eye to perceive individual words appearing.
const REVEAL_CHARS_PER_FRAME = 12

export function useChatStream({ conversationId, onError }: UseChatStreamOptions) {
  const { session } = useAuth()
  const queryClient = useQueryClientSafe()

  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState('')
  const [agentTrace, setAgentTrace] = useState<AgentTraceStep[]>([])
  const [currentAgent, setCurrentAgent] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])

  // Mutable ref so event handlers can find tool steps by tool name without
  // triggering re-renders during high-frequency streaming.
  const traceRef = useRef<AgentTraceStep[]>([])

  // Total text received from server (for cumulative-mode detection)
  const accumulatedRef = useRef('')
  // Characters waiting to be revealed
  const pendingRef = useRef('')
  // Characters currently shown in state
  const displayedRef = useRef('')
  // rAF handle for the reveal loop
  const animRef = useRef<number | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)

  // Stable ref to the reveal-loop body so rAF always calls the latest closure
  // without needing to recreate the rAF callback on every render.
  const revealLoopRef = useRef<(() => void) | null>(null)
  revealLoopRef.current = () => {
    if (!pendingRef.current) {
      animRef.current = null
      return
    }
    const batch = pendingRef.current.slice(0, REVEAL_CHARS_PER_FRAME)
    pendingRef.current = pendingRef.current.slice(REVEAL_CHARS_PER_FRAME)
    displayedRef.current += batch
    setStreamingMessage(displayedRef.current)
    animRef.current = requestAnimationFrame(() => revealLoopRef.current?.())
  }

  const startRevealLoop = useCallback(() => {
    if (animRef.current !== null) return
    animRef.current = requestAnimationFrame(() => revealLoopRef.current?.())
  }, [])

  // Add incremental text to the reveal queue
  const enqueueText = useCallback((delta: string) => {
    if (!delta) return
    pendingRef.current += delta
    startRevealLoop()
  }, [startRevealLoop])

  // ─── Trace helpers ─────────────────────────────────────────────────────────
  // All mutations go through traceRef first, then batch-set state so React
  // doesn't re-render on every token while the text reveal loop is running.

  const pushTrace = useCallback((step: AgentTraceStep) => {
    traceRef.current = [...traceRef.current, step]
    setAgentTrace([...traceRef.current])
  }, [])

  const updateTrace = useCallback((id: string, patch: Partial<AgentTraceStep>) => {
    traceRef.current = traceRef.current.map((s) => s.id === id ? { ...s, ...patch } : s)
    setAgentTrace([...traceRef.current])
  }, [])

  // Reset all animation state when streaming ends
  useEffect(() => {
    if (!isStreaming) {
      if (animRef.current !== null) {
        cancelAnimationFrame(animRef.current)
        animRef.current = null
      }
      pendingRef.current = ''
      displayedRef.current = ''
      accumulatedRef.current = ''
      setStreamingMessage('')
      // Keep the trace visible briefly after streaming ends so the user
      // can see the completed steps, then clear it.
      const t = window.setTimeout(() => {
        traceRef.current = []
        setAgentTrace([])
        setCurrentAgent(null)
      }, 4000)
      return () => window.clearTimeout(t)
    }
  }, [isStreaming])

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
      setCurrentAgent(null)
      setSuggestions([])
      traceRef.current = []
      setAgentTrace([])
      pendingRef.current = ''
      displayedRef.current = ''
      accumulatedRef.current = ''

      abortControllerRef.current = new AbortController()

      try {
        const existingMessages =
          queryClient.getQueryData<Message[]>(['messages', conversationId]) || []
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

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        outer: while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          const eventChunks = buffer.split('\n\n')
          buffer = eventChunks.pop() || ''

          for (const parsedEvent of parseSSE(eventChunks.join('\n\n'))) {
            // The SSE `event:` field takes precedence; fall back to the
            // `type` field inside the JSON payload for older events.
            const eventKind = parsedEvent.event !== 'message' ? parsedEvent.event : (parsedEvent.data?.type ?? 'message')
            const d = parsedEvent.data

            // ── Orchestration step pill ──────────────────────────────────
            if (eventKind === 'step') {
              const stepId = nextTraceId()
              const status = (d?.status ?? 'done') as AgentTraceStepStatus
              pushTrace({
                id: stepId,
                type: 'step',
                status,
                label: d?.label ?? d?.step ?? 'Processing',
                timestamp: Date.now(),
              })
              continue
            }

            // ── Agent activated ──────────────────────────────────────────
            if (eventKind === 'agent') {
              const agentType = d?.agent_type ?? ''
              setCurrentAgent(agentType)
              pushTrace({
                id: nextTraceId(),
                type: 'agent',
                status: 'running',
                label: d?.label ?? agentType,
                agentType,
                timestamp: Date.now(),
              })
              continue
            }

            // ── Tool call started ────────────────────────────────────────
            if (eventKind === 'tool_start') {
              pushTrace({
                id: `tool-${d?.tool ?? nextTraceId()}`,
                type: 'tool',
                status: 'running',
                label: d?.label ?? d?.tool ?? 'Tool call',
                tool: d?.tool,
                input: d?.input,
                timestamp: Date.now(),
              })
              continue
            }

            // ── Tool call finished ───────────────────────────────────────
            if (eventKind === 'tool_end') {
              const toolId = `tool-${d?.tool}`
              const existing = traceRef.current.find((s) => s.id === toolId)
              if (existing) {
                updateTrace(toolId, {
                  status: (d?.status ?? 'success') as AgentTraceStepStatus,
                  outputPreview: d?.output_preview ?? undefined,
                })
              }
              continue
            }

            // ── Silently skip non-content bookkeeping events ─────────────
            if (eventKind === 'created' || eventKind === 'sync') {
              continue
            }

            // ── Text token ───────────────────────────────────────────────
            if (
              eventKind === 'token' ||
              eventKind === 'type' ||
              eventKind === 'attachment' ||
              eventKind === 'message' ||
              eventKind === 'content'
            ) {
              const delta = d?.content || d?.message || ''
              if (!delta) continue

              // Detect cumulative vs incremental streaming mode
              const prev = accumulatedRef.current
              let deltaNew: string

              if (prev && prev.endsWith(delta) && delta.length > 20) {
                continue // duplicate chunk
              } else if (delta.startsWith(prev) && delta.length > prev.length) {
                deltaNew = delta.slice(prev.length)
                accumulatedRef.current = delta
              } else {
                deltaNew = delta
                accumulatedRef.current = prev + delta
              }

              enqueueText(deltaNew)
              continue
            }

            if (eventKind === 'suggestions') {
              const chips = d?.suggestions
              console.debug('[ChatStream] suggestions received:', chips)
              if (Array.isArray(chips) && chips.length > 0) setSuggestions(chips as string[])
              continue
            }

            if (eventKind === 'final' || eventKind === 'done') {
              break outer
            }

            if (eventKind === 'cancel') {
              stopStreaming()
              break outer
            }

            if (eventKind === 'error') {
              throw new Error(
                d?.detail ||
                  d?.message ||
                  (d as { error?: string } | null)?.error ||
                  'Stream error'
              )
            }
          }
        }

        // Let the reveal animation drain naturally so the user sees streaming
        // rather than an instant jump. Poll via rAF until the queue is empty.
        if (pendingRef.current) {
          await new Promise<void>((resolve) => {
            const waitForDrain = () => {
              if (!pendingRef.current) {
                resolve()
              } else {
                requestAnimationFrame(waitForDrain)
              }
            }
            requestAnimationFrame(waitForDrain)
          })
        }

        // Client-side fallback suggestions if the backend didn't send any
        setSuggestions((current) => {
          if (current.length > 0) return current
          const text = accumulatedRef.current.toLowerCase()
          if (/flight|fly|depart|airline/.test(text)) return ['Search hotels too', 'Try different dates', 'One-way instead', 'Different airline']
          if (/hotel|stay|accommodation|check.?in/.test(text)) return ['Book this hotel', 'Search flights too', 'Show cheaper options', 'What\'s nearby?']
          if (/itinerary|day 1|day 2|plan/.test(text)) return ['Search flights now', 'Find hotels', 'Adjust the plan', 'Save & export']
          if (/book|reserv|confirm/.test(text)) return ['View my bookings', 'Add to trip', 'Share itinerary']
          return ['Search flights', 'Find hotels', 'Plan a trip', 'View my trips']
        })

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

        queryClient.setQueryData<Message[]>(
          ['messages', conversationId],
          (old = []): Message[] => (old as Message[]).filter((m) => !m.id.startsWith('temp-'))
        )
      } finally {
        if (animRef.current !== null) {
          cancelAnimationFrame(animRef.current)
          animRef.current = null
        }
        pendingRef.current = ''
        accumulatedRef.current = ''
        abortControllerRef.current = null
        setIsStreaming(false)
      }
    },
    [session, conversationId, isStreaming, queryClient, onError, parseSSE, stopStreaming, enqueueText]
  )

  const regenerateLastMessage = useCallback(async () => {
    const messages =
      queryClient.getQueryData<Message[]>(['messages', conversationId]) || []

    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')

    if (lastUserMessage) {
      const lastAssistantIndex = messages.length - 1
      if (messages[lastAssistantIndex]?.role === 'assistant') {
        queryClient.setQueryData<Message[]>(['messages', conversationId], (old = []) =>
          old.slice(0, -1)
        )
      }

      await sendMessage(lastUserMessage.content)
    }
  }, [conversationId, queryClient, sendMessage])

  return {
    sendMessage,
    regenerateLastMessage,
    stopStreaming,
    isStreaming,
    streamingMessage,
    agentTrace,
    currentAgent,
    suggestions,
  }
}
