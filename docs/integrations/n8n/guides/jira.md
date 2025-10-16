# Jira Quick Setup

- Create an API token and use Basic Auth in n8n’s Jira Software Cloud node.
- Import docs/integrations/n8n/jira-comment.json and set `issueId` and `body`.
- Test via Maestro GraphQL: triggerN8n(flowKey:"integration/jira-comment", ...).
- Ensure your firewall allows outbound to `your-domain.atlassian.net`.
