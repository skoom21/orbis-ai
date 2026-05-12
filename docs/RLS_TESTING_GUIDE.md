# Row Level Security (RLS) Testing Guide

## Overview

Row Level Security (RLS) policies in Supabase control access to database rows based on user authentication. This guide explains how to test RLS policies for the Orbis AI backend.

## RLS Policies Structure

### Users Table
- **Policy**: Users can only view and update their own data
- **Rule**: `auth.uid() = id`

### Conversations Table
- **Policy**: Users can only access their own conversations
- **Rule**: `auth.uid() = user_id`

### Messages Table
- **Policy**: Users can only access messages in their conversations
- **Rule**: User ID matches the conversation's user_id

### Itineraries Table
- **Policy**: Users can access their own itineraries
- **Rule**: `auth.uid() = user_id`

## Testing Approach

### 1. Service Role vs Anon Key

The backend uses the **service role key** for most operations, which bypasses RLS:
- Service role operations ignore RLS policies
- Used for backend-to-backend operations
- Configured in `app/services/database.py`

For RLS testing, use the **anon key**:
- Subject to RLS policies
- Requires JWT with user context
- Used for client-side operations

### 2. Creating Test Users

```python
from app.core.auth import supabase_auth_service

# Register test users
user1 = await supabase_auth_service.sign_up(
    email="user1@test.com",
    password="TestPass123",
    metadata={"full_name": "Test User 1"}
)

user2 = await supabase_auth_service.sign_up(
    email="user2@test.com",
    password="TestPass123",
    metadata={"full_name": "Test User 2"}
)
```

### 3. Testing with Supabase Client

Create a separate client for RLS testing:

```python
from supabase import create_client
from app.config import settings

def create_rls_client(access_token: str):
    """Create Supabase client with user token for RLS testing."""
    client = create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_ANON_KEY
    )
    
    # Set auth token
    client.auth.set_session(access_token, refresh_token=None)
    
    return client
```

### 4. RLS Test Scenarios

#### Test 1: Users Can Only Read Their Own Data

```python
import pytest

@pytest.mark.asyncio
async def test_user_can_read_own_data():
    """Test that users can only read their own user data."""
    # Sign in user 1
    result1 = await supabase_auth_service.sign_in(
        email="user1@test.com",
        password="TestPass123"
    )
    token1 = result1["session"]["access_token"]
    user1_id = result1["user"]["id"]
    
    # Create RLS client
    client = create_rls_client(token1)
    
    # User should be able to read own data
    response = client.table("users").select("*").eq("id", user1_id).execute()
    assert len(response.data) == 1
    assert response.data[0]["id"] == user1_id
```

#### Test 2: Users Cannot Read Other Users' Data

```python
@pytest.mark.asyncio
async def test_user_cannot_read_others_data():
    """Test that users cannot read other users' data."""
    # Sign in user 1
    result1 = await supabase_auth_service.sign_in(
        email="user1@test.com",
        password="TestPass123"
    )
    token1 = result1["session"]["access_token"]
    
    # Get user 2 ID
    result2 = await supabase_auth_service.sign_in(
        email="user2@test.com",
        password="TestPass123"
    )
    user2_id = result2["user"]["id"]
    
    # Create RLS client for user 1
    client = create_rls_client(token1)
    
    # User 1 should NOT be able to read user 2's data
    response = client.table("users").select("*").eq("id", user2_id).execute()
    assert len(response.data) == 0
```

#### Test 3: Users Can Only Access Their Conversations

```python
@pytest.mark.asyncio
async def test_conversation_isolation():
    """Test that users can only access their own conversations."""
    from app.services.database import db_service
    
    # Create conversations for both users
    conv1 = await db_service.create_conversation(user1_id, "User 1 Conversation")
    conv2 = await db_service.create_conversation(user2_id, "User 2 Conversation")
    
    # Create RLS client for user 1
    client = create_rls_client(token1)
    
    # User 1 should see only their conversation
    response = client.table("conversations").select("*").execute()
    assert len(response.data) == 1
    assert response.data[0]["user_id"] == user1_id
    
    # User 1 should NOT access user 2's conversation
    response = client.table("conversations")\
        .select("*")\
        .eq("id", conv2)\
        .execute()
    assert len(response.data) == 0
```

#### Test 4: Users Cannot Access Other Users' Messages

```python
@pytest.mark.asyncio
async def test_message_isolation():
    """Test that users cannot access messages in other users' conversations."""
    from app.services.database import db_service
    
    # Create conversation and message for user 2
    conv2 = await db_service.create_conversation(user2_id, "User 2 Chat")
    msg2 = await db_service.add_message(conv2, "Secret message", "user")
    
    # Create RLS client for user 1
    client = create_rls_client(token1)
    
    # User 1 should NOT see user 2's messages
    response = client.table("messages")\
        .select("*")\
        .eq("conversation_id", conv2)\
        .execute()
    assert len(response.data) == 0
```

## Running RLS Tests

### 1. Setup Test Environment

```bash
# Activate virtual environment
cd apps/api
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Set test environment variables
export ENVIRONMENT=test
export SUPABASE_URL=your-test-project-url
export SUPABASE_ANON_KEY=your-anon-key
export SUPABASE_SERVICE_KEY=your-service-key
```

### 2. Run Tests

```bash
# Run all RLS tests
pytest tests/test_rls.py -v

# Run specific test
pytest tests/test_rls.py::test_user_can_read_own_data -v

# Run with coverage
pytest tests/test_rls.py --cov=app --cov-report=html
```

## RLS Policy SQL Examples

### Enable RLS on Table

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
```

### User Can Read Own Data

```sql
CREATE POLICY "Users can view own data"
ON users FOR SELECT
USING (auth.uid() = id);
```

### User Can Update Own Data

```sql
CREATE POLICY "Users can update own data"
ON users FOR UPDATE
USING (auth.uid() = id);
```

### Conversation Isolation

```sql
CREATE POLICY "Users can view own conversations"
ON conversations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations"
ON conversations FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

### Message Isolation

```sql
CREATE POLICY "Users can view messages in own conversations"
ON messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id
    AND conversations.user_id = auth.uid()
  )
);
```

## Admin Bypass

Admins may need to bypass RLS for administrative operations:

```sql
CREATE POLICY "Admins can view all data"
ON users FOR SELECT
USING (
  auth.uid() = id OR
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);
```

## Best Practices

1. **Always Test with Anon Key**: RLS only applies to anon key requests
2. **Test Positive and Negative Cases**: Verify both access and denial
3. **Test Cross-User Access**: Ensure users can't access others' data
4. **Test Admin Permissions**: Verify admin can access when appropriate
5. **Use Separate Test Database**: Don't test RLS on production data
6. **Clean Up Test Data**: Remove test users and data after tests

## Troubleshooting

### Policy Not Working
- Verify RLS is enabled: `SELECT * FROM pg_tables WHERE tablename = 'users';`
- Check policy definition: `SELECT * FROM pg_policies WHERE tablename = 'users';`
- Ensure using anon key, not service key

### Tests Passing with Service Key
- Service key bypasses RLS
- Switch to anon key for RLS testing

### Auth Context Not Set
- Ensure JWT token is valid
- Check token expiration
- Verify token contains correct user ID

## References

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Guide](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
