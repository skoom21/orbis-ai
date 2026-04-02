/**
 * API Client for Orbis AI Backend
 * 
 * Handles all HTTP requests with authentication.
 * Rebuilt from scratch with comprehensive error handling.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ============== Types ==============

export interface ApiError {
  error: string
  code: string
  detail?: string
  status?: number
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  full_name: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

export interface UserResponse {
  id: string
  email: string
  full_name: string
  role: string
  is_active: boolean
  email_verified: boolean
  created_at?: string
}

export interface MessageResponse {
  message: string
  code?: string
}

export interface ChatConversation {
  id: string
  title: string
  created_at: string
  updated_at?: string
  user_id: string
}

export interface ChatMessage {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
  parent_message_id?: string | null
  metadata?: Record<string, unknown>
}

export interface ConversationListOptions {
  limit?: number
  search?: string
}

export interface ChatStreamRequest {
  message: string
  conversation_id?: string
  parent_message_id?: string
  model?: string
}

export interface ConversationExportData {
  conversation: ChatConversation
  messages: ChatMessage[]
}

// ============== API Client Class ==============

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  // ---------- Token Management ----------

  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('orbis_access_token')
  }

  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('orbis_refresh_token')
  }

  setTokens(accessToken: string, refreshToken: string): void {
    if (typeof window === 'undefined') return
    localStorage.setItem('orbis_access_token', accessToken)
    localStorage.setItem('orbis_refresh_token', refreshToken)
    console.log('[API] Tokens stored')
  }

  clearTokens(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem('orbis_access_token')
    localStorage.removeItem('orbis_refresh_token')
    console.log('[API] Tokens cleared')
  }

  private getAuthHeader(): HeadersInit {
    const token = this.getAccessToken()
    if (token) {
      return { Authorization: `Bearer ${token}` }
    }
    return {}
  }

  // ---------- Core Request Methods ----------

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const isFormDataBody = typeof FormData !== 'undefined' && options.body instanceof FormData
    const headers: HeadersInit = {
      ...(isFormDataBody ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    }

    console.log(`[API] ${options.method || 'GET'} ${endpoint}`)

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      // Parse response
      const contentType = response.headers.get('content-type')
      let data: any = null
      
      if (contentType?.includes('application/json')) {
        data = await response.json()
      }

      // Handle errors
      if (!response.ok) {
        const error: ApiError = {
          error: data?.error || data?.detail?.error || 'Request failed',
          code: data?.code || data?.detail?.code || 'UNKNOWN_ERROR',
          detail: typeof data?.detail === 'string' ? data.detail : undefined,
          status: response.status,
        }
        
        console.error(`[API] Error ${response.status}:`, error)
        throw error
      }

      return data as T
      
    } catch (error) {
      // Re-throw ApiError as-is
      if ((error as ApiError).status !== undefined) {
        throw error
      }
      
      // Handle network errors
      console.error('[API] Network error:', error)
      throw {
        error: 'Network error',
        code: 'NETWORK_ERROR',
        detail: error instanceof Error ? error.message : 'Unknown error',
        status: 0,
      } as ApiError
    }
  }

  private async authenticatedRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getAccessToken()
    
    if (!token) {
      console.log('[API] No access token available')
      throw {
        error: 'Not authenticated',
        code: 'NOT_AUTHENTICATED',
        status: 401,
      } as ApiError
    }

    try {
      return await this.request<T>(endpoint, {
        ...options,
        headers: {
          ...options.headers,
          ...this.getAuthHeader(),
        },
      })
    } catch (error) {
      const apiError = error as ApiError
      
      // If 401, try to refresh token
      if (apiError.status === 401) {
        console.log('[API] Token expired, attempting refresh...')
        
        const refreshed = await this.refreshToken()
        
        if (refreshed) {
          console.log('[API] Token refreshed, retrying request...')
          return await this.request<T>(endpoint, {
            ...options,
            headers: {
              ...options.headers,
              ...this.getAuthHeader(),
            },
          })
        } else {
          console.log('[API] Token refresh failed, clearing tokens')
          this.clearTokens()
        }
      }
      
      throw error
    }
  }

  // ---------- Auth Endpoints ----------

  async register(data: RegisterRequest): Promise<UserResponse> {
    console.log('[API] Registering user:', data.email)
    
    const response = await this.request<UserResponse>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    
    console.log('[API] Registration successful')
    return response
  }

  async login(data: LoginRequest): Promise<TokenResponse> {
    console.log('[API] Logging in:', data.email)
    
    const response = await this.request<TokenResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    
    // Store tokens
    this.setTokens(response.access_token, response.refresh_token)
    
    console.log('[API] Login successful')
    return response
  }

  async logout(): Promise<MessageResponse> {
    console.log('[API] Logging out')
    
    try {
      const response = await this.authenticatedRequest<MessageResponse>(
        '/api/v1/auth/logout',
        { method: 'POST' }
      )
      return response
    } finally {
      // Always clear tokens
      this.clearTokens()
    }
  }

  async refreshToken(): Promise<boolean> {
    const refreshToken = this.getRefreshToken()
    
    if (!refreshToken) {
      console.log('[API] No refresh token available')
      return false
    }

    try {
      const response = await this.request<TokenResponse>('/api/v1/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken }),
      })

      this.setTokens(response.access_token, response.refresh_token)
      console.log('[API] Token refresh successful')
      return true
      
    } catch (error) {
      console.error('[API] Token refresh failed:', error)
      this.clearTokens()
      return false
    }
  }

  async getCurrentUser(): Promise<UserResponse> {
    console.log('[API] Getting current user')
    return this.authenticatedRequest<UserResponse>('/api/v1/auth/me', {
      method: 'GET',
    })
  }

  async requestPasswordReset(email: string): Promise<MessageResponse> {
    return this.request<MessageResponse>('/api/v1/auth/password-reset', {
      method: 'POST',
      body: JSON.stringify(email),
    })
  }

  // ---------- Chat & Conversations ----------

  async createConversation(title?: string): Promise<ChatConversation> {
    console.log('[API] Creating new conversation')
    return this.authenticatedRequest('/api/v1/conversations', {
      method: 'POST',
      body: JSON.stringify({ title: title || 'New Conversation' }),
    })
  }

  async getConversation(conversationId: string): Promise<ChatConversation> {
    return this.authenticatedRequest(`/api/v1/conversations/${conversationId}`, {
      method: 'GET',
    })
  }

  async getConversations(options?: ConversationListOptions): Promise<ChatConversation[]> {
    const params = new URLSearchParams()
    if (options?.limit) {
      params.set('limit', String(options.limit))
    }

    const endpoint = `/api/v1/conversations${params.toString() ? `?${params.toString()}` : ''}`
    const conversations = await this.authenticatedRequest<ChatConversation[]>(endpoint, {
      method: 'GET',
    })

    if (!options?.search?.trim()) {
      return conversations
    }

    const searchTerm = options.search.trim().toLowerCase()
    return conversations.filter((conversation) => conversation.title.toLowerCase().includes(searchTerm))
  }

  async searchConversations(query: string, limit = 100): Promise<ChatConversation[]> {
    return this.getConversations({ search: query, limit })
  }

  async getMessages(conversationId: string, limit = 100): Promise<ChatMessage[]> {
    return this.authenticatedRequest(`/api/v1/conversations/${conversationId}/messages?limit=${limit}`, {
      method: 'GET',
    })
  }

  async updateConversationTitle(conversationId: string, title: string): Promise<ChatConversation> {
    return this.authenticatedRequest(`/api/v1/conversations/${conversationId}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    })
  }

  async deleteConversation(conversationId: string): Promise<MessageResponse> {
    return this.authenticatedRequest(`/api/v1/conversations/${conversationId}`, {
      method: 'DELETE',
    })
  }

  async createChatStream(request: ChatStreamRequest, signal?: AbortSignal): Promise<Response> {
    const endpoint = '/api/v1/chat/stream'
    const makeRequest = async (token: string) => {
      return fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(request),
        signal,
      })
    }

    const token = this.getAccessToken()
    if (!token) {
      throw {
        error: 'Not authenticated',
        code: 'NOT_AUTHENTICATED',
        status: 401,
      } as ApiError
    }

    let response = await makeRequest(token)
    if (response.status === 401) {
      const refreshed = await this.refreshToken()
      if (refreshed) {
        const nextToken = this.getAccessToken()
        if (nextToken) {
          response = await makeRequest(nextToken)
        }
      }
    }

    return response
  }

  async uploadChatAttachment(file: File, conversationId?: string): Promise<{ id: string; name: string; url?: string }> {
    const formData = new FormData()
    formData.append('file', file)
    if (conversationId) {
      formData.append('conversation_id', conversationId)
    }

    return this.authenticatedRequest('/api/v1/chat/attachments', {
      method: 'POST',
      body: formData,
    })
  }

  async getConversationExportData(conversationId: string): Promise<ConversationExportData> {
    const [conversation, messages] = await Promise.all([
      this.getConversation(conversationId),
      this.getMessages(conversationId, 200),
    ])

    return { conversation, messages }
  }

  async exportConversationAsJson(conversationId: string): Promise<string> {
    const payload = await this.getConversationExportData(conversationId)
    return JSON.stringify(payload, null, 2)
  }

  async exportConversationAsMarkdown(conversationId: string): Promise<string> {
    const payload = await this.getConversationExportData(conversationId)
    const header = [`# ${payload.conversation.title}`, '', `Conversation ID: ${payload.conversation.id}`, '']
    const messageBlocks = payload.messages.map((message) => {
      const roleLabel = message.role.charAt(0).toUpperCase() + message.role.slice(1)
      return [`## ${roleLabel}`, '', message.content, ''].join('\n')
    })
    return [...header, ...messageBlocks].join('\n')
  }

  getConversationShareLink(conversationId: string, origin?: string): string {
    if (origin) {
      return `${origin}/chat/${conversationId}`
    }

    if (typeof window !== 'undefined') {
      return `${window.location.origin}/chat/${conversationId}`
    }

    return `/chat/${conversationId}`
  }

  // ---------- Health Check ----------

  async healthCheck(): Promise<{ status: string }> {
    return this.request('/health/', { method: 'GET' })
  }
}

// Export singleton instance
export const apiClient = new ApiClient()

// Type guard for ApiError
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'error' in error &&
    'code' in error
  )
}

// Export class for testing
export default ApiClient
