# PerfTrace Jira Integration

The `@summit/jira-integration` package automates PerfTrace ticket creation and lifecycle management in Jira. It provides opinionated helpers for applying Summit workflow conventions, enforcing custom field mappings, and capturing audit trails for every Jira interaction.

## Features

- **Automated ticket creation** – Build PerfTrace issues with consistent custom field mappings, severity tagging, and owner assignment.
- **Priority & severity governance** – Translate PerfTrace severity levels into Jira priorities and severity custom fields.
- **Workflow automation** – Perform workflow transitions and synchronize ticket state based on Summit-specific mappings.
- **Bulk operations** – Create batches of PerfTrace tickets with resilient error handling and audit logging.
- **Attachment & link handling** – Upload performance artifacts and link to related incidents or follow-up work.
- **Webhook processing** – React to Jira webhook payloads for downstream automation.
- **Audit-ready logging** – Capture structured audit events for every Jira request and integration action.

## Getting Started

```bash
# install dependencies from the monorepo root
npm install

# run tests with coverage
npx jest packages/jira-integration --coverage

# build the package
npm run --workspace=@summit/jira-integration build
```

### Configuration

```ts
import {
  JiraIntegrationService,
  JiraApiClient,
  InMemoryAuditLogger,
} from '@summit/jira-integration';

const config = {
  baseUrl: 'https://your-domain.atlassian.net',
  email: process.env.JIRA_EMAIL!,
  apiToken: process.env.JIRA_TOKEN!,
  projectKey: 'PERF',
  issueTypeId: '12345',
  customFieldMap: {
    environment: 'customfield_10100',
    regressionWindow: 'customfield_10101',
    owners: 'customfield_10102',
    perfMetric: 'customfield_10103',
    baselineValue: 'customfield_10104',
    currentValue: 'customfield_10105',
  },
  priorityMapping: {
    blocker: {
      priorityId: '1',
      severityFieldId: 'customfield_10200',
      severityValue: 'Blocker',
    },
    critical: {
      priorityId: '2',
      severityFieldId: 'customfield_10200',
      severityValue: 'Critical',
    },
    high: {
      priorityId: '3',
      severityFieldId: 'customfield_10200',
      severityValue: 'High',
    },
    medium: {
      priorityId: '4',
      severityFieldId: 'customfield_10200',
      severityValue: 'Medium',
    },
    low: {
      priorityId: '5',
      severityFieldId: 'customfield_10200',
      severityValue: 'Low',
    },
    info: {
      priorityId: '6',
      severityFieldId: 'customfield_10200',
      severityValue: 'Informational',
    },
  },
  workflowTransitions: {
    Triaged: 'In Progress',
    'Ready for QA': 'QA In Progress',
    Resolved: 'Validation',
  },
};

const auditLogger = new InMemoryAuditLogger();
const client = new JiraApiClient(config, auditLogger);
const integration = new JiraIntegrationService(config, client, auditLogger);
```

### Creating a PerfTrace Ticket

```ts
await integration.createPerfTraceTicket({
  summary: 'Perf regression detected in checkout latency',
  description: 'p95 response time exceeded baseline for 5 consecutive minutes.',
  severity: 'critical',
  environment: 'prod',
  regressionWindow: '24h',
  owners: ['account-id-1'],
  perfMetric: 'checkout_latency_p95',
  baselineValue: 120,
  currentValue: 210,
  labels: ['perftrace'],
  relatedIssueKeys: ['PLAT-21'],
});
```

### Webhook Handling

```ts
export const onJiraWebhook = (event: JiraWebhookEvent) => {
  const result = integration.handleWebhook(event);
  if (result?.transitioned) {
    // enqueue downstream updates or notifications
  }
};
```

## Documentation

- [Integration Guide](./docs/integration-guide.md)
- [PerfTrace Ticket Templates](./docs/templates/perftrace-ticket-templates.md)

## Testing & Quality Gates

- **TypeScript strict mode** is enforced via the package `tsconfig.json`.
- Run `npm run lint` at the repository root to ensure ESLint validation.
- Unit tests target >80% coverage; see `npm run test --workspace=@summit/jira-integration` for package-only execution.
