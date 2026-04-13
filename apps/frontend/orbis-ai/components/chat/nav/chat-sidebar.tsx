'use client'

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageSquare, Plus, Search, Loader2, MoreHorizontal, Link2, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiClient } from '@/lib/api-client'
import { useAuth } from '@/hooks/use-auth'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface ChatSidebarProps {
  className?: string
  onConversationSelect?: () => void
}

export function ChatSidebar({ className, onConversationSelect }: ChatSidebarProps) {
  const { session } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')

  const [deletingConversationId, setDeletingConversationId] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(50)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const deferredSearch = useDeferredValue(search)

  const { data: conversations, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => apiClient.getConversations(),
    enabled: !!session?.access_token,
    staleTime: 0, // always consider stale so it refetches on mount/focus
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 30 * 1000, // poll every 30s as fallback
  })

  const filtered = useMemo(() => {
    if (!conversations) return []
    if (!deferredSearch.trim()) return conversations
    return conversations.filter((c) =>
      c.title.toLowerCase().includes(deferredSearch.trim().toLowerCase())
    )
  }, [conversations, deferredSearch])

  const visibleConversations = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount]
  )

  useEffect(() => {
    setVisibleCount(50)
  }, [deferredSearch])

  useEffect(() => {
    const target = loadMoreRef.current
    if (!target) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry?.isIntersecting) {
          setVisibleCount((current) => Math.min(current + 50, filtered.length))
        }
      },
      {
        root: null,
        rootMargin: '120px',
        threshold: 0,
      }
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [filtered.length])

  const handleCreate = async () => {
    router.push('/chat')
  }

  const handleCopyConversationLink = async (conversationId: string) => {
    const url = `${window.location.origin}/chat/${conversationId}`
    await navigator.clipboard.writeText(url)
  }

  const handleDeleteConversation = async (conversationId: string) => {
    if (deletingConversationId) return

    const confirmed = window.confirm('Delete this conversation? This action cannot be undone.')
    if (!confirmed) return

    setDeletingConversationId(conversationId)
    try {
      await apiClient.deleteConversation(conversationId)
      await queryClient.invalidateQueries({ queryKey: ['conversations'] })

      if (pathname === `/chat/${conversationId}`) {
        router.push('/chat')
      }
    } catch (err) {
      console.error('[Sidebar] Failed to delete conversation:', err)
      window.alert('Failed to delete conversation. Please try again.')
    } finally {
      setDeletingConversationId(null)
    }
  }

  return (
    <aside className={cn('flex h-full w-full flex-col', className)} aria-label="Conversations sidebar">
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Conversations</h2>
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <button
                onClick={handleCreate}
                className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                aria-label="Create new conversation"
              >
                <Plus className="h-3.5 w-3.5" />
                New
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Create new conversation</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations"
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            aria-label="Search conversations"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isLoading && (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            No conversations yet. Start a new chat.
          </div>
        )}

        <div className="space-y-1" role="list" aria-label="Conversation list">
          {visibleConversations.map((conversation) => {
            const active = pathname === `/chat/${conversation.id}`
            const createdAt = new Date(conversation.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })

            return (
              <div
                key={conversation.id}
                className={cn(
                  'group flex items-center gap-1 rounded-lg text-sm transition-colors',
                  active ? 'bg-primary/15 text-primary' : 'text-foreground hover:bg-muted/60'
                )}
              >
                <Link
                  href={`/chat/${conversation.id}`}
                  onClick={onConversationSelect}
                  className="flex min-h-11 min-w-0 flex-1 items-center gap-3 px-3 py-2"
                  aria-current={active ? 'page' : undefined}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-medium">{conversation.title}</div>
                    <div className="text-xs text-muted-foreground">{createdAt}</div>
                  </div>
                </Link>
                <DropdownMenu>
                  <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          aria-label={`Conversation actions for ${conversation.title}`}
                          className="mr-1 inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground opacity-100 transition-opacity hover:bg-muted hover:text-foreground md:h-7 md:w-7 md:opacity-0 md:group-hover:opacity-100 data-[state=open]:opacity-100"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Conversation actions</p>
                    </TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem disabled>Rename</DropdownMenuItem>
                    <DropdownMenuItem disabled>Duplicate</DropdownMenuItem>
                    <DropdownMenuItem disabled>Archive</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleCopyConversationLink(conversation.id)}>
                      <Link2 className="h-4 w-4" />
                      Copy link
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      disabled={deletingConversationId === conversation.id}
                      onSelect={(e) => {
                        e.preventDefault()
                        handleDeleteConversation(conversation.id)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {deletingConversationId === conversation.id && (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                )}
              </div>
            )
          })}
          {filtered.length > visibleConversations.length && (
            <div ref={loadMoreRef} className="flex items-center justify-center py-2 text-xs text-muted-foreground" role="status" aria-live="polite">
              Loading more conversations...
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
