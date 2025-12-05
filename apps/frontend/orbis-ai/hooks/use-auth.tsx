"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { createClient, Session, User as SupabaseUser } from "@supabase/supabase-js";
import { apiClient, isApiError, ApiError } from "@/lib/api-client";

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// ============================================================================
// TYPES
// ============================================================================

export interface AuthUser {
  id: string;
  email: string;
  full_name: string | null;
  email_verified: boolean;
  status?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
  last_login_at?: string;
}

export interface AuthState {
  user: AuthUser | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: AuthError | null;
}

export interface AuthError {
  message: string;
  code?: string;
  status?: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  full_name: string;
}

export interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: AuthError }>;
  register: (credentials: RegisterCredentials) => Promise<{ success: boolean; error?: AuthError }>;
  verifyOtp: (email: string, token: string) => Promise<{ success: boolean; error?: AuthError }>;
  resendOtp: (email: string) => Promise<{ success: boolean; error?: AuthError }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

// ============================================================================
// PASSWORD VALIDATION
// ============================================================================

export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
}

export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ============================================================================
// CONTEXT
// ============================================================================

const AuthContext = createContext<AuthContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,
  });

  // --------------------------------------------------------------------------
  // Helper: Update state safely
  // --------------------------------------------------------------------------
  const updateState = useCallback((updates: Partial<AuthState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  // --------------------------------------------------------------------------
  // Helper: Convert API/Supabase errors to AuthError
  // --------------------------------------------------------------------------
  const toAuthError = useCallback((error: unknown): AuthError => {
    if (isApiError(error)) {
      return {
        message: error.error || error.detail || "An error occurred",
        code: error.code,
        status: error.status,
      };
    }

    if (error && typeof error === "object") {
      const err = error as Record<string, unknown>;
      
      // Supabase error format
      if (typeof err.message === "string") {
        return {
          message: err.message,
          code: typeof err.code === "string" ? err.code : undefined,
          status: typeof err.status === "number" ? err.status : undefined,
        };
      }
    }

    if (error instanceof Error) {
      return { message: error.message };
    }

    return { message: "An unexpected error occurred" };
  }, []);

  // --------------------------------------------------------------------------
  // Fetch user profile from backend
  // --------------------------------------------------------------------------
  const fetchUserProfile = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const response = await apiClient.getCurrentUser();
      return {
        id: response.id,
        email: response.email,
        full_name: response.full_name,
        email_verified: response.email_verified,
        status: response.is_active ? "active" : "inactive",
        created_at: response.created_at,
      };
    } catch (error) {
      // 401 is expected when not authenticated - don't log as error
      if (isApiError(error) && error.status === 401) {
        return null;
      }
      // 404 means user exists in auth but not in public.users yet
      if (isApiError(error) && error.status === 404) {
        console.warn("User profile not found in database");
        return null;
      }
      console.error("Failed to fetch user profile:", error);
      return null;
    }
  }, []);

  // --------------------------------------------------------------------------
  // Handle session changes
  // --------------------------------------------------------------------------
  const handleSession = useCallback(
    async (session: Session | null) => {
      if (!session) {
        apiClient.clearTokens();
        updateState({
          user: null,
          session: null,
          isAuthenticated: false,
          isLoading: false,
        });
        return;
      }

      // Set the access token for API calls
      // Note: Supabase handles refresh tokens internally, we just store access token
      apiClient.setTokens(session.access_token, session.refresh_token);

      // Fetch user profile from backend
      const user = await fetchUserProfile();

      updateState({
        user,
        session,
        isAuthenticated: !!user,
        isLoading: false,
      });
    },
    [fetchUserProfile, updateState]
  );

  // --------------------------------------------------------------------------
  // Initialize auth state on mount
  // --------------------------------------------------------------------------
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Get current session
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Error getting session:", error.message);
          if (mounted) {
            updateState({ isLoading: false, error: toAuthError(error) });
          }
          return;
        }

        if (mounted) {
          await handleSession(data.session);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
        if (mounted) {
          updateState({ isLoading: false, error: toAuthError(error) });
        }
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state change:", event);

      if (!mounted) return;

      // Handle different auth events
      switch (event) {
        case "SIGNED_IN":
        case "TOKEN_REFRESHED":
        case "USER_UPDATED":
          await handleSession(session);
          break;

        case "SIGNED_OUT":
          apiClient.clearTokens();
          updateState({
            user: null,
            session: null,
            isAuthenticated: false,
            isLoading: false,
          });
          break;

        case "INITIAL_SESSION":
          // Already handled above
          break;

        default:
          console.log("Unhandled auth event:", event);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [handleSession, toAuthError, updateState]);

  // --------------------------------------------------------------------------
  // Login
  // --------------------------------------------------------------------------
  const login = useCallback(
    async (
      credentials: LoginCredentials
    ): Promise<{ success: boolean; error?: AuthError }> => {
      updateState({ isLoading: true, error: null });

      try {
        // Validate email
        if (!validateEmail(credentials.email)) {
          const error: AuthError = { message: "Please enter a valid email address" };
          updateState({ isLoading: false, error });
          return { success: false, error };
        }

        // Sign in with Supabase
        const { data, error: supabaseError } = await supabase.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        });

        if (supabaseError) {
          const error = toAuthError(supabaseError);
          updateState({ isLoading: false, error });
          return { success: false, error };
        }

        if (!data.session) {
          const error: AuthError = { message: "No session returned from login" };
          updateState({ isLoading: false, error });
          return { success: false, error };
        }

        // Session handling is done by onAuthStateChange
        return { success: true };
      } catch (error) {
        const authError = toAuthError(error);
        updateState({ isLoading: false, error: authError });
        return { success: false, error: authError };
      }
    },
    [toAuthError, updateState]
  );

  // --------------------------------------------------------------------------
  // Register
  // --------------------------------------------------------------------------
  const register = useCallback(
    async (
      credentials: RegisterCredentials
    ): Promise<{ success: boolean; error?: AuthError }> => {
      updateState({ isLoading: true, error: null });

      try {
        // Validate email
        if (!validateEmail(credentials.email)) {
          const error: AuthError = { message: "Please enter a valid email address" };
          updateState({ isLoading: false, error });
          return { success: false, error };
        }

        // Validate password
        const passwordValidation = validatePassword(credentials.password);
        if (!passwordValidation.isValid) {
          const error: AuthError = { message: passwordValidation.errors.join(". ") };
          updateState({ isLoading: false, error });
          return { success: false, error };
        }

        // Validate full name
        if (!credentials.full_name || credentials.full_name.trim().length < 2) {
          const error: AuthError = { message: "Please enter your full name" };
          updateState({ isLoading: false, error });
          return { success: false, error };
        }

        // Sign up with Supabase
        const { data, error: supabaseError } = await supabase.auth.signUp({
          email: credentials.email,
          password: credentials.password,
          options: {
            data: {
              full_name: credentials.full_name.trim(),
            },
          },
        });

        if (supabaseError) {
          const error = toAuthError(supabaseError);
          updateState({ isLoading: false, error });
          return { success: false, error };
        }

        // Check if user needs to confirm email
        if (data.user && !data.session) {
          // Send OTP code for verification (this sends an actual 6-digit code)
          await supabase.auth.signInWithOtp({
            email: credentials.email,
            options: {
              shouldCreateUser: false, // User already created above
            },
          });
          
          updateState({ isLoading: false });
          return {
            success: true,
            error: {
              message: "Please check your email for the verification code",
              code: "email_confirmation_required",
            },
          };
        }

        if (!data.session) {
          const error: AuthError = { message: "Registration failed - no session returned" };
          updateState({ isLoading: false, error });
          return { success: false, error };
        }

        // Session handling is done by onAuthStateChange
        return { success: true };
      } catch (error) {
        const authError = toAuthError(error);
        updateState({ isLoading: false, error: authError });
        return { success: false, error: authError };
      }
    },
    [toAuthError, updateState]
  );

  // --------------------------------------------------------------------------
  // Verify OTP - works with signInWithOtp flow
  // --------------------------------------------------------------------------
  const verifyOtp = useCallback(
    async (
      email: string,
      token: string
    ): Promise<{ success: boolean; error?: AuthError }> => {
      updateState({ isLoading: true, error: null });

      // Clean the token - remove any whitespace
      const cleanToken = token.trim();
      const cleanEmail = email.trim().toLowerCase();

      console.log('Verifying OTP:', { email: cleanEmail, tokenLength: cleanToken.length });

      try {
        // Try 'signup' type first (for signup confirmation emails)
        let { data, error: verifyError } = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: cleanToken,
          type: 'signup'
        });

        console.log('Signup verify result:', { data: !!data?.session, error: verifyError?.message });

        // If that fails, try 'email' type (for signInWithOtp)
        if (verifyError) {
          console.log('Trying email type...');
          const result = await supabase.auth.verifyOtp({
            email: cleanEmail,
            token: cleanToken,
            type: 'email'
          });
          data = result.data;
          verifyError = result.error;
          console.log('Email verify result:', { data: !!data?.session, error: verifyError?.message });
        }

        // If still fails, try 'magiclink' type
        if (verifyError) {
          console.log('Trying magiclink type...');
          const result = await supabase.auth.verifyOtp({
            email: cleanEmail,
            token: cleanToken,
            type: 'magiclink'
          });
          data = result.data;
          verifyError = result.error;
          console.log('Magiclink verify result:', { data: !!data?.session, error: verifyError?.message });
        }

        if (verifyError) {
          const error = toAuthError(verifyError);
          updateState({ isLoading: false, error });
          return { success: false, error };
        }

        if (!data.session) {
          const error: AuthError = { message: "Verification failed - no session returned" };
          updateState({ isLoading: false, error });
          return { success: false, error };
        }

        // Session handling is done by onAuthStateChange
        updateState({ isLoading: false });
        return { success: true };
      } catch (error) {
        const authError = toAuthError(error);
        updateState({ isLoading: false, error: authError });
        return { success: false, error: authError };
      }
    },
    [toAuthError, updateState]
  );

  // --------------------------------------------------------------------------
  // Resend OTP - use signInWithOtp which sends an actual OTP code
  // --------------------------------------------------------------------------
  const resendOtp = useCallback(
    async (email: string): Promise<{ success: boolean; error?: AuthError }> => {
      try {
        // Use signInWithOtp which actually sends an OTP code
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: false, // User already exists from signup
          },
        });

        if (otpError) {
          const error = toAuthError(otpError);
          return { success: false, error };
        }

        return { success: true };
      } catch (error) {
        const authError = toAuthError(error);
        return { success: false, error: authError };
      }
    },
    [toAuthError]
  );

  // --------------------------------------------------------------------------
  // Logout
  // --------------------------------------------------------------------------
  const logout = useCallback(async (): Promise<void> => {
    updateState({ isLoading: true });

    try {
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Error signing out:", error.message);
      }

      // Clear local state regardless
      apiClient.clearTokens();
      updateState({
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error("Error during logout:", error);
      // Still clear state even if logout fails
      apiClient.clearTokens();
      updateState({
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }, [updateState]);

  // --------------------------------------------------------------------------
  // Refresh user profile
  // --------------------------------------------------------------------------
  const refreshUser = useCallback(async (): Promise<void> => {
    if (!state.session) return;

    try {
      const user = await fetchUserProfile();
      if (user) {
        updateState({ user });
      }
    } catch (error) {
      console.error("Failed to refresh user:", error);
    }
  }, [state.session, fetchUserProfile, updateState]);

  // --------------------------------------------------------------------------
  // Clear error
  // --------------------------------------------------------------------------
  const clearError = useCallback((): void => {
    updateState({ error: null });
  }, [updateState]);

  // --------------------------------------------------------------------------
  // Context value
  // --------------------------------------------------------------------------
  const value: AuthContextValue = {
    ...state,
    login,
    register,
    verifyOtp,
    resendOtp,
    logout,
    refreshUser,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================================================
// HOOK
// ============================================================================

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook that returns true if user is authenticated
 */
export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useAuth();
  return isAuthenticated;
}

/**
 * Hook that returns the current user or null
 */
export function useCurrentUser(): AuthUser | null {
  const { user } = useAuth();
  return user;
}

/**
 * Hook that returns auth loading state
 */
export function useAuthLoading(): boolean {
  const { isLoading } = useAuth();
  return isLoading;
}
