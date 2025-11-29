# KB Service

Knowledge Base service for IntelGraph platform - centralized documentation, runbooks, SOPs, and contextual help.

## Features

- **Article Management**: Create, version, and publish knowledge base content
- **Review Workflow**: SME and security sign-off before publication
- **Contextual Help**: In-product help based on UI route and user role
- **Copilot Integration**: Sanctioned KB corpus for AI retrieval with citations
- **Role-Based Access**: Audience-based content filtering
- **Export/Import**: Portable KB backup format

## Quick Start

```bash
# Install dependencies
pnpm install

# Run database migrations
pnpm migrate

# Seed initial content
pnpm seed

# Start development server
pnpm dev

# Run tests
pnpm test
```

## API Endpoints

### Articles
- `GET /api/v1/kb/articles` - List articles with filtering
- `GET /api/v1/kb/articles/:id` - Get article by ID or slug
- `POST /api/v1/kb/articles` - Create new article
- `PATCH /api/v1/kb/articles/:id` - Update article metadata
- `DELETE /api/v1/kb/articles/:id` - Delete article

### Versions & Workflow
- `GET /api/v1/kb/articles/:id/versions` - Get article versions
- `POST /api/v1/kb/articles/:id/versions` - Create new version
- `POST /api/v1/kb/articles/versions/:versionId/submit-review` - Submit for review
- `POST /api/v1/kb/articles/versions/:versionId/review` - Submit review decision
- `POST /api/v1/kb/articles/versions/:versionId/publish` - Publish approved version

### Contextual Help
- `POST /api/v1/kb/context` - Get contextual help for UI route
- `GET /api/v1/kb/search?q=query` - Search KB content
- `GET /api/v1/kb/anchor/:anchorKey?route=/path` - Get anchor-specific help
- `GET /api/v1/kb/onboarding` - Get onboarding content

### Copilot Integration
- `POST /api/v1/kb/copilot/query` - Query KB for Copilot
- `GET /api/v1/kb/copilot/document/:id` - Get document for Copilot context
- `GET /api/v1/kb/copilot/updates?since=ISO_DATE` - Get recent updates

### Administration
- `GET/POST/PATCH/DELETE /api/v1/kb/admin/tags` - Manage tags
- `GET/POST/PATCH/DELETE /api/v1/kb/admin/audiences` - Manage audiences
- `GET/POST/PATCH/DELETE /api/v1/kb/admin/help-anchors` - Manage help anchors
- `GET /api/v1/kb/admin/export` - Export entire KB
- `POST /api/v1/kb/admin/import` - Import KB data

## Content Types

| Type | Description |
|------|-------------|
| `article` | General knowledge article |
| `playbook` | Step-by-step operational guide |
| `sop` | Standard Operating Procedure |
| `runbook` | Technical runbook |
| `faq` | Frequently asked question |
| `tutorial` | Learning tutorial |
| `reference` | Reference documentation |

## Classification Levels

| Level | Description |
|-------|-------------|
| `public` | Approved for public release |
| `internal` | Available to all authenticated users |
| `confidential` | Restricted to specific roles |
| `restricted` | Limited to explicitly authorized users |

## Review Workflow

1. Author creates/updates content (status: `draft`)
2. Author submits for review (status: `pending_review`)
3. Reviewers approve/reject/request revision
4. On approval, status becomes `approved`
5. Publisher publishes (status: `published`)

## Environment Variables

```bash
KB_SERVICE_PORT=3200
KB_DB_HOST=localhost
KB_DB_PORT=5432
KB_DB_NAME=intelgraph
KB_DB_USER=postgres
KB_DB_PASSWORD=postgres
KB_DB_POOL_SIZE=20
KB_BASE_URL=https://intelgraph.example.com/kb
CORS_ORIGIN=*
LOG_LEVEL=info
NODE_ENV=development
```

## Database Schema

The service uses PostgreSQL with the following main tables:
- `kb_articles` - Article metadata
- `kb_versions` - Article version history
- `kb_tags` - Content tags
- `kb_audiences` - Role-based audiences
- `kb_reviews` - Review tracking
- `kb_help_anchors` - UI help anchors
- `kb_audit_log` - Change audit trail

## Related Packages

- `@intelgraph/help-overlay` - React components for in-product help UI
