n8n Integration (Perimeter Bus)

- Purpose: optional integration layer for notifications, ETL, ticket sync, and back-office glue — not for agent planning/execution or secured runbooks.
- Security: signed triggers and callbacks (HMAC-SHA256), optional IP allow-list, RBAC (OPERATOR/ADMIN), feature-flag gate, and provenance logging for every round-trip.

Environment

- N8N_BASE_URL: https://n8n.example.com
- N8N_SIGNING_SECRET: shared secret to sign requests both directions
- N8N_ALLOWED_IPS: comma-separated list of IPs allowed to call back

GraphQL Trigger

- Mutation: triggerN8n(flowKey: String!, runId: ID!, payload: JSON!): Boolean!
- Policy: only allows flow keys prefixed with integration/ by default

Inbound Callback

- Path: POST /webhooks/n8n
- Headers: x-maestro-signature: <hmac_sha256(raw_body)>
- Body: { "runId": "...", "artifact": "n8n.json", "content": { ... }, "meta": { "flow": "..." } }

Example Flow Shape (high-level)

Webhook node (POST /webhook/<flowKey>) → Function node (compute HMAC) → HTTP Request node (POST https://<maestro>/webhooks/n8n)

Templates

- See JSON templates in this folder for quick-start flows:
  - slack-notify.json
  - jira-comment.json
  - github-issue-comment.json
  - pagerduty-event.json
  - servicenow-create-incident.json
  - confluence-page-update.json

Notes

- Treat n8n as untrusted perimeter. Keep egress allow-list tight on n8n runtime. Secrets should be per-tenant and managed by platform secrets, not embedded in flows.
