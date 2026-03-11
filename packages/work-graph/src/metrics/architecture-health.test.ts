import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateArchitectureHealth } from './architecture-health.js';
import type { WorkGraphNode } from '../schema/nodes.js';
import type { WorkGraphEdge } from '../schema/edges.js';

function node(id: string): WorkGraphNode {
  const now = new Date('2026-01-01T00:00:00Z');
  return {
    id,
    type: 'ticket',
    title: `Ticket ${id}`,
    description: 'desc',
    status: 'backlog',
    priority: 'P2',
    ticketType: 'unknown',
    labels: [],
    agentEligible: false,
    complexity: 'unknown',
    createdAt: now,
    updatedAt: now,
    createdBy: 'test',
  };
}

function edge(id: string, sourceId: string, targetId: string, type: WorkGraphEdge['type']): WorkGraphEdge {
  return {
    id,
    type,
    sourceId,
    targetId,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    createdBy: 'test',
    weight: 1,
  };
}

test('calculateArchitectureHealth penalizes cycles and coupling', () => {
  const a = '11111111-1111-4111-8111-111111111111';
  const b = '22222222-2222-4222-8222-222222222222';
  const c = '33333333-3333-4333-8333-333333333333';

  const result = calculateArchitectureHealth(
    [node(a), node(b), node(c)],
    [
      edge('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', a, b, 'depends_on'),
      edge('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', b, c, 'depends_on'),
      edge('cccccccc-cccc-4ccc-8ccc-cccccccccccc', c, a, 'depends_on'),
      edge('dddddddd-dddd-4ddd-8ddd-dddddddddddd', a, c, 'blocks'),
    ],
  );

  assert.ok(result.score < 100);
  assert.ok(result.circularDependencies > 0);
  assert.ok(result.primaryRisks.length > 0);
});

