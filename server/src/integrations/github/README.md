GitHub Integration (App-based)

Env vars (set in server/.env)

- GITHUB_APP_ID=
- GITHUB_INSTALLATION_ID=
- GITHUB_PRIVATE_KEY= (PEM; store in SSM/Secrets, not in git)
- GITHUB_WEBHOOK_SECRET=

Endpoints

- POST /api/webhooks/github (webhook receiver)

Planned

- Sync issues/PRs → tickets table; link runs/deployments to PRs.
- Actions from Maestro: create/assign issues, label, comment, link runs.

Security

- Verify webhook signature; least-privileged App permissions.
