'use client'

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { DraftAttachment } from '../types'

const DRAFT_STORAGE_PREFIX = 'orbis-chat-draft'
const PENDING_DRAFT_KEY = `${DRAFT_STORAGE_PREFIX}:__pending__`

interface PersistedDraftAttachment {
  id: string
  name: string
  size: number
  type: string
  status: 'uploading' | 'ready' | 'failed'
  progress: number
  error?: string
}

interface PersistedDraft {
  draft: string
  attachments: PersistedDraftAttachment[]
  updatedAt: number
}

interface ChatFormContextValue {
  draft: string
  setDraft: Dispatch<SetStateAction<string>>
  attachments: DraftAttachment[]
  setAttachments: Dispatch<SetStateAction<DraftAttachment[]>>
}

const ChatFormContext = createContext<ChatFormContextValue | null>(null)

interface ChatFormProviderProps {
  conversationId?: string
  children: ReactNode
}

export function ChatFormProvider({ conversationId, children }: ChatFormProviderProps) {
  const [draft, setDraft] = useState('')
  const [attachments, setAttachments] = useState<DraftAttachment[]>([])
  const hydratedRef = useRef(false)

  const storageKey = `${DRAFT_STORAGE_PREFIX}:${conversationId || '__pending__'}`

  useEffect(() => {
    hydratedRef.current = false

    if (typeof window === 'undefined') {
      hydratedRef.current = true
      return
    }

    let restoredValue: PersistedDraft | null = null

    try {
      const raw = window.localStorage.getItem(storageKey)
      if (raw) {
        restoredValue = JSON.parse(raw) as PersistedDraft
      } else if (conversationId) {
        const pendingRaw = window.localStorage.getItem(PENDING_DRAFT_KEY)
        if (pendingRaw) {
          restoredValue = JSON.parse(pendingRaw) as PersistedDraft
          window.localStorage.setItem(storageKey, pendingRaw)
          window.localStorage.removeItem(PENDING_DRAFT_KEY)
        }
      }
    } catch {
      restoredValue = null
    }

    if (!restoredValue) {
      setDraft('')
      setAttachments([])
      hydratedRef.current = true
      return
    }

    setDraft(restoredValue.draft || '')
    setAttachments(
      (restoredValue.attachments || []).map((attachment) => ({
        ...attachment,
        status: 'failed',
        progress: 0,
        requiresReattach: true,
        error: attachment.error || 'Please reattach this file before sending.',
      }))
    )

    hydratedRef.current = true
  }, [conversationId, storageKey])

  useEffect(() => {
    if (!hydratedRef.current || typeof window === 'undefined') return

    const timeout = window.setTimeout(() => {
      const payload: PersistedDraft = {
        draft,
        attachments: attachments.map((attachment) => ({
          id: attachment.id,
          name: attachment.name,
          size: attachment.size,
          type: attachment.type,
          status: attachment.status,
          progress: attachment.progress,
          error: attachment.error,
        })),
        updatedAt: Date.now(),
      }

      try {
        if (!payload.draft.trim() && payload.attachments.length === 0) {
          window.localStorage.removeItem(storageKey)
        } else {
          window.localStorage.setItem(storageKey, JSON.stringify(payload))
        }
      } catch {
        // Ignore localStorage quota/access issues
      }
    }, 250)

    return () => window.clearTimeout(timeout)
  }, [attachments, draft, storageKey])

  const value = useMemo(
    () => ({
      draft,
      setDraft,
      attachments,
      setAttachments,
    }),
    [draft, attachments]
  )

  return <ChatFormContext.Provider value={value}>{children}</ChatFormContext.Provider>
}

export function useChatFormContext() {
  const context = useContext(ChatFormContext)
  if (!context) {
    throw new Error('useChatFormContext must be used within ChatFormProvider')
  }
  return context
}

export { ChatFormContext }
