# Database Migrations

SQL migration files for the IntelGraph Collaboration Platform.

## Setup

### Requirements

- PostgreSQL 14+
- TimescaleDB extension
- pgcrypto extension

### Installation

1. Install PostgreSQL:
```bash
# Ubuntu/Debian
sudo apt-get install postgresql-14 postgresql-contrib

# macOS
brew install postgresql@14
```

2. Install TimescaleDB:
```bash
# Ubuntu/Debian
sudo add-apt-repository ppa:timescale/timescaledb-ppa
sudo apt-get update
sudo apt-get install timescaledb-postgresql-14

# macOS
brew tap timescale/tap
brew install timescaledb
```

3. Create database:
```bash
createdb intelgraph_collaboration
psql -d intelgraph_collaboration -c "CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE"
```

4. Run migrations:
```bash
psql -d intelgraph_collaboration -f 001_init_schema.sql
```

## Migration Files

- `001_init_schema.sql` - Initial database schema with all tables, indexes, and constraints

## Schema Overview

### Core Tables

**Workspaces & Projects:**
- `workspaces` - Multi-tenant workspaces
- `workspace_members` - Workspace membership and RBAC
- `projects` - Project organization within workspaces
- `project_members` - Project-level permissions

**Knowledge Base:**
- `documents` - Wiki-style documentation
- Full-text search enabled on title and content

**Collaboration:**
- `comment_threads` - Thread-based comments
- `comments` - Individual comments with rich text
- `comment_reactions` - Reactions (like, celebrate, etc.)
- `comment_votes` - Upvote/downvote system
- `annotations` - Visual annotations on maps/graphs
- `annotation_layers` - Layered annotation system

**Task Management:**
- `boards` - Kanban/Scrum boards
- `tasks` - Task tracking with dependencies

**Communication:**
- `notifications` - User notifications
- `activity_feed` - Activity timeline (TimescaleDB hypertable)
- `meetings` - Meeting management

**Sharing:**
- `share_links` - Shareable links with access control

**Marketplace:**
- `marketplace_assets` - Shared analyses and templates
- `marketplace_reviews` - Asset ratings and reviews

**Version Control:**
- `repositories` - Git-like repositories
- `branches` - Branch management
- `commits` - Commit history
- `tags` - Version tags

### Indexes

All tables have appropriate indexes for:
- Foreign key relationships
- Common query patterns
- Full-text search
- Time-series queries

### Views

- `active_workspaces` - Workspaces with member counts
- `task_stats` - Task statistics by board and status
- `comment_activity` - Comment activity by resource

## Performance Optimization

### TimescaleDB Hypertables

The `activity_feed` table is converted to a TimescaleDB hypertable for efficient time-series queries.

### Partitioning

Consider partitioning large tables by:
- `workspace_id` for multi-tenancy isolation
- `created_at` for time-based queries

### Retention Policies

Set up retention policies for activity feed:

```sql
SELECT add_retention_policy('activity_feed', INTERVAL '1 year');
```

## Security

### Row-Level Security (RLS)

Enable RLS for workspace isolation:

```sql
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY workspace_isolation ON documents
    USING (workspace_id IN (
        SELECT workspace_id FROM workspace_members
        WHERE user_id = current_user_id()
    ));
```

### Encryption

Sensitive fields should be encrypted:
- `share_links.password` - Use pgcrypto
- User authentication data

## Backup and Recovery

```bash
# Backup
pg_dump intelgraph_collaboration > backup.sql

# Restore
psql intelgraph_collaboration < backup.sql
```

## Monitoring

Monitor these metrics:
- Table sizes: `pg_total_relation_size()`
- Index usage: `pg_stat_user_indexes`
- Query performance: `pg_stat_statements`
- TimescaleDB chunk statistics

## Connection String

```
postgresql://user:password@localhost:5432/intelgraph_collaboration
```

Environment variable:
```bash
export DATABASE_URL="postgresql://user:password@localhost:5432/intelgraph_collaboration"
```
