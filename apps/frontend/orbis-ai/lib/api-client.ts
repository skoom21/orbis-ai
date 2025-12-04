/**
 * API Client for Orbis AI Backend
 * Handles all HTTP requests with authentication
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface ApiError {
  error: string
  message: string
  detail?: string
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
  created_at: string
  updated_at?: string
  email_verified: boolean
}

export interface MessageResponse {
  message: string
  detail?: string
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  /**
   * Get authorization header with JWT token
   */
  private getAuthHeader(): HeadersInit {
    const token = this.getAccessToken()
    if (token) {
      return {
        Authorization: `Bearer ${token}`,
      }
    }
    return {}
  }

  /**
   * Get access token from localStorage
   */
  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('access_token')
  }

  /**
   * Get refresh token from localStorage
   */
  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('refresh_token')
  }

  /**
   * Store tokens in localStorage
   */
  setTokens(accessToken: string, refreshToken: string): void {
    if (typeof window === 'undefined') return
    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('refresh_token', refreshToken)
  }

  /**
   * Clear tokens from localStorage
   */
  clearTokens(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  }

  /**
   * Make HTTP request with error handling
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      // Handle non-JSON responses
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        return {} as T
      }

      const data = await response.json()

      if (!response.ok) {
        throw data as ApiError
      }

      return data as T
    } catch (error) {
      // Log more detailed error information
      if (error instanceof Error) {
        console.error('API request failed:', {
          message: error.message,
          name: error.name,
          stack: error.stack,
          url,
          method: options.method,
        })
      } else {
        console.error('API request failed with unknown error:', error)
      }
      throw error
    }
  }

  /**
   * Make authenticated request with automatic token refresh
   */
  private async authenticatedRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      return await this.request<T>(endpoint, {
        ...options,
        headers: {
          ...options.headers,
          ...this.getAuthHeader(),
        },
      })
    } catch (error: any) {
      // If unauthorized, try to refresh token
      if (error.error === 'Unauthorized' || error.message?.includes('401')) {
        const refreshed = await this.refreshToken()
        if (refreshed) {
          // Retry with new token
          return await this.request<T>(endpoint, {
            ...options,
            headers: {
              ...options.headers,
              ...this.getAuthHeader(),
            },
          })
        }
      }
      throw error
    }
  }

  // ==================== Authentication APIs ====================

  /**
   * Register new user with email/password
   */
  async register(data: RegisterRequest): Promise<UserResponse> {
    return this.request<UserResponse>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * Login with email/password
   */
  async login(data: LoginRequest): Promise<TokenResponse> {
    const response = await this.request<TokenResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    
    // Store tokens
    this.setTokens(response.access_token, response.refresh_token)
    
    return response
  }

  /**
   * Logout current user
   */
  async logout(): Promise<MessageResponse> {
    try {
      const response = await this.authenticatedRequest<MessageResponse>(
        '/api/v1/auth/logout',
        {
          method: 'POST',
        }
      )
      return response
    } finally {
      // Always clear tokens even if logout fails
      this.clearTokens()
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<boolean> {
    const refreshToken = this.getRefreshToken()
    if (!refreshToken) {
      return false
    }

    try {
      const response = await this.request<TokenResponse>('/api/v1/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken }),
      })

      this.setTokens(response.access_token, response.refresh_token)
      return true
    } catch (error) {
      this.clearTokens()
      return false
    }
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<UserResponse> {
    return this.authenticatedRequest<UserResponse>('/api/v1/auth/me', {
      method: 'GET',
    })
  }

  /**
   * Update current user profile
   */
  async updateProfile(data: Partial<RegisterRequest>): Promise<UserResponse> {
    return this.authenticatedRequest<UserResponse>('/api/v1/auth/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<MessageResponse> {
    return this.request<MessageResponse>('/api/v1/auth/password-reset', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  }

  /**
   * Verify email
   */
  async verifyEmail(token: string): Promise<MessageResponse> {
    return this.request<MessageResponse>('/api/v1/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
  }

  // ==================== Health Check ====================

  /**
   * Check API health
   */
  async healthCheck(): Promise<{ status: string }> {
    return this.request('/health', {
      method: 'GET',
    })
  }
}

// Export singleton instance
export const apiClient = new ApiClient()

// Export class for testing
export default ApiClient
