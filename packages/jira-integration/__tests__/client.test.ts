import { jest } from '@jest/globals';
import { InMemoryAuditLogger } from '../src/logger.js';
import { JiraApiClient, JiraApiError, FetchImplementation } from '../src/client.js';
import { JiraIntegrationConfig } from '../src/types.js';

describe('JiraApiClient', () => {
  const config: JiraIntegrationConfig = {
    baseUrl: 'https://example.atlassian.net',
    email: 'bot@example.com',
    apiToken: 'token',
    projectKey: 'PERF',
    issueTypeId: '10001',
    customFieldMap: {
      environment: 'env',
      regressionWindow: 'regression',
      owners: 'owners',
      perfMetric: 'metric',
      baselineValue: 'baseline',
      currentValue: 'current',
    },
    priorityMapping: {
      blocker: {
        priorityId: '1',
        severityFieldId: 'sev',
        severityValue: 'Blocker',
      },
      critical: {
        priorityId: '2',
        severityFieldId: 'sev',
        severityValue: 'Critical',
      },
      high: { priorityId: '3', severityFieldId: 'sev', severityValue: 'High' },
      medium: {
        priorityId: '4',
        severityFieldId: 'sev',
        severityValue: 'Medium',
      },
      low: { priorityId: '5', severityFieldId: 'sev', severityValue: 'Low' },
      info: { priorityId: '6', severityFieldId: 'sev', severityValue: 'Info' },
    },
    workflowTransitions: {},
    maxRetries: 2,
    retryDelayMs: 1,
  };

  it('retries failed requests and eventually succeeds', async () => {
    const auditLogger = new InMemoryAuditLogger();
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'error',
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: '1' }),
      });

    const client = new JiraApiClient(
      config,
      auditLogger,
      fetchMock as unknown as FetchImplementation,
    );
    const response = await client.request<{ id: string }>('/rest/api/3/issue', {
      method: 'GET',
    });

    expect(response.id).toBe('1');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(auditLogger.getAll().length).toBeGreaterThan(0);
  });

  it('throws JiraApiError when retries exhausted', async () => {
    const auditLogger = new InMemoryAuditLogger();
    const fetchMock = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 500, text: async () => 'error' });

    const client = new JiraApiClient(
      config,
      auditLogger,
      fetchMock as unknown as FetchImplementation,
    );
    await expect(
      client.request('/rest/api/3/issue', { method: 'GET' }),
    ).rejects.toBeInstanceOf(JiraApiError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
