'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseSession } from '@/lib/supabase'
import { apiClient } from '@/lib/api-client'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get session from Supabase after OAuth redirect
        const session = await getSupabaseSession()
        
        if (session?.access_token) {
          // Store tokens
          apiClient.setTokens(session.access_token, session.refresh_token || '')
          
          // Redirect to dashboard or home
          router.push('/dashboard')
        } else {
          // No session, redirect to login
          router.push('/login?error=oauth_failed')
        }
      } catch (error) {
        console.error('OAuth callback error:', error)
        router.push('/login?error=oauth_failed')
      }
    }

    handleCallback()
  }, [router])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e78a53] mx-auto mb-4"></div>
        <p className="text-zinc-400">Completing sign in...</p>
      </div>
    </div>
  )
}
