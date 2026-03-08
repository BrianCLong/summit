"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const logger_js_1 = require("../src/logger.js");
const client_js_1 = require("../src/client.js");
describe('JiraApiClient', () => {
    const config = {
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
        const auditLogger = new logger_js_1.InMemoryAuditLogger();
        const fetchMock = globals_1.jest
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
        const client = new client_js_1.JiraApiClient(config, auditLogger, fetchMock);
        const response = await client.request('/rest/api/3/issue', {
            method: 'GET',
        });
        expect(response.id).toBe('1');
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(auditLogger.getAll().length).toBeGreaterThan(0);
    });
    it('throws JiraApiError when retries exhausted', async () => {
        const auditLogger = new logger_js_1.InMemoryAuditLogger();
        const fetchMock = globals_1.jest
            .fn()
            .mockResolvedValue({ ok: false, status: 500, text: async () => 'error' });
        const client = new client_js_1.JiraApiClient(config, auditLogger, fetchMock);
        await expect(client.request('/rest/api/3/issue', { method: 'GET' })).rejects.toBeInstanceOf(client_js_1.JiraApiError);
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });
});
