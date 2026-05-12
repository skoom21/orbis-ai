# Role-Based Access Control (RBAC) Implementation Guide

## Overview

This guide explains the RBAC implementation for Orbis AI, including role definitions, permission management, and usage patterns.

## Role Hierarchy

### User Roles

1. **user** (default)
   - Basic authenticated user
   - Can manage own data
   - Access to standard features

2. **premium**
   - Enhanced user tier
   - Access to premium features
   - Advanced AI capabilities
   - Priority support

3. **moderator**
   - Content moderation capabilities
   - User management (limited)
   - Cannot modify admin data

4. **admin**
   - Full system access
   - User management
   - System configuration
   - Access to all features

## Database Schema

### Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  email_verified BOOLEAN DEFAULT false,
  preferences JSONB DEFAULT '{}'::jsonb,
  
  CONSTRAINT valid_role CHECK (role IN ('user', 'premium', 'moderator', 'admin'))
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);
```

## FastAPI Dependencies

### Basic Role Dependencies

Already implemented in `app/api/dependencies/auth.py`:

```python
from app.api.dependencies.auth import (
    get_current_user,          # Any authenticated user
    get_current_active_user,   # Active user only
    get_current_admin_user,    # Admin role required
    require_role,              # Specific role required
    require_any_role           # Any of specified roles
)
```

### Usage Examples

#### Require Admin Role

```python
from fastapi import APIRouter, Depends
from app.api.dependencies.auth import get_current_admin_user

router = APIRouter()

@router.get("/admin/users")
async def list_all_users(
    current_user: dict = Depends(get_current_admin_user)
):
    """Only admins can list all users."""
    # Implementation
    pass
```

#### Require Specific Role

```python
from app.api.dependencies.auth import require_role

@router.get("/premium/features")
async def get_premium_features(
    current_user: dict = Depends(require_role("premium"))
):
    """Only premium users can access this."""
    # Implementation
    pass
```

#### Require Any of Multiple Roles

```python
from app.api.dependencies.auth import require_any_role

@router.post("/content/moderate")
async def moderate_content(
    current_user: dict = Depends(require_any_role("moderator", "admin"))
):
    """Moderators and admins can moderate content."""
    # Implementation
    pass
```

## Permission Matrix

| Feature | user | premium | moderator | admin |
|---------|------|---------|-----------|-------|
| Basic chat | ✅ | ✅ | ✅ | ✅ |
| View own data | ✅ | ✅ | ✅ | ✅ |
| Advanced AI | ❌ | ✅ | ✅ | ✅ |
| Priority support | ❌ | ✅ | ✅ | ✅ |
| View all users | ❌ | ❌ | ❌ | ✅ |
| Moderate content | ❌ | ❌ | ✅ | ✅ |
| System settings | ❌ | ❌ | ❌ | ✅ |
| Role management | ❌ | ❌ | ❌ | ✅ |

## API Endpoints

### Admin Endpoints

#### List All Users

```python
@router.get("/admin/users", response_model=List[UserResponse])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_admin_user)
):
    """List all users (admin only)."""
    users = await db_service.list_users(skip=skip, limit=limit)
    return users
```

#### Update User Role

```python
@router.put("/admin/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    new_role: str,
    current_user: dict = Depends(get_current_admin_user)
):
    """Update user role (admin only)."""
    if new_role not in ["user", "premium", "moderator", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    updated_user = await db_service.update_user(
        user_id, 
        {"role": new_role}
    )
    
    return {"message": f"User role updated to {new_role}"}
```

#### Deactivate User

```python
@router.post("/admin/users/{user_id}/deactivate")
async def deactivate_user(
    user_id: str,
    current_user: dict = Depends(get_current_admin_user)
):
    """Deactivate user account (admin only)."""
    updated_user = await db_service.update_user(
        user_id,
        {"is_active": False}
    )
    
    return {"message": "User deactivated"}
```

### Moderator Endpoints

#### Flag Content

```python
@router.post("/moderate/content/{content_id}/flag")
async def flag_content(
    content_id: str,
    reason: str,
    current_user: dict = Depends(require_any_role("moderator", "admin"))
):
    """Flag content for review (moderator/admin)."""
    # Implementation
    pass
```

### Premium Endpoints

#### Advanced AI Features

```python
@router.post("/premium/ai/analyze")
async def advanced_ai_analysis(
    request: AnalysisRequest,
    current_user: dict = Depends(require_any_role("premium", "admin"))
):
    """Advanced AI analysis (premium/admin)."""
    # Implementation
    pass
```

## Testing RBAC

### Test Fixtures

```python
import pytest
from app.core.auth import auth_service

@pytest.fixture
def user_token():
    """Regular user token."""
    return auth_service.create_access_token(user_id="user-123")

@pytest.fixture
def premium_token():
    """Premium user token."""
    return auth_service.create_access_token(user_id="premium-123")

@pytest.fixture
def admin_token():
    """Admin user token."""
    return auth_service.create_access_token(user_id="admin-123")
```

### Test Cases

#### Test Admin Access

```python
@pytest.mark.asyncio
async def test_admin_can_list_users(client, admin_token):
    """Test admin can list all users."""
    response = client.get(
        "/api/v1/admin/users",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    assert response.status_code == 200
    assert isinstance(response.json(), list)
```

#### Test Non-Admin Denied

```python
@pytest.mark.asyncio
async def test_user_cannot_list_users(client, user_token):
    """Test regular user cannot list all users."""
    response = client.get(
        "/api/v1/admin/users",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    
    assert response.status_code == 403
    assert "Admin privileges required" in response.json()["detail"]
```

#### Test Premium Features

```python
@pytest.mark.asyncio
async def test_premium_access(client, premium_token):
    """Test premium user can access premium features."""
    response = client.get(
        "/api/v1/premium/features",
        headers={"Authorization": f"Bearer {premium_token}"}
    )
    
    assert response.status_code == 200
```

#### Test User Denied Premium

```python
@pytest.mark.asyncio
async def test_user_denied_premium(client, user_token):
    """Test regular user cannot access premium features."""
    response = client.get(
        "/api/v1/premium/features",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    
    assert response.status_code == 403
```

## Role Management

### Promote User to Premium

```python
from app.services.database import db_service

async def promote_to_premium(user_id: str) -> bool:
    """Promote user to premium tier."""
    updated_user = await db_service.update_user(
        user_id,
        {"role": "premium"}
    )
    
    if updated_user:
        logger.info("User promoted to premium", user_id=user_id)
        return True
    return False
```

### Grant Admin Role

```python
async def grant_admin_role(
    user_id: str,
    granter_id: str
) -> bool:
    """Grant admin role (requires current admin)."""
    # Verify granter is admin
    granter = await db_service.get_user_by_id(granter_id)
    if granter["role"] != "admin":
        raise PermissionError("Only admins can grant admin role")
    
    # Update role
    updated_user = await db_service.update_user(
        user_id,
        {"role": "admin"}
    )
    
    if updated_user:
        logger.info(
            "Admin role granted",
            user_id=user_id,
            granter_id=granter_id
        )
        return True
    return False
```

## RLS Policies for RBAC

### Allow Admins to View All Users

```sql
CREATE POLICY "Admins can view all users"
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

### Allow Moderators to View Flagged Content

```sql
CREATE POLICY "Moderators can view flagged content"
ON flagged_content FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('moderator', 'admin')
  )
);
```

## Best Practices

1. **Principle of Least Privilege**: Grant minimum required permissions
2. **Role Verification**: Always check role in dependencies, not in route logic
3. **Audit Logging**: Log all role changes and admin actions
4. **Separate Admin Routes**: Group admin endpoints with prefix `/admin`
5. **Test All Roles**: Test each role's access and denial scenarios
6. **Use Dependencies**: Leverage FastAPI dependencies for clean code
7. **Role Validation**: Validate roles in database constraints

## Middleware Logging

Log all role-based access attempts:

```python
from app.logging_config import get_logger

logger = get_logger("rbac")

async def log_role_access(
    endpoint: str,
    user_id: str,
    role: str,
    allowed: bool
):
    """Log role-based access attempts."""
    logger.info(
        "Role access attempt",
        endpoint=endpoint,
        user_id=user_id,
        role=role,
        allowed=allowed
    )
```

## Future Enhancements

1. **Permission Objects**: Fine-grained permissions beyond roles
2. **Dynamic Roles**: User-defined custom roles
3. **Role Hierarchy**: Automatic permission inheritance
4. **Temporary Roles**: Time-limited role grants
5. **Multi-Tenancy**: Organization-based role isolation

## References

- FastAPI Security: https://fastapi.tiangolo.com/tutorial/security/
- OAuth2 with Password Flow: https://fastapi.tiangolo.com/tutorial/security/simple-oauth2/
