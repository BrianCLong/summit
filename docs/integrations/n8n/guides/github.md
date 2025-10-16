# GitHub Quick Setup

- Create a GitHub App or use a PAT with repo:write scope for comments.
- In n8n, add a GitHub OAuth2 credential or token.
- Import docs/integrations/n8n/github-issue-comment.json and set variables for owner, repo, issueNumber, and body.
- Maestro → n8n: use triggerN8n with flowKey `integration/github-issue-comment`.
- n8n → Maestro: compute HMAC with `N8N_SIGNING_SECRET` and POST to `/webhooks/n8n`.
