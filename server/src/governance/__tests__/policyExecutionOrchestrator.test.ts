import { PolicyExecutionOrchestrator } from '../policyExecutionOrchestrator.js';
import { Policy } from '../types.js';

describe('PolicyExecutionOrchestrator', () => {
  const orchestrator = new PolicyExecutionOrchestrator();

  it('escalates ingestion when PII is detected and provides a redacted payload', () => {
    const result = orchestrator.evaluate({
      stage: 'ingest',
      tenantId: 'tenant-a',
      payload: { record: { email: 'analyst@example.mil', notes: 'Contains SSN 123-45-6789' } },
      user: {
        id: 'user-1',
        role: 'viewer',
        tenantId: 'tenant-a',
      },
    });

    expect(result.action).toBe('ESCALATE');
    expect(result.piiFindings).toEqual(expect.arrayContaining(['record.email', 'record.notes']));
    expect(result.redactedPayload.record.email).not.toBe('analyst@example.mil');
    expect(result.reasons).toContain('PII detected during ingestion; escalation required');
  });

  it('denies retrieval when the case is not in the user allow list', () => {
    const result = orchestrator.evaluate({
      stage: 'retrieval',
      tenantId: 'tenant-a',
      caseId: 'case-b',
      payload: { resource: 'intel-report-7' },
      user: {
        id: 'user-2',
        role: 'analyst',
        tenantId: 'tenant-a',
        allowedCases: ['case-a'],
        exportControls: { destinations: ['US'], defaultAction: 'DENY' },
      },
      destinationCountry: 'US',
    });

    expect(result.action).toBe('DENY');
    expect(result.reasons.join(' ')).toContain('case-level-access');
  });

  it('allows retrieval when the case, export, and policies pass', () => {
    const result = orchestrator.evaluate({
      stage: 'retrieval',
      tenantId: 'tenant-a',
      caseId: 'case-a',
      payload: { resource: 'intel-report-7' },
      user: {
        id: 'user-3',
        role: 'analyst',
        tenantId: 'tenant-a',
        allowedCases: ['case-a'],
        exportControls: { destinations: ['US', 'UK'], defaultAction: 'DENY' },
      },
      destinationCountry: 'US',
    });

    expect(result.action).toBe('ALLOW');
    expect(result.governanceVerdict.action).toBe('ALLOW');
    expect(result.piiFindings).toHaveLength(0);
  });

  it('denies tool use for unsafe tools when user is not admin', () => {
    const result = orchestrator.evaluate({
      stage: 'tool_use',
      tenantId: 'tenant-a',
      payload: { tool: 'system_shell' },
      user: {
        id: 'user-4',
        role: 'viewer',
        tenantId: 'tenant-a',
        exportControls: { destinations: ['US'], defaultAction: 'DENY' },
      },
    });

    expect(result.action).toBe('DENY');
    expect(result.governanceVerdict.policyIds).toContain('tool-unsafe-deny');
  });

  it('denies output with PII when not tied to a case', () => {
    const result = orchestrator.evaluate({
      stage: 'output',
      tenantId: 'tenant-a',
      payload: { response: 'Reach me at 555-123-4567' },
      user: {
        id: 'user-5',
        role: 'analyst',
        tenantId: 'tenant-a',
        allowedCases: ['case-a'],
        exportControls: { destinations: ['US'], defaultAction: 'DENY' },
      },
      destinationCountry: 'US',
    });

    expect(result.action).toBe('DENY');
    expect(result.reasons.join(' ')).toContain('case-level-access');
  });

  it('supports custom policies and opa decisions', () => {
    const customPolicies: Policy[] = [
      {
        id: 'retention-mandatory',
        description: 'Require retention days to be set',
        scope: { stages: ['ingest'], tenants: ['*'] },
        rules: [{ field: 'metadata.retentionDays', operator: 'gt', value: 0 }],
        action: 'ALLOW',
      },
    ];

    const customOrchestrator = new PolicyExecutionOrchestrator({ policies: customPolicies });
    const result = customOrchestrator.evaluate({
      stage: 'ingest',
      tenantId: 'tenant-a',
      retentionDays: 45,
      payload: { record: { name: 'Analyst', email: 'analyst@example.mil' } },
      user: {
        id: 'user-6',
        role: 'viewer',
        tenantId: 'tenant-a',
        exportControls: { destinations: ['US'], defaultAction: 'ALLOW' },
      },
    });

    expect(result.retention?.policyDays).toBe(45);
    expect(result.reasons).toContain('PII detected during ingestion; escalation required');
  });
});
