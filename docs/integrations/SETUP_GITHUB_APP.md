# GitHub App — Setup & Verification

1. Create the App

- GitHub → Settings → Developer settings → GitHub Apps → New GitHub App.
- Fill:
  - App name: Maestro Integrator (or similar)
  - Homepage URL: https://maestro.dev.topicality.co
  - Webhook URL: https://maestro.dev.topicality.co/api/webhooks/github
  - Webhook secret: generate a strong random string (store securely)
- Permissions (minimum for tickets demo):
  - Repository: Contents (Read), Issues (Read), Pull requests (Read)
  - Metadata (Read)
- Subscribe to events: Issues, Issue comment, Pull request
- Save.

2. Generate Private Key

- App settings → Private keys → Generate a private key → download `.pem`.

3. Install the App

- From the App page → Install App → choose user/org → select repos.
- The Installation ID is in the URL `.../settings/installations/<ID>` (also in webhooks/API).

4. Environment variables (never commit secrets)
   Set these in env/Secrets Manager:

```
GITHUB_APP_ID=
GITHUB_INSTALLATION_ID=
# For multi-line PEM, keep literal newlines or escape as \n on one line
GITHUB_PRIVATE_KEY=
GITHUB_WEBHOOK_SECRET=
```

5. Webhook Security

- Verify the `X-Hub-Signature-256` header as HMAC-SHA256 of the raw request body with `GITHUB_WEBHOOK_SECRET`.

6. Quick checks

- App → Recent deliveries → Ping / Redeliver → expect HTTP 200 after signature check.
- Run `npx ts-node scripts/verify-integrations.ts github` (script included) to list installation repositories.
