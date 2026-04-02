'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

const CHAT_SETTINGS_STORAGE_KEY = 'orbis-chat-settings'

export interface ChatSettings {
  enterToSend: boolean
  maximizeChat: boolean
  autoScroll: boolean
  slashCommands: boolean
  mentionCommands: boolean
  plusCommands: boolean
  voiceInput: boolean
  voiceAutoSend: boolean
  showLandingStarters: boolean
  centerLandingComposer: boolean
}

const DEFAULT_CHAT_SETTINGS: ChatSettings = {
  enterToSend: true,
  maximizeChat: false,
  autoScroll: true,
  slashCommands: true,
  mentionCommands: true,
  plusCommands: true,
  voiceInput: true,
  voiceAutoSend: false,
  showLandingStarters: true,
  centerLandingComposer: true,
}

interface ChatSettingsContextValue {
  settings: ChatSettings
  setSetting: <K extends keyof ChatSettings>(key: K, value: ChatSettings[K]) => void
  resetSettings: () => void
}

const ChatSettingsContext = createContext<ChatSettingsContextValue | null>(null)

interface ChatSettingsProviderProps {
  children: ReactNode
}

export function ChatSettingsProvider({ children }: ChatSettingsProviderProps) {
  const [settings, setSettings] = useState<ChatSettings>(DEFAULT_CHAT_SETTINGS)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const raw = window.localStorage.getItem(CHAT_SETTINGS_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ChatSettings>
        setSettings({
          ...DEFAULT_CHAT_SETTINGS,
          ...parsed,
        })
      }
    } catch {
      setSettings(DEFAULT_CHAT_SETTINGS)
    } finally {
      setHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return
    try {
      window.localStorage.setItem(CHAT_SETTINGS_STORAGE_KEY, JSON.stringify(settings))
    } catch {
      // ignore localStorage issues
    }
  }, [hydrated, settings])

  const setSetting = <K extends keyof ChatSettings>(key: K, nextValue: ChatSettings[K]) => {
    setSettings((current) => ({
      ...current,
      [key]: nextValue,
    }))
  }

  const resetSettings = () => {
    setSettings(DEFAULT_CHAT_SETTINGS)
  }

  const value = useMemo(
    () => ({
      settings,
      setSetting,
      resetSettings,
    }),
    [settings]
  )

  return <ChatSettingsContext.Provider value={value}>{children}</ChatSettingsContext.Provider>
}

export function useChatSettingsContext() {
  const context = useContext(ChatSettingsContext)
  if (!context) {
    throw new Error('useChatSettingsContext must be used within ChatSettingsProvider')
  }
  return context
}

export { ChatSettingsContext }
