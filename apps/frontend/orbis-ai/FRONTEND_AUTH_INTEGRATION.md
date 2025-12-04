# Frontend Authentication Integration

## Overview

This document describes the frontend authentication integration that connects the Next.js frontend to the FastAPI backend and Supabase OAuth providers.

## Features Implemented

### ✅ Authentication Methods
- **Email/Password Authentication**: Direct login and registration with the FastAPI backend
- **Google OAuth**: Social login via Supabase Auth
- **GitHub OAuth**: Social login via Supabase Auth

### ✅ Key Components Created

1. **API Client** (`lib/api-client.ts`)
   - HTTP wrapper for all backend API calls
   - Automatic token management (access & refresh tokens)
   - Auto token refresh on 401 errors
   - TypeScript typed interfaces

2. **Supabase OAuth Client** (`lib/supabase.ts`)
   - Google OAuth integration
   - GitHub OAuth integration
   - OAuth state change listener
   - Session management

3. **Auth Context Provider** (`hooks/use-auth.tsx`)
   - Global authentication state management
   - React Context API implementation
   - Methods: `login()`, `register()`, `logout()`, `refreshUser()`
   - Auto-initialization with both local tokens and OAuth sessions

4. **Updated Pages**
   - **Login Page** (`app/login/page.tsx`): Full OAuth + email/password integration
   - **Signup Page** (`app/signup/page.tsx`): Full OAuth + email/password integration
   - **Dashboard Page** (`app/dashboard/page.tsx`): Protected page showing user profile
   - **OAuth Callback** (`app/auth/callback/page.tsx`): Handles OAuth redirects

5. **Root Layout** (`app/layout.tsx`)
   - Wrapped with `AuthProvider` for global state access

## Setup Instructions

### 1. Install Dependencies

```bash
cd apps/frontend/orbis-ai
npm install @supabase/supabase-js
```

✅ Already completed

### 2. Configure Environment Variables

Create a `.env.local` file in the frontend root directory:

```bash
cp .env.local.example .env.local
```

Then edit `.env.local` with your actual values:

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8000

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Getting Supabase Credentials:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to Settings → API
4. Copy `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
5. Copy `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Configure Supabase OAuth Providers

#### Enable Google OAuth:
1. Go to Supabase Dashboard → Authentication → Providers
2. Enable Google provider
3. Add authorized redirect URL: `http://localhost:3000/auth/callback`
4. For production, add: `https://your-domain.com/auth/callback`

#### Enable GitHub OAuth:
1. Go to Supabase Dashboard → Authentication → Providers
2. Enable GitHub provider
3. Add authorized redirect URL: `http://localhost:3000/auth/callback`
4. For production, add: `https://your-domain.com/auth/callback`

### 4. Start the Development Server

```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

### 5. Ensure Backend is Running

The FastAPI backend should be running at `http://localhost:8000` (or the URL specified in `NEXT_PUBLIC_API_URL`).

```bash
cd apps/api
# Activate your virtual environment
# Then:
uvicorn app.main:app --reload
```

## Authentication Flow

### Email/Password Authentication

1. **Registration Flow**:
   ```
   User fills signup form → Frontend calls POST /api/v1/auth/register
   → Backend creates user in database → Returns tokens
   → Frontend stores tokens → Redirects to /dashboard
   ```

2. **Login Flow**:
   ```
   User fills login form → Frontend calls POST /api/v1/auth/login
   → Backend validates credentials → Returns tokens
   → Frontend stores tokens → Redirects to /dashboard
   ```

3. **Token Refresh**:
   ```
   API request gets 401 → Frontend calls POST /api/v1/auth/refresh
   → Backend validates refresh token → Returns new access token
   → Frontend retries original request
   ```

### OAuth Authentication (Google/GitHub)

1. **OAuth Flow**:
   ```
   User clicks OAuth button → Frontend calls Supabase OAuth
   → User redirects to provider → User authorizes
   → Provider redirects to /auth/callback
   → Frontend extracts session → Stores tokens
   → Redirects to /dashboard
   ```

## API Client Usage

### In Components:

```typescript
import { useAuth } from '@/hooks/use-auth'

export default function MyComponent() {
  const { user, loading, isAuthenticated, login, logout } = useAuth()

  const handleLogin = async () => {
    try {
      await login('user@example.com', 'password')
      // User is now authenticated
    } catch (error) {
      console.error('Login failed:', error)
    }
  }

  if (loading) return <div>Loading...</div>
  if (!isAuthenticated) return <div>Please login</div>

  return <div>Welcome {user?.full_name}</div>
}
```

### Direct API Calls:

```typescript
import { apiClient } from '@/lib/api-client'

// Get current user
const user = await apiClient.getCurrentUser()

// Update profile
await apiClient.updateProfile({ full_name: 'John Doe' })

// Request password reset
await apiClient.requestPasswordReset('user@example.com')
```

## Protected Routes

The dashboard page is protected and will redirect unauthenticated users to `/login`:

```typescript
useEffect(() => {
  if (!loading && !isAuthenticated) {
    router.push('/login')
  }
}, [loading, isAuthenticated, router])
```

To protect other pages, wrap them with the same logic or create a higher-order component.

## Testing the Integration

### Test Email/Password Authentication:

1. Go to `http://localhost:3000/signup`
2. Fill out the form with:
   - Full Name: Test User
   - Email: test@example.com
   - Password: testpassword123
   - Confirm Password: testpassword123
3. Click "Create account"
4. You should be redirected to `/dashboard` with your user info displayed

### Test OAuth Authentication:

1. Go to `http://localhost:3000/login`
2. Click "Google" or "GitHub" button
3. Authorize the application
4. You should be redirected back to `/dashboard`

### Test Logout:

1. From the dashboard, click "Logout"
2. Tokens should be cleared
3. You should be redirected to `/login`

### Test Token Refresh:

The token refresh happens automatically when an API request receives a 401 response. To test:
1. Login to the application
2. Wait 30 minutes (access token expires)
3. Navigate to a page that makes API calls
4. The token should automatically refresh

## Error Handling

All authentication errors are displayed to the user:

- **Login errors**: "Invalid email or password"
- **Registration errors**: "Failed to create account"
- **OAuth errors**: "OAuth authentication failed"
- **Network errors**: Displayed in the UI with retry options

## Security Considerations

1. **Tokens are stored in localStorage**: Consider using httpOnly cookies for production
2. **HTTPS required in production**: OAuth won't work over HTTP
3. **CORS must be configured**: Backend must allow frontend origin
4. **Refresh tokens**: 7-day expiry, stored securely
5. **Access tokens**: 30-minute expiry, auto-refreshed

## Troubleshooting

### "Module not found: @supabase/supabase-js"
```bash
npm install @supabase/supabase-js
```

### OAuth redirect errors
- Ensure redirect URLs are configured in Supabase dashboard
- Check that the callback page exists at `/app/auth/callback/page.tsx`
- Verify environment variables are set correctly

### Backend connection errors
- Ensure `NEXT_PUBLIC_API_URL` is set correctly
- Verify the backend is running
- Check CORS configuration on the backend

### Token refresh fails
- Check that refresh token endpoint is working: `POST /api/v1/auth/refresh`
- Ensure refresh token is being stored correctly
- Verify backend JWT configuration

## Next Steps

- [ ] Add protected route wrapper component
- [ ] Implement password reset flow UI
- [ ] Add email verification UI
- [ ] Create user profile edit page
- [ ] Add loading states and better error messages
- [ ] Implement remember me functionality
- [ ] Add OAuth provider linking (link Google + GitHub to same account)
- [ ] Add session timeout warnings

## Files Modified/Created

- ✅ `lib/api-client.ts` - API client with token management
- ✅ `lib/supabase.ts` - Supabase OAuth client
- ✅ `hooks/use-auth.tsx` - Auth context provider
- ✅ `app/layout.tsx` - Wrapped with AuthProvider
- ✅ `app/login/page.tsx` - Updated with real authentication
- ✅ `app/signup/page.tsx` - Updated with real authentication
- ✅ `app/dashboard/page.tsx` - New protected dashboard
- ✅ `app/auth/callback/page.tsx` - OAuth callback handler
- ✅ `.env.local.example` - Environment variable template
- ✅ `FRONTEND_AUTH_INTEGRATION.md` - This documentation

## Backend Endpoints Used

- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login with email/password
- `POST /api/v1/auth/logout` - Logout and invalidate tokens
- `POST /api/v1/auth/refresh` - Refresh access token
- `GET /api/v1/auth/me` - Get current user profile
- `PUT /api/v1/auth/me` - Update user profile
- `POST /api/v1/auth/password-reset` - Request password reset
- `POST /api/v1/auth/verify-email` - Send email verification

All endpoints are documented in the backend at `/docs` (Swagger UI).
