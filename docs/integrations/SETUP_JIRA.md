# Jira Cloud — Setup & Verification

1. Create an API Token (service account recommended)

- https://id.atlassian.com/manage-profile/security/api-tokens → Create API token → copy once.

2. Environment variables

```
JIRA_BASE_URL=https://<your-domain>.atlassian.net
JIRA_EMAIL=<service-account-email>
JIRA_API_TOKEN=<token>
JIRA_PROJECT_KEYS=OPS,ENG,PLAT
```

3. Smoke tests (curl)

```
# Who am I?
curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" -H "Accept: application/json" \
  "$JIRA_BASE_URL/rest/api/3/myself" | jq '.accountId'

# List projects → keys become JIRA_PROJECT_KEYS
curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" -H "Accept: application/json" \
  "$JIRA_BASE_URL/rest/api/3/project/search" | jq '.values[].key'
```

4. Webhook (optional)

- Point Jira webhook to: `https://maestro.dev.topicality.co/api/webhooks/jira`.
- Optionally set a shared secret header (e.g., `X-Jira-Secret`) and configure `JIRA_WEBHOOK_SECRET` on the server.
