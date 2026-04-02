'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { useAuth } from '@/hooks/use-auth'

export default function ChatIndexPage() {
  const { session } = useAuth()
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    if (!session?.access_token || isCreating) return
    const createConversation = async () => {
      setIsCreating(true)
      try {
        const convo = await apiClient.createConversation('New Trip Chat')
        router.push(`/chat/${convo.id}`)
      } finally {
        setIsCreating(false)
      }
    }

    createConversation()
  }, [session?.access_token, isCreating, router])

  return (
    <div className="flex h-full min-h-[60vh] items-center justify-center">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Preparing your chat...
      </div>
    </div>
  )
}
