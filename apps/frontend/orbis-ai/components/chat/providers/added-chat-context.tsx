'use client'

import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'

interface AddedChatContextValue {
  isSubmittingAdditional: boolean
  setIsSubmittingAdditional: (value: boolean) => void
}

const AddedChatContext = createContext<AddedChatContextValue | null>(null)

interface AddedChatProviderProps {
  value: AddedChatContextValue
  children: ReactNode
}

export function AddedChatProvider({ value, children }: AddedChatProviderProps) {
  return <AddedChatContext.Provider value={value}>{children}</AddedChatContext.Provider>
}

export function useAddedChatContext() {
  const context = useContext(AddedChatContext)
  if (!context) {
    throw new Error('useAddedChatContext must be used within AddedChatProvider')
  }
  return context
}

export { AddedChatContext }
