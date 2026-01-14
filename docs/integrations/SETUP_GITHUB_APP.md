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
  > **Note regarding User Consent:** Since this app requests repository-level permissions (e.g., Contents, Issues), users will see the "Act on your behalf" warning during authorization. This is expected behavior under GitHub's [January 2026 update](https://github.blog/changelog/2026-01-12-selectively-showing-act-on-your-behalf-warning-for-github-apps-is-in-public-preview/) which selectively displays this warning for apps requesting access beyond basic profile data.

- Subscribe to events: Issues, Issue comment, Pull request
- Save.

2. Generate Private Key

- App settings → Private keys → Generate a private key → download `.pem`.

3. Install the App

- From the App page → Install App → choose user/org → select repos.
- The Installation ID is in the URL `.../settings/installations/<ID>` (also in webhooks/API).

> **Organization Governance:** If you are installing this into an Organization, be aware of the [App Request controls](https://github.blog/changelog/2026-01-12-controlling-who-can-request-apps-for-your-organization-is-now-generally-available/) introduced in Jan 2026. Admins can now restrict who can request apps (Members + Outside Collaborators, Members only, or Disabled). If installation fails or is blocked, check your Organization Settings → Third-party access.

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
