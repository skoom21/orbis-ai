import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import { Message } from './message';
import {
  buildMessageTree,
  getSelectedBranchIds,
  ROOT_PARENT_KEY,
} from './message-tree';
import type { ChatMessage } from '../types';
import { useChatSettingsContext } from '../providers';

interface MessagesViewProps {
  messages: ChatMessage[];
  isStreaming?: boolean;
  streamingMessage?: string;
  onRegenerate?: () => void;
  onEditResubmit?: (messageId: string, content: string) => void;
  onContinue?: (messageId: string, content: string) => void;
  onFork?: (messageId: string, content: string) => void;
  onFeedback?: (messageId: string, feedback: 'up' | 'down') => void;
  emptyState?: React.ReactNode;
}

export function MessagesView({
  messages,
  isStreaming = false,
  streamingMessage,
  onRegenerate,
  onEditResubmit,
  onContinue,
  onFork,
  onFeedback,
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
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    } else {
      el.scrollTop = el.scrollHeight;
    }
  }, [visibleMessages.length, streamingMessage, autoScrollEnabled, isAtBottom])

  const handleScroll = () => {
    if (scrollFrameRef.current !== null) return

    scrollFrameRef.current = requestAnimationFrame(() => {
      scrollFrameRef.current = null

    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;

    const atBottom = distanceFromBottom <= 24
    setIsAtBottom(atBottom)

    if (scrollVisibilityTimeoutRef.current) {
      clearTimeout(scrollVisibilityTimeoutRef.current)
    }

    scrollVisibilityTimeoutRef.current = setTimeout(() => {
      setShowScroll(distanceFromBottom > 120)
    }, 100)

    if (streamingMessage && distanceFromBottom > 120) {
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
        className="flex-1 overflow-y-auto p-4 space-y-4"
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
        aria-relevant="additions text"
        aria-busy={Boolean(streamingMessage)}
      >
      {visibleMessages.length === 0 && !streamingMessage && (
        <div className="flex h-full items-center justify-center text-muted-foreground" role="status" aria-live="polite">
          {emptyState || 'No messages yet. Start the conversation!'}
        </div>
      )}
      {visibleMessages.map((msg) => {
        const siblingMeta = getSiblingMeta(msg.id)
        return (
          <Message 
            key={msg.id} 
            id={msg.id}
            role={msg.role} 
            content={msg.content} 
            createdAt={msg.created_at}
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
      })}
      {isStreaming && (
        <Message 
          role="assistant" 
          content={streamingMessage || ''} 
          createdAt={new Date().toISOString()}
          isStreaming
        />
      )}
      <div className="sr-only" aria-live="polite">
        {streamingMessage ? 'Assistant is generating a response.' : 'Assistant response complete.'}
      </div>
      <div ref={bottomRef} />
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
          className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card shadow-lg hover:bg-muted transition-colors"
          aria-label="Scroll to latest"
        >
          <ArrowDown className="h-4 w-4 text-foreground" />
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          const next = !autoScrollEnabled
          setAutoScrollEnabled(next)
          setSetting('autoScroll', next)
          if (next && scrollRef.current) {
            scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
          }
        }}
        className="absolute bottom-16 right-4 rounded-md border border-border bg-card px-2 py-1 text-[10px] text-muted-foreground hover:bg-muted"
        aria-label={autoScrollEnabled ? 'Disable auto-scroll' : 'Enable auto-scroll'}
      >
        Auto: {autoScrollEnabled ? 'On' : 'Off'}
      </button>
    </div>
  );
}
