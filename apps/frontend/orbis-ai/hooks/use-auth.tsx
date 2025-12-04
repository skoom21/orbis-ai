/**
 * Authentication Context Provider
 * Manages authentication state across the application
 */

'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { apiClient, UserResponse } from '@/lib/api-client'
import { getSupabaseSession, onAuthStateChange } from '@/lib/supabase'

interface AuthContextType {
  user: UserResponse | null
  loading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, fullName: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null)
  const [loading, setLoading] = useState(true)

  /**
   * Fetch current user from API
   */
  const fetchUser = async () => {
    try {
      const accessToken = apiClient.getAccessToken()
      if (!accessToken) {
        setUser(null)
        return
      }

      const userData = await apiClient.getCurrentUser()
      setUser(userData)
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error fetching user:', {
          message: error.message,
          name: error.name,
        })
      } else {
        console.error('Error fetching user (unknown error):', error)
      }
      setUser(null)
      apiClient.clearTokens()
    }
  }

  /**
   * Initialize auth state on mount
   */
  useEffect(() => {
    const initAuth = async () => {
      setLoading(true)

      // Check for access token from our backend
      const accessToken = apiClient.getAccessToken()
      if (accessToken) {
        await fetchUser()
      } else {
        // Check for Supabase session (OAuth flow)
        const session = await getSupabaseSession()
        if (session?.access_token) {
          // Store Supabase token and fetch user
          apiClient.setTokens(session.access_token, session.refresh_token || '')
          await fetchUser()
        }
      }

      setLoading(false)
    }

    initAuth()

    // Listen to Supabase auth changes (for OAuth)
    const { data: authListener } = onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event)
      
      if (event === 'SIGNED_IN' && session) {
        // Store Supabase tokens
        apiClient.setTokens(session.access_token, session.refresh_token || '')
        await fetchUser()
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        apiClient.clearTokens()
      }
    })

    return () => {
      authListener?.subscription?.unsubscribe()
    }
  }, [])

  /**
   * Login with email/password
   */
  const login = async (email: string, password: string) => {
    try {
      await apiClient.login({ email, password })
      await fetchUser()
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  /**
   * Register new user
   */
  const register = async (email: string, password: string, fullName: string) => {
    try {
      const userData = await apiClient.register({
        email,
        password,
        full_name: fullName,
      })
      
      // After registration, login automatically
      await login(email, password)
    } catch (error) {
      console.error('Registration error:', error)
      throw error
    }
  }

  /**
   * Logout user
   */
  const logout = async () => {
    try {
      await apiClient.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
      apiClient.clearTokens()
    }
  }

  /**
   * Refresh user data
   */
  const refreshUser = async () => {
    await fetchUser()
  }

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Custom hook to use auth context
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
