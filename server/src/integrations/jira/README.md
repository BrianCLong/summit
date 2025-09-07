Jira Integration

Env vars (set in server/.env)

- JIRA_BASE_URL=
- JIRA_EMAIL=
- JIRA_API_TOKEN=
- JIRA_PROJECT_KEYS= (comma-separated)

Endpoints

- POST /api/webhooks/jira (webhook receiver)

Planned

- Sync issues ↔ tickets; sprints ↔ iterations; status mapping to pipeline gates.

Security

- Use OAuth/API token; do not store tokens in repo; rotate regularly.
