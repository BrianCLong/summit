// tests/fixtures/soc-events.ts

import { AuditEvent } from '../../server/src/security/soc/correlation';

export const socEvents: AuditEvent[] = [
  // Scenario 1: Correlated by trace_id
  {
    actor: { id: 'user-1', ip_address: '192.168.1.1' },
    action: 'read',
    resource: { id: 'file-abc', owner: 'org-1' },
    classification: 'internal',
    policy_version: 'v1',
    decision_id: 'decision-1',
    trace_id: 'trace-a',
    timestamp: new Date().toISOString(),
    customer: 'customer-1',
    metadata: { decision: 'allow' },
  },
  {
    actor: { id: 'user-1', ip_address: '192.168.1.1' },
    action: 'write',
    resource: { id: 'file-abc', owner: 'org-1' },
    classification: 'internal',
    policy_version: 'v1',
    decision_id: 'decision-2',
    trace_id: 'trace-a',
    timestamp: new Date(Date.now() + 1000).toISOString(),
    customer: 'customer-1',
    metadata: { decision: 'allow' },
  },

  // Scenario 2: Multiple failed actions by the same actor
  {
    actor: { id: 'user-2', ip_address: '10.0.0.5' },
    action: 'delete',
    resource: { id: 'file-xyz', owner: 'org-2' },
    classification: 'confidential',
    policy_version: 'v1',
    decision_id: 'decision-3',
    trace_id: 'trace-b',
    timestamp: new Date().toISOString(),
    customer: 'customer-2',
    metadata: { decision: 'deny', reason: 'unauthorized' },
  },
  {
    actor: { id: 'user-2', ip_address: '10.0.0.5' },
    action: 'delete',
    resource: { id: 'file-xyz', owner: 'org-2' },
    classification: 'confidential',
    policy_version: 'v1',
    decision_id: 'decision-4',
    trace_id: 'trace-c',
    timestamp: new Date(Date.now() + 2000).toISOString(),
    customer: 'customer-2',
    metadata: { decision: 'deny', reason: 'unauthorized' },
  },

  // Noise event
  {
    actor: { id: 'user-3', ip_address: '172.16.0.10' },
    action: 'read',
    resource: { id: 'file-123', owner: 'org-1' },
    classification: 'public',
    policy_version: 'v1',
    decision_id: 'decision-5',
    trace_id: 'trace-d',
    timestamp: new Date().toISOString(),
    customer: 'customer-1',
    metadata: { decision: 'allow' },
  },
];
