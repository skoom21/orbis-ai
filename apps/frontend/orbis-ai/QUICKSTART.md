# Frontend Authentication - Quick Start

## ✅ What's Been Implemented

### Authentication Methods
1. **Email/Password** - Direct signup and login with backend
2. **Google OAuth** - Social login via Supabase
3. **GitHub OAuth** - Social login via Supabase

### Pages Updated
- ✅ `/login` - Full authentication with all 3 methods
- ✅ `/signup` - Full authentication with all 3 methods  
- ✅ `/dashboard` - Protected page showing user profile
- ✅ `/auth/callback` - OAuth redirect handler

### Core Files Created
- ✅ `lib/api-client.ts` - HTTP client with auto token refresh
- ✅ `lib/supabase.ts` - OAuth provider integration
- ✅ `hooks/use-auth.tsx` - Global auth state management
- ✅ `app/layout.tsx` - Wrapped with AuthProvider

## 🚀 Quick Setup (3 Steps)

### 1. Create `.env.local` file:
```bash
# Backend URL
NEXT_PUBLIC_API_URL=http://localhost:8000

# Get these from: https://supabase.com/dashboard
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 2. Configure Supabase OAuth
1. Go to Supabase Dashboard → Authentication → Providers
2. Enable Google and GitHub
3. Add redirect URL: `http://localhost:3000/auth/callback`

### 3. Start the app:
```bash
npm run dev
```

## 🧪 Test It Out

### Test Email/Password:
1. Go to http://localhost:3000/signup
2. Create account → Auto redirects to dashboard
3. Logout → Login again with same credentials

### Test OAuth:
1. Go to http://localhost:3000/login
2. Click Google or GitHub button
3. Authorize → Redirects to dashboard

## 📝 Using Auth in Your Components

```typescript
import { useAuth } from '@/hooks/use-auth'

function MyComponent() {
  const { user, loading, isAuthenticated, login, logout } = useAuth()

  if (loading) return <div>Loading...</div>
  if (!isAuthenticated) return <div>Please login</div>

  return (
    <div>
      <h1>Welcome {user?.full_name}</h1>
      <p>Email: {user?.email}</p>
      <p>Role: {user?.role}</p>
      <button onClick={logout}>Logout</button>
    </div>
  )
}
```

## 🔒 Protecting Routes

```typescript
"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"

export default function ProtectedPage() {
  const router = useRouter()
  const { loading, isAuthenticated } = useAuth()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login')
    }
  }, [loading, isAuthenticated, router])

  if (loading || !isAuthenticated) return null

  return <div>Protected content</div>
}
```

## 📚 API Endpoints Used

- `POST /api/v1/auth/register` - Sign up
- `POST /api/v1/auth/login` - Sign in
- `POST /api/v1/auth/logout` - Sign out
- `POST /api/v1/auth/refresh` - Refresh token
- `GET /api/v1/auth/me` - Get user profile
- `PUT /api/v1/auth/me` - Update profile

## 🔧 How It Works

### Email/Password Flow:
```
User submits form → POST /api/v1/auth/login 
→ Backend validates → Returns JWT tokens
→ Frontend stores tokens → Redirects to /dashboard
```

### OAuth Flow:
```
User clicks OAuth button → Redirects to provider
→ User authorizes → Redirects to /auth/callback
→ Extract session → Store tokens → Redirect to /dashboard
```

### Token Refresh (Automatic):
```
API call gets 401 → POST /api/v1/auth/refresh
→ Get new access token → Retry original request
```

## ⚠️ Important Notes

1. **Backend must be running** at http://localhost:8000 (or your configured URL)
2. **Supabase credentials required** for OAuth to work
3. **Tokens stored in localStorage** (consider httpOnly cookies for production)
4. **HTTPS required** for OAuth in production
5. **Access tokens expire** after 30 minutes (auto-refreshed)
6. **Refresh tokens expire** after 7 days

## 📖 Full Documentation

See `FRONTEND_AUTH_INTEGRATION.md` for complete documentation including:
- Detailed API client usage
- Error handling
- Security considerations
- Troubleshooting guide
- Production deployment notes

## 🐛 Common Issues

**"Module not found: @supabase/supabase-js"**
```bash
npm install @supabase/supabase-js
```

**OAuth redirect fails**
- Check redirect URL in Supabase dashboard
- Ensure `.env.local` has correct Supabase credentials

**Backend connection fails**
- Ensure backend is running
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Verify CORS is configured on backend

**Login works but dashboard shows "Please login"**
- Check browser console for errors
- Verify tokens are being stored (check localStorage)
- Ensure backend `/api/v1/auth/me` endpoint works

## ✨ What's Next?

- [ ] Add password reset UI
- [ ] Add email verification UI  
- [ ] Create user settings page
- [ ] Add profile picture upload
- [ ] Implement "Remember me" checkbox
- [ ] Add OAuth account linking
- [ ] Create protected route wrapper component

---

**Need help?** Check the full docs in `FRONTEND_AUTH_INTEGRATION.md`
