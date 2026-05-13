import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, Loader2 } from 'lucide-react';
import { Message } from './message';
import { AgentTrace } from './agent-trace';
import { ActionChips } from './action-chips';
import { InlineTravelForm, detectInlineFormType, type InlineFormType } from './inline-travel-form';
import {
  buildMessageTree,
  getSelectedBranchIds,
  ROOT_PARENT_KEY,
} from './message-tree';
import type { ChatMessage } from '../types';
import { useChatSettingsContext } from '../providers';
import type { AgentTraceStep } from '@/hooks/use-chat-stream';

interface MessagesViewProps {
  messages: ChatMessage[];
  isStreaming?: boolean;
  streamingMessage?: string;
  agentTrace?: AgentTraceStep[];
  currentAgent?: string | null;
  suggestions?: string[];
  onRegenerate?: () => void;
  onEditResubmit?: (messageId: string, content: string) => void;
  onContinue?: (messageId: string, content: string) => void;
  onFork?: (messageId: string, content: string) => void;
  onFeedback?: (messageId: string, feedback: 'up' | 'down') => void;
  onSendMessage?: (message: string) => void;
  emptyState?: React.ReactNode;
}

export function MessagesView({
  messages,
  isStreaming = false,
  streamingMessage,
  agentTrace = [],
  suggestions = [],
  onRegenerate,
  onEditResubmit,
  onContinue,
  onFork,
  onFeedback,
  onSendMessage,
  emptyState,
}: MessagesViewProps) {
  const { settings, setSetting } = useChatSettingsContext()
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollVisibilityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrollFrameRef = useRef<number | null>(null)
  const [showScroll, setShowScroll] = useState(false);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(settings.autoScroll)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [selectedSiblingByParent, setSelectedSiblingByParent] = useState<Record<string, number>>({})
  const [dismissedFormKey, setDismissedFormKey] = useState<string | null>(null)

  // Listen for form submissions dispatched by DynamicTravelForm inside message content
  const onSendMessageRef = useRef(onSendMessage)
  onSendMessageRef.current = onSendMessage
  useEffect(() => {
    const handler = (e: Event) => {
      const msg = (e as CustomEvent<{ message: string }>).detail?.message
      if (msg) onSendMessageRef.current?.(msg)
    }
    window.addEventListener('orbis:send-message', handler)
    return () => window.removeEventListener('orbis:send-message', handler)
  }, [])

  const tree = useMemo(() => buildMessageTree(messages || []), [messages])

  const branchMessageIds = useMemo(
    () => getSelectedBranchIds(tree, selectedSiblingByParent),
    [tree, selectedSiblingByParent]
  )

  const visibleMessages = useMemo(
    () =>
      branchMessageIds
        .map((messageId) => tree.nodesById[messageId]?.message)
        .filter((message): message is ChatMessage => Boolean(message)),
    [branchMessageIds, tree]
  )

  useEffect(() => {
    setAutoScrollEnabled(settings.autoScroll)
  }, [settings.autoScroll])

  useEffect(() => {
    const root = scrollRef.current
    const target = bottomRef.current
    if (!root || !target) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        const atBottom = Boolean(entry?.isIntersecting)
        setIsAtBottom(atBottom)
        if (atBottom) {
          setShowScroll(false)
        }
      },
      {
        root,
        threshold: 0.95,
      }
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    return () => {
      if (scrollVisibilityTimeoutRef.current) {
        clearTimeout(scrollVisibilityTimeoutRef.current)
      }
      if (scrollFrameRef.current !== null) {
        cancelAnimationFrame(scrollFrameRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!scrollRef.current) return
    if (!autoScrollEnabled && !isAtBottom) return

    const el = scrollRef.current;
    if (streamingMessage) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'auto' });
    } else {
      el.scrollTop = el.scrollHeight;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleMessages.length, streamingMessage])

  const handleScroll = () => {
    if (scrollFrameRef.current !== null) return

    scrollFrameRef.current = requestAnimationFrame(() => {
      scrollFrameRef.current = null

    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;

    const atBottom = distanceFromBottom <= 180
    setIsAtBottom(atBottom)

    if (scrollVisibilityTimeoutRef.current) {
      clearTimeout(scrollVisibilityTimeoutRef.current)
    }

    scrollVisibilityTimeoutRef.current = setTimeout(() => {
      setShowScroll(distanceFromBottom > 264)
    }, 100)

    if (streamingMessage && distanceFromBottom > 264) {
      setAutoScrollEnabled(false)
      setSetting('autoScroll', false)
    }
    })
  };

  const getSiblingMeta = (messageId: string) => {
    const node = tree.nodesById[messageId]
    if (!node) return { siblingIndex: 1, siblingCount: 1 }

    const siblings = node.parentId ? tree.nodesById[node.parentId]?.childrenIds || [] : tree.rootIds
    const siblingCount = siblings.length || 1
    const siblingIndex = Math.max(siblings.indexOf(messageId), 0) + 1

    return { siblingIndex, siblingCount }
  }

  const cycleSibling = (messageId: string, direction: -1 | 1) => {
    const node = tree.nodesById[messageId]
    if (!node) return

    const siblings = node.parentId ? tree.nodesById[node.parentId]?.childrenIds || [] : tree.rootIds
    if (siblings.length <= 1) return

    const currentIndex = Math.max(siblings.indexOf(messageId), 0)
    const nextIndex = (currentIndex + direction + siblings.length) % siblings.length
    const parentKey = node.parentId || ROOT_PARENT_KEY

    setSelectedSiblingByParent((current) => ({
      ...current,
      [parentKey]: nextIndex,
    }))
  }

  return (
    <div className="relative flex h-full w-full flex-1 flex-col overflow-hidden">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto flex flex-col pt-4 sm:pt-6 [overflow-anchor:none]"
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
        aria-relevant="additions text"
        aria-busy={Boolean(streamingMessage)}
      >
      {visibleMessages.length === 0 && !streamingMessage ? (
        <div className="flex w-full flex-col items-center justify-start text-muted-foreground mt-4 sm:mt-8 lg:mt-16 mb-8" role="status" aria-live="polite">
          {emptyState || 'No messages yet. Start the conversation!'}
        </div>
      ) : (
        <div className="mt-auto flex flex-col gap-8 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          {visibleMessages.map((msg, index) => {
            const siblingMeta = getSiblingMeta(msg.id)
            const msgDate = new Date(msg.created_at || Date.now());
            const isToday = msgDate.toDateString() === new Date().toDateString();
            const dateLabel = isToday ? 'Today' : msgDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
            
            let showDateHeader = false;
            if (index === 0) {
              showDateHeader = true;
            } else {
              const prevMsgDate = new Date(visibleMessages[index - 1].created_at || Date.now());
              if (msgDate.toDateString() !== prevMsgDate.toDateString()) {
                showDateHeader = true;
              }
            }

            const isLastMessage = index === visibleMessages.length - 1
            const showChips = isLastMessage && msg.role === 'assistant' && !isStreaming && suggestions.length > 0

            return (
              <React.Fragment key={msg.id}>
                {showDateHeader && (
                  <div className="sticky top-2 z-10 mx-auto flex w-fit items-center justify-center rounded-full bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur-md border border-border/50 shadow-sm">
                    {dateLabel}
                  </div>
                )}
                {(() => {
                  const inlineFormType: InlineFormType =
                    isLastMessage && !isStreaming && onSendMessage && dismissedFormKey !== msg.id
                      ? detectInlineFormType(msg.content)
                      : null

                  const inlineForm = inlineFormType ? (
                    <InlineTravelForm
                      type={inlineFormType}
                      onSubmit={(m) => { setDismissedFormKey(msg.id); onSendMessage!(m) }}
                      className={inlineFormType === 'trip-planner' ? 'max-w-lg' : 'max-w-xs'}
                    />
                  ) : null

                  return (
                    <Message
                      key={msg.id}
                      id={msg.id}
                      role={msg.role}
                      content={msg.content}
                      createdAt={msg.created_at}
                      footer={inlineForm}
                      onRegenerate={onRegenerate}
                      onEditResubmit={onEditResubmit}
                      onContinue={onContinue}
                      onFork={onFork}
                      onFeedback={onFeedback}
                      siblingIndex={siblingMeta.siblingIndex}
                      siblingCount={siblingMeta.siblingCount}
                      onPrevSibling={() => cycleSibling(msg.id, -1)}
                      onNextSibling={() => cycleSibling(msg.id, 1)}
                    />
                  )
                })()}
                {showChips && onSendMessage && (
                  <ActionChips chips={suggestions} onSelect={onSendMessage} />
                )}
              </React.Fragment>
            )
          })}
          {isStreaming && (
            <div className="flex flex-col gap-2">
              {/* Live agent-activity trace — collapses once text starts flowing */}
              {agentTrace.length > 0 && (
                <AgentTrace
                  steps={agentTrace}
                  isStreaming={isStreaming}
                  hasContent={!!streamingMessage}
                />
              )}

              {/* Thinking placeholder: only shown before the first trace step
                  or token arrives — avoids double-loader with Message's own
                  three-dot animation */}
              {!streamingMessage && agentTrace.length === 0 && (
                <div className="flex items-center gap-2 px-1 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  <span className="animate-pulse">Thinking…</span>
                </div>
              )}

              {/* Only render the message bubble once there is actual text —
                  this prevents Message's own empty-content three-dot loader
                  from appearing alongside the trace/thinking states above */}
              {streamingMessage && (
                <Message
                  role="assistant"
                  content={streamingMessage}
                  createdAt={new Date().toISOString()}
                  isStreaming
                />
              )}
            </div>
          )}
          <div className="sr-only" aria-live="polite">
            {streamingMessage ? 'Assistant is generating a response.' : 'Assistant response complete.'}
          </div>
          <div ref={bottomRef} className="h-4" />
        </div>
      )}
      </div>
      {showScroll && (
        <button
          type="button"
          onClick={() => {
            setAutoScrollEnabled(true)
            setSetting('autoScroll', true)
            if (scrollRef.current) {
              scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
            }
          }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center justify-center gap-2 rounded-full border border-border bg-background/90 px-4 py-2 text-sm font-medium text-foreground shadow-lg backdrop-blur-xl hover:bg-muted/80 transition-all z-20"
          aria-label="Scroll to latest"
        >
          <ArrowDown className="h-4 w-4" />
          <span>New messages ↓</span>
        </button>
      )}
    </div>
  );
}
