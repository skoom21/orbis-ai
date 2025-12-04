# Alembic Migrations Guide

This directory contains database migration scripts for Orbis AI.

## 📋 Overview

Alembic is used for database schema migrations, allowing version control of database changes.

## 🚀 Quick Start

### Initialize Alembic (Already Done)
```bash
cd /home/skoom/University/FYP/orbis-ai/apps/api
# Alembic is already configured with alembic.ini
```

### Create Your First Migration
```bash
# Auto-generate migration from models (if using SQLAlchemy models)
alembic revision --autogenerate -m "Add user preferences table"

# Or create empty migration
alembic revision -m "Add custom index"
```

### Apply Migrations
```bash
# Upgrade to latest version
alembic upgrade head

# Upgrade by one version
alembic upgrade +1

# Downgrade by one version
alembic downgrade -1

# View current version
alembic current

# View migration history
alembic history
```

## 📁 Directory Structure

```
migrations/
├── env.py              # Alembic environment config
├── script.py.mako      # Migration template
└── versions/           # Migration files
    └── 2025_12_05_1234-abc123_description.py
```

## 📝 Creating Migrations

### Manual Migration Template
```python
"""Add user_preferences table

Revision ID: abc123
Revises: def456
Create Date: 2025-12-05 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'abc123'
down_revision = 'def456'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Apply migration changes."""
    op.create_table(
        'user_preferences',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('preferences', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'])
    )


def downgrade() -> None:
    """Revert migration changes."""
    op.drop_table('user_preferences')
```

## 🔧 Common Operations

### Adding a Table
```python
def upgrade():
    op.create_table(
        'new_table',
        sa.Column('id', sa.UUID(), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now())
    )
```

### Adding a Column
```python
def upgrade():
    op.add_column('users', sa.Column('phone', sa.String(20)))
```

### Creating an Index
```python
def upgrade():
    op.create_index('idx_users_email', 'users', ['email'])
```

### Adding a Foreign Key
```python
def upgrade():
    op.create_foreign_key(
        'fk_trips_user',
        'trips', 'users',
        ['user_id'], ['id']
    )
```

## ⚙️ Configuration

### Database URL
Set in `alembic.ini` or via environment variable:
```bash
export DATABASE_URL="postgresql://user:pass@localhost:5432/orbis_ai"
```

### Auto-formatting
Migrations are automatically formatted with Black (configured in `alembic.ini`).

## 🔄 Using with Supabase

Since we're using Supabase with predefined schema (`db_schema.sql`), migrations serve two purposes:

### 1. Schema Evolution
Track changes to the schema over time:
```bash
# After updating db_schema.sql
alembic revision -m "Add federated learning tables"
```

### 2. Data Migrations
Migrate or transform existing data:
```python
def upgrade():
    # Update existing records
    op.execute("""
        UPDATE travel_guides 
        SET content_embedding = generate_embedding(content)
        WHERE content_embedding IS NULL
    """)
```

## 📊 Migration Workflow

### Development
1. Make changes to `db_schema.sql` (source of truth)
2. Apply to Supabase manually or via Supabase CLI
3. Create Alembic migration to document change:
   ```bash
   alembic revision -m "Document schema change"
   ```

### Production
1. Review migration in staging
2. Test rollback procedure
3. Apply with downtime window if needed
4. Monitor application health

## 🐛 Troubleshooting

### Migration Conflicts
```bash
# If you have conflicting revisions
alembic merge heads -m "Merge conflicting migrations"
```

### Reset Migration History
```bash
# Stamp database at current version without running migrations
alembic stamp head
```

### Downgrade Issues
```bash
# View SQL without executing
alembic upgrade head --sql

# Test downgrade
alembic downgrade -1
alembic upgrade +1
```

## 🔒 Best Practices

### ✅ Do
- Always write both `upgrade()` and `downgrade()`
- Test migrations on copy of production data
- Keep migrations small and focused
- Use transactions for data migrations
- Document complex migrations
- Back up database before production migrations

### ❌ Don't
- Modify existing migrations after they're deployed
- Delete old migration files
- Skip writing downgrade logic
- Mix schema and data changes in one migration
- Forget to test rollback procedures

## 📚 Advanced Topics

### Multi-Head Migrations
When multiple features add migrations simultaneously:
```bash
alembic revision --head=abc123 -m "Feature A changes"
alembic revision --head=def456 -m "Feature B changes"
alembic merge heads -m "Merge feature migrations"
```

### Offline Migrations
Generate SQL file for DBA execution:
```bash
alembic upgrade head --sql > migration.sql
```

### Branch Management
```bash
# Create branch
alembic revision --branch-label=feature_x -m "Start feature X"

# Merge branch
alembic merge --message="Merge feature X" feature_x@head main@head
```

## 🔗 Integration with Application

### Startup Migration Check
Add to `main.py`:
```python
from alembic import command
from alembic.config import Config

@app.on_event("startup")
async def run_migrations():
    """Auto-migrate on startup (development only)"""
    if settings.ENVIRONMENT == "development":
        alembic_cfg = Config("alembic.ini")
        command.upgrade(alembic_cfg, "head")
```

### Health Check
Check migration status:
```python
from alembic.runtime.migration import MigrationContext

async def check_migration_status():
    """Check if migrations are up to date"""
    engine = get_engine()
    conn = engine.connect()
    context = MigrationContext.configure(conn)
    current = context.get_current_revision()
    # Compare with head revision
```

## 📖 Resources

- [Alembic Documentation](https://alembic.sqlalchemy.org/)
- [Supabase Migrations](https://supabase.com/docs/guides/database/migrations)
- [SQLAlchemy Core Tutorial](https://docs.sqlalchemy.org/en/20/core/tutorial.html)

## 🎯 Next Steps

1. Create initial migration documenting current schema:
   ```bash
   alembic revision -m "Initial schema from db_schema.sql"
   ```

2. Set up CI/CD to run migrations:
   ```yaml
   - name: Run migrations
     run: alembic upgrade head
   ```

3. Configure migration alerts:
   - Notify team when new migration is created
   - Track migration execution time
   - Alert on migration failures

---

**Note:** Since we're using Supabase as primary database, consider using [Supabase CLI migrations](https://supabase.com/docs/guides/cli/local-development#database-migrations) as alternative or complement to Alembic.

**Last Updated:** 2025-12-05
