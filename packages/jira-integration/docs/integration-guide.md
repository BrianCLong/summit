# PerfTrace Jira Integration Guide

This guide describes how to roll out the PerfTrace Jira automation within Summit deployments.

## 1. Prerequisites

1. Jira Cloud site with REST API access enabled.
2. Service account with project-level permissions to create issues, add attachments, and manage issue links.
3. API token generated for the service account.
4. Identified project key and issue type for PerfTrace tickets.
5. Custom fields provisioned for environment, regression window, owners, baseline/current metrics, and severity.

## 2. Installation

1. Add the package to the Summit monorepo workspace dependencies if not already available.
2. Configure environment variables for the Jira credentials and endpoints.
3. Update CI secrets to inject the Jira API token for automated runs.

```bash
npm install
npm run --workspace=@summit/jira-integration build
```

## 3. Configuration Checklist

| Setting               | Description                                | Example                         |
| --------------------- | ------------------------------------------ | ------------------------------- |
| `baseUrl`             | Jira site base URL                         | `https://example.atlassian.net` |
| `email`               | Service account email                      | `perftrace-bot@example.com`     |
| `apiToken`            | Jira API token                             | Inject from secrets manager     |
| `projectKey`          | PerfTrace project key                      | `PERF`                          |
| `issueTypeId`         | Custom PerfTrace issue type                | `10057`                         |
| `customFieldMap`      | Field map for environment, owners, metrics | `customfield_10201`             |
| `priorityMapping`     | Severity-to-priority translation           | `critical -> P1`                |
| `workflowTransitions` | Status-to-transition mapping               | `Triaged -> In Progress`        |

## 4. CI/CD Integration

- Add `npm run --workspace=@summit/jira-integration test` to the CI pipeline.
- Enforce linting with `npm run lint` prior to packaging.
- Require >80% coverage by checking the Jest summary output.
- Publish generated audit logs to your observability store (e.g., CloudWatch or ELK) for compliance.

## 5. Webhook Setup

1. Configure a Jira webhook pointing to your Summit webhook gateway.
2. Subscribe to `jira:issue_created` and `jira:issue_updated` events.
3. Pass incoming payloads to `integration.handleWebhook(event)`.
4. Use the returned `WorkflowSyncResult` to trigger additional automation, such as notifying PerfTrace owners.

## 6. Operational Runbook

- **Retry Handling**: API calls automatically retry with exponential backoff. Persistent failures are logged in the audit trail.
- **Audit Logging**: All requests and state changes emit structured logs; export them daily for compliance.
- **Bulk Operations**: Use `bulkCreatePerfTraceTickets` for ingestion pipelines. Failures are isolated per ticket to avoid batch aborts.
- **Attachments**: Attachments are uploaded using multipart form data. Ensure the Jira project allows attachments and respects size quotas.
- **Issue Linking**: Related issues can be auto-linked using `linkIssues`. Define `Relates` or custom link types per project requirements.

## 7. Security Considerations

- Store Jira credentials in your secrets manager; never commit tokens.
- Scope the service account permissions to the specific PerfTrace project when possible.
- Rotate API tokens regularly and update CI secrets.

## 8. Validation Checklist

- [ ] Service account can create PerfTrace tickets.
- [ ] Workflow transitions match the Summit lifecycle.
- [ ] Attachments appear on created issues.
- [ ] Related incidents are linked bidirectionally.
- [ ] Webhooks trigger downstream automation without error.

## 9. Troubleshooting

| Symptom                    | Resolution                                                    |
| -------------------------- | ------------------------------------------------------------- |
| 401 Unauthorized           | Verify email/token combo and Basic Auth header configuration. |
| 415 Unsupported Media Type | Ensure attachments use multipart/form-data.                   |
| Missing severity field     | Confirm `priorityMapping` severity field IDs are correct.     |
| Tickets not transitioning  | Check `workflowTransitions` for the source status name.       |

## 10. Further Reading

- [Jira REST API documentation](https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/)
- [Jira issue link types](https://support.atlassian.com/jira-cloud-administration/docs/link-issues/)
