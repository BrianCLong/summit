# n8n Networking and Egress Controls

- Run n8n in an isolated namespace.
- Apply a tight egress allow-list (Kubernetes NetworkPolicy or CNI-level) to only approved destinations (Slack API, Jira API, GitHub API, PagerDuty, ServiceNow, Confluence, etc.).
- Prefer DNS names pinned to IP ranges where possible; avoid wildcard outbound.
- Keep secrets in K8s Secrets per tenant; restrict who can edit credentials.
- Maestro side: see server/config/n8n-flows.json for allowed flow prefixes and explicit flows. Deny deploy/_, db/_ by default.
- Consider eBPF auditing to log all outbound connections from the n8n pod.
