 'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { ChatSidebar } from '@/components/chat/nav/chat-sidebar'
import { cn } from '@/lib/utils'

export default function ChatLayout({ children }: { children: ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    if (!mobileNavOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileNavOpen(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [mobileNavOpen])

  return (
    <div className="h-screen bg-background">
      <div className="mx-auto flex h-full w-full max-w-7xl flex-col px-4 py-4 lg:py-6">
        <div className="mb-3 flex items-center justify-between lg:hidden">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground"
            aria-label="Open chat sidebar"
            aria-expanded={mobileNavOpen}
            aria-controls="mobile-chat-sidebar"
          >
            <Menu className="h-4 w-4" />
          </button>
          <Link
            href="/chat"
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            New Chat
          </Link>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[280px_1fr] lg:gap-6">
          <div className="hidden min-h-0 lg:block">
            <ChatSidebar />
          </div>
          <div className="min-h-0">{children}</div>
        </div>

        <div
          className={cn(
            'fixed inset-0 z-50 transition-all duration-200 lg:hidden',
            mobileNavOpen ? 'pointer-events-auto' : 'pointer-events-none'
          )}
          role="dialog"
          aria-modal="true"
          aria-hidden={!mobileNavOpen}
          aria-labelledby="mobile-chat-sidebar-title"
        >
          <button
            className={cn(
              'absolute inset-0 bg-black/40 backdrop-blur-[1px] transition-opacity duration-200',
              mobileNavOpen ? 'opacity-100' : 'opacity-0'
            )}
            aria-label="Close chat sidebar overlay"
            onClick={() => setMobileNavOpen(false)}
          />
          <div
            id="mobile-chat-sidebar"
            className={cn(
              'absolute left-0 top-0 h-full w-[88%] max-w-sm border-r border-border bg-background p-3 shadow-2xl transition-transform duration-200',
              mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
            )}
          >
            <h2 id="mobile-chat-sidebar-title" className="sr-only">Mobile conversations sidebar</h2>
            <div className="mb-2 flex items-center justify-end">
              <button
                onClick={() => setMobileNavOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-foreground"
                aria-label="Close chat sidebar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="h-[calc(100%-2.75rem)]">
              <ChatSidebar onConversationSelect={() => setMobileNavOpen(false)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
