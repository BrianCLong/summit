import { jest } from '@jest/globals';
import { InMemoryAuditLogger } from '../src/logger.js';
import { JiraIntegrationService } from '../src/jiraIntegration.js';
import { JiraApiClient } from '../src/client.js';
import { JiraIntegrationConfig, PerfTraceTicketInput, JiraWebhookEvent } from '../src/types.js';

const baseConfig: JiraIntegrationConfig = {
  baseUrl: 'https://example.atlassian.net',
  email: 'bot@example.com',
  apiToken: 'token',
  projectKey: 'PERF',
  issueTypeId: '10001',
  customFieldMap: {
    environment: 'customfield_1',
    regressionWindow: 'customfield_2',
    owners: 'customfield_3',
    perfMetric: 'customfield_4',
    baselineValue: 'customfield_5',
    currentValue: 'customfield_6'
  },
  priorityMapping: {
    blocker: { priorityId: '1', severityFieldId: 'customfield_10', severityValue: 'Blocker' },
    critical: { priorityId: '2', severityFieldId: 'customfield_10', severityValue: 'Critical' },
    high: { priorityId: '3', severityFieldId: 'customfield_10', severityValue: 'High' },
    medium: { priorityId: '4', severityFieldId: 'customfield_10', severityValue: 'Medium' },
    low: { priorityId: '5', severityFieldId: 'customfield_10', severityValue: 'Low' },
    info: { priorityId: '6', severityFieldId: 'customfield_10', severityValue: 'Info' }
  },
  workflowTransitions: {
    Triaged: 'In Progress',
    Resolved: 'In Review'
  }
};

describe('JiraIntegrationService', () => {
  const ticketInput: PerfTraceTicketInput = {
    summary: 'Perf regression in checkout',
    description: 'Latency increase detected in checkout flow.',
    severity: 'critical',
    environment: 'prod',
    regressionWindow: '24h',
    owners: ['owner-account-id'],
    perfMetric: 'checkout_latency',
    baselineValue: 120,
    currentValue: 210,
    attachments: [
      {
        fileName: 'perf.csv',
        contentType: 'text/csv',
        data: Buffer.from('col1,col2')
      }
    ],
    relatedIssueKeys: ['PERF-100'],
    labels: ['perf', 'trace']
  };

  it('creates tickets with attachments and links', async () => {
    const auditLogger = new InMemoryAuditLogger();
    const requestMock = jest
      .fn()
      .mockResolvedValueOnce({ id: '1', key: 'PERF-1', self: 'self' })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    const client = { request: requestMock } as unknown as JiraApiClient;
    const service = new JiraIntegrationService(baseConfig, client, auditLogger);

    const ticket = await service.createPerfTraceTicket(ticketInput);

    expect(ticket.key).toBe('PERF-1');
    expect(requestMock).toHaveBeenNthCalledWith(
      1,
      '/rest/api/3/issue',
      expect.objectContaining({ method: 'POST' })
    );
    expect(requestMock).toHaveBeenNthCalledWith(
      2,
      '/rest/api/3/issue/1/attachments',
      expect.objectContaining({ headers: expect.objectContaining({ 'X-Atlassian-Token': 'no-check' }) })
    );
    expect(requestMock).toHaveBeenNthCalledWith(
      3,
      '/rest/api/3/issueLink',
      expect.objectContaining({ method: 'POST' })
    );
    expect(auditLogger.getAll()).toHaveLength(3);
  });

  it('transitions workflow when mapping exists', async () => {
    const auditLogger = new InMemoryAuditLogger();
    const requestMock = jest
      .fn()
      .mockResolvedValueOnce({
        transitions: [
          { id: '10', name: 'In Progress' }
        ]
      })
      .mockResolvedValueOnce({});
    const client = { request: requestMock } as unknown as JiraApiClient;

    const service = new JiraIntegrationService(baseConfig, client, auditLogger);
    const result = await service.syncWorkflow('1', 'Triaged');

    expect(result.transitioned).toBe(true);
    expect(result.targetState).toBe('In Progress');
    expect(requestMock).toHaveBeenCalledTimes(2);
  });

  it('returns no transition when status not mapped', async () => {
    const service = new JiraIntegrationService(
      baseConfig,
      { request: jest.fn() } as unknown as JiraApiClient,
      new InMemoryAuditLogger()
    );

    const result = await service.syncWorkflow('1', 'Unmapped');
    expect(result.transitioned).toBe(false);
  });

  it('processes webhook events and logs audit entries', () => {
    const auditLogger = new InMemoryAuditLogger();
    const service = new JiraIntegrationService(
      baseConfig,
      { request: jest.fn() } as unknown as JiraApiClient,
      auditLogger
    );

    const webhook: JiraWebhookEvent = {
      issue: {
        id: '1',
        key: 'PERF-1',
        fields: {
          status: { name: 'Triaged' },
          summary: 'Perf issue'
        }
      },
      webhookEvent: 'jira:issue_updated',
      changelog: {
        items: [
          {
            field: 'status',
            fromString: 'Open',
            toString: 'Triaged'
          }
        ]
      }
    };

    const result = service.handleWebhook(webhook);
    expect(result?.transitioned).toBe(true);
    expect(auditLogger.getAll()).toHaveLength(1);
  });

  it('continues bulk operations when one ticket fails', async () => {
    const auditLogger = new InMemoryAuditLogger();
    const requestMock = jest
      .fn()
      .mockResolvedValueOnce({ id: '1', key: 'PERF-1', self: 'self' })
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValue({});
    const client = { request: requestMock } as unknown as JiraApiClient;
    const service = new JiraIntegrationService(baseConfig, client, auditLogger);

    const results = await service.bulkCreatePerfTraceTickets([ticketInput, ticketInput]);
    expect(results).toHaveLength(1);
    expect(auditLogger.getAll().filter((entry) => entry.status === 'error')).toHaveLength(1);
  });
});
