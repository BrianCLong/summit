import { describe, expect, it } from 'vitest';
import { compareNormalized } from '../src/diff/compare.js';
import { NormEdge, NormNode } from '../src/diff/normalizers.js';
import { planRepairs } from '../src/repair/planner.js';

const pgNodes: NormNode[] = [
  {
    type: 'User',
    id: '1',
    labels: ['User'],
    props: { email: 'a@example.com' },
    propsHash: 'hash-a',
  },
];

const pgEdges: NormEdge[] = [
  {
    fromType: 'User',
    fromId: '1',
    rel: 'OWNS',
    toType: 'Org',
    toId: '9',
    propsHash: 'edge-hash',
  },
];

describe('acceptance: drift -> plan -> parity guard', () => {
  it('plans repairs to restore parity from a drift snapshot', () => {
    const neoNodes: NormNode[] = [
      {
        type: 'User',
        id: '1',
        labels: ['User'],
        props: { email: 'b@example.com' },
        propsHash: 'hash-b',
      },
      {
        type: 'Org',
        id: '9',
        labels: ['Org'],
        props: { name: 'Acme' },
        propsHash: 'hash-org',
      },
    ];
    const neoEdges: NormEdge[] = [
      {
        fromType: 'User',
        fromId: '1',
        rel: 'OWNS',
        toType: 'Org',
        toId: '9',
        propsHash: 'edge-hash',
      },
      {
        fromType: 'User',
        fromId: '1',
        rel: 'MEMBER_OF',
        toType: 'Org',
        toId: '9',
        propsHash: 'edge-extra',
      },
    ];

    const drift = compareNormalized(pgNodes, neoNodes, pgEdges, neoEdges);
    expect(drift.parity).toBeLessThan(1);

    const plan = planRepairs(drift, { deleteExtras: true });
    expect(plan.summary.UPSERT_NODE).toBe(1);
    expect(plan.summary.DELETE_EDGE).toBe(1);
  });
});
