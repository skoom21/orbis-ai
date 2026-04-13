'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { ChatSidebar } from '@/components/chat/nav/chat-sidebar'
import { cn } from '@/lib/utils'

export default function ChatLayout({ children }: { children: ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    const handleToggle = () => setMobileNavOpen(true)
    document.addEventListener('toggle-mobile-sidebar', handleToggle)
    return () => document.removeEventListener('toggle-mobile-sidebar', handleToggle)
  }, [])

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
    <div className="h-screen w-full bg-background overflow-hidden flex relative">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex w-[260px] h-full flex-col shrink-0 border-r border-border bg-muted/20 overflow-hidden">
        <ChatSidebar className="bg-transparent" />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 h-full relative overflow-hidden">
        <div className="flex-1 min-h-0 h-full flex flex-col overflow-hidden bg-background">
          {children}
        </div>

        {/* Mobile Sidebar Overlay */}
        <div
          className={cn(
            'fixed inset-0 z-[100] transition-all duration-300 lg:hidden',
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
