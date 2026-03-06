import { generateEvidenceId, verifyEvidenceId } from '../../src/graphrag/atg/evidence.js';
import { EsgSnapshot, EsgNode, EsgEdge } from '../../src/graphrag/atg/esg/schema.js';
import { ESG_NODE_WEIGHTS, ESG_EDGE_WEIGHTS } from '../../src/graphrag/atg/esg/weights.js';
import { TecfEvent } from '../../src/graphrag/atg/tecf.js';

describe('Adaptive Tradecraft Graph (ATG) Schema & Evidence', () => {

  describe('Evidence Integrity', () => {
    it('generates deterministic evidence IDs', () => {
      const content1 = { a: 1, b: 2 };
      const content2 = { b: 2, a: 1 }; // Different key order

      const id1 = generateEvidenceId(content1);
      const id2 = generateEvidenceId(content2);

      expect(id1).toBe(id2);
      expect(id1).toMatch(/^EVD-[a-f0-9]{16}$/);
    });

    it('verifies valid evidence IDs', () => {
      const content = { foo: 'bar', baz: [1, 2, 3] };
      const id = generateEvidenceId(content);

      expect(verifyEvidenceId(id, content)).toBe(true);
      expect(verifyEvidenceId('EVD-invalid', content)).toBe(false);
      expect(verifyEvidenceId(id, { foo: 'bar', baz: [1, 2, 4] })).toBe(false);
    });
  });

  describe('ESG Schema', () => {
    it('supports defined node types', () => {
      const node: EsgNode = {
        tenant_id: 't1',
        id: 'n1',
        type: 'IdentityNode',
        weight: ESG_NODE_WEIGHTS.IdentityNode,
        attrs: { username: 'jdoe' },
        evidence_ids: ['EVD-123'],
        t_first: '2025-09-15T00:00:00Z',
        t_last: '2025-09-15T01:00:00Z'
      };

      expect(node.type).toBe('IdentityNode');
      expect(node.weight).toBe(1.0);
    });

    it('supports defined edge types', () => {
      const edge: EsgEdge = {
        tenant_id: 't1',
        id: 'e1',
        source: 'n1',
        target: 'n2',
        type: 'AccessEdge',
        weight: ESG_EDGE_WEIGHTS.AccessEdge,
        attrs: {},
        evidence_ids: [],
        t_first: '2025-09-15T00:00:00Z',
        t_last: '2025-09-15T01:00:00Z'
      };

      expect(edge.type).toBe('AccessEdge');
      expect(edge.weight).toBe(1.0);
    });

    it('validates snapshot structure (compile-time check mostly)', () => {
      const snapshot: EsgSnapshot = {
        tenant_id: 't1',
        generated_at: '2025-09-15T12:00:00Z',
        valid_from: '2025-09-15T00:00:00Z',
        valid_to: '2025-09-15T23:59:59Z',
        nodes: [],
        edges: []
      };

      expect(snapshot.nodes).toBeInstanceOf(Array);
    });
  });

  describe('TECF', () => {
    it('supports optional evidence_id', () => {
      const event: TecfEvent = {
        id: 'evt-1',
        type: 'login',
        timestamp: '2025-09-15T10:00:00Z',
        source: 'okta',
        payload: { user: 'jdoe' },
        evidence_id: 'EVD-abc'
      };

      expect(event.evidence_id).toBeDefined();
    });
  });
});
