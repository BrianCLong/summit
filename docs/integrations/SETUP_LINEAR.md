# Linear — Setup & Verification

## Prerequisites

- Linear API token with read/write access to issues and projects.
- Integration webhook endpoint reachable by Linear (use the same integration hub as Jira/GitHub).

## Environment variables

Set the following before running verification scripts:

```bash
export LINEAR_API_TOKEN="***"
```

## Webhook

1. In Linear, open **Settings → API → Webhooks**.
2. Create a webhook targeting your integration hub endpoint.
3. Subscribe to **Issue** and **Project** update events.
4. Validate the webhook by ensuring a `200` response for the handshake event.

## Verification

Use the integration verification script to validate credentials:

```bash
npx ts-node scripts/verify-integrations.ts linear
```
