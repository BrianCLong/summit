/**
 * GraphRAG Policy Guard Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  DefaultPolicyEngine,
  MockPolicyEngine,
  filterEvidenceByPolicy,
  applyPolicyToContext,
  canAccessCase,
} from '../../services/graphrag/policy-guard.js';
import { UserContext, EvidenceSnippet, GraphContext } from '../../services/graphrag/types.js';

describe('GraphRAG Policy Guard', () => {
  describe('DefaultPolicyEngine', () => {
    let policyEngine: DefaultPolicyEngine;

    beforeEach(() => {
      policyEngine = new DefaultPolicyEngine();
    });

    it('should allow access when user has sufficient clearance', () => {
      const user: UserContext = {
        userId: 'user-1',
        roles: [],
        clearances: ['SECRET'],
      };

      const decision = policyEngine.canViewEvidence({
        user,
        evidenceId: 'ev-1',
        metadata: { classification: 'CONFIDENTIAL' },
      });

      expect(decision.allow).toBe(true);
    });

    it('should deny access when user lacks clearance', () => {
      const user: UserContext = {
        userId: 'user-1',
        roles: [],
        clearances: ['CONFIDENTIAL'],
      };

      const decision = policyEngine.canViewEvidence({
        user,
        evidenceId: 'ev-1',
        metadata: { classification: 'SECRET' },
      });

      expect(decision.allow).toBe(false);
      expect(decision.reason).toContain('Insufficient clearance');
    });

    it('should deny access when missing need-to-know tag', () => {
      const user: UserContext = {
        userId: 'user-1',
        roles: [],
        clearances: ['TS'],
        needToKnowTags: ['PROJECT_A'],
      };

      const decision = policyEngine.canViewEvidence({
        user,
        evidenceId: 'ev-1',
        metadata: { needToKnowTags: ['PROJECT_B', 'PROJECT_C'] },
      });

      expect(decision.allow).toBe(false);
      expect(decision.reason).toContain('need-to-know');
    });

    it('should allow access when user has matching need-to-know tag', () => {
      const user: UserContext = {
        userId: 'user-1',
        roles: [],
        clearances: ['SECRET'],
        needToKnowTags: ['PROJECT_A', 'PROJECT_B'],
      };

      const decision = policyEngine.canViewEvidence({
        user,
        evidenceId: 'ev-1',
        metadata: { needToKnowTags: ['PROJECT_B'] },
      });

      expect(decision.allow).toBe(true);
    });

    it('should deny access when license does not allow analytics', () => {
      const user: UserContext = {
        userId: 'user-1',
        roles: [],
        clearances: ['SECRET'],
      };

      const decision = policyEngine.canViewEvidence({
        user,
        evidenceId: 'ev-1',
        metadata: { licenseType: 'EXPORT_ONLY' },
      });

      expect(decision.allow).toBe(false);
      expect(decision.reason).toContain('License type');
    });

    it('should allow access when license allows analytics', () => {
      const user: UserContext = {
        userId: 'user-1',
        roles: [],
        clearances: [],
      };

      const decision = policyEngine.canViewEvidence({
        user,
        evidenceId: 'ev-1',
        metadata: { licenseType: 'ANALYZE' },
      });

      expect(decision.allow).toBe(true);
    });

    it('should enforce tenant isolation', () => {
      const user: UserContext = {
        userId: 'user-1',
        roles: [],
        clearances: [],
        tenantId: 'tenant-A',
      };

      const decision = policyEngine.canViewEvidence({
        user,
        evidenceId: 'ev-1',
        metadata: { tenantId: 'tenant-B' },
      });

      expect(decision.allow).toBe(false);
      expect(decision.reason).toContain('different tenant');
    });
  });

  describe('filterEvidenceByPolicy', () => {
    it('should filter out evidence user cannot view', () => {
      const policyEngine = new MockPolicyEngine();
      policyEngine.denyEvidence('ev-2');

      const user: UserContext = {
        userId: 'user-1',
        roles: [],
        clearances: [],
      };

      const evidence: EvidenceSnippet[] = [
        { evidenceId: 'ev-1', snippet: 'Evidence 1', score: 0.9 },
        { evidenceId: 'ev-2', snippet: 'Evidence 2', score: 0.8 },
        { evidenceId: 'ev-3', snippet: 'Evidence 3', score: 0.7 },
      ];

      const { allowed, filtered, filterReasons } = filterEvidenceByPolicy(
        evidence,
        user,
        policyEngine,
      );

      expect(allowed.length).toBe(2);
      expect(filtered.length).toBe(1);
      expect(filtered[0].evidenceId).toBe('ev-2');
      expect(filterReasons.has('ev-2')).toBe(true);
    });

    it('should allow all evidence when policy allows', () => {
      const policyEngine = new MockPolicyEngine();
      policyEngine.setAllowAll(true);

      const user: UserContext = {
        userId: 'user-1',
        roles: [],
        clearances: [],
      };

      const evidence: EvidenceSnippet[] = [
        { evidenceId: 'ev-1', snippet: 'Evidence 1', score: 0.9 },
        { evidenceId: 'ev-2', snippet: 'Evidence 2', score: 0.8 },
      ];

      const { allowed, filtered } = filterEvidenceByPolicy(
        evidence,
        user,
        policyEngine,
      );

      expect(allowed.length).toBe(2);
      expect(filtered.length).toBe(0);
    });

    it('should filter all evidence when policy denies all', () => {
      const policyEngine = new MockPolicyEngine();
      policyEngine.setAllowAll(false);

      const user: UserContext = {
        userId: 'user-1',
        roles: [],
        clearances: [],
      };

      const evidence: EvidenceSnippet[] = [
        { evidenceId: 'ev-1', snippet: 'Evidence 1', score: 0.9 },
        { evidenceId: 'ev-2', snippet: 'Evidence 2', score: 0.8 },
      ];

      const { allowed, filtered } = filterEvidenceByPolicy(
        evidence,
        user,
        policyEngine,
      );

      expect(allowed.length).toBe(0);
      expect(filtered.length).toBe(2);
    });
  });

  describe('applyPolicyToContext', () => {
    it('should filter evidence in context and preserve nodes/edges', () => {
      const policyEngine = new MockPolicyEngine();
      policyEngine.denyEvidence('ev-2');

      const user: UserContext = {
        userId: 'user-1',
        roles: [],
        clearances: [],
      };

      const context: GraphContext = {
        nodes: [
          { id: 'n1', type: 'Person', label: 'John' },
          { id: 'n2', type: 'Person', label: 'Jane' },
        ],
        edges: [
          { id: 'e1', type: 'KNOWS', fromId: 'n1', toId: 'n2' },
        ],
        evidenceSnippets: [
          { evidenceId: 'ev-1', snippet: 'Evidence 1', score: 0.9 },
          { evidenceId: 'ev-2', snippet: 'Evidence 2', score: 0.8 },
        ],
      };

      const { filteredContext, policyDecisions } = applyPolicyToContext(
        context,
        user,
        policyEngine,
      );

      // Nodes and edges preserved
      expect(filteredContext.nodes.length).toBe(2);
      expect(filteredContext.edges.length).toBe(1);

      // Evidence filtered
      expect(filteredContext.evidenceSnippets.length).toBe(1);
      expect(filteredContext.evidenceSnippets[0].evidenceId).toBe('ev-1');

      // Policy decisions recorded
      expect(policyDecisions.filteredEvidenceCount).toBe(1);
      expect(policyDecisions.allowedEvidenceCount).toBe(1);
    });
  });

  describe('canAccessCase', () => {
    it('should return true when user is member of case', () => {
      const user: UserContext = {
        userId: 'user-1',
        roles: [],
        clearances: [],
        cases: ['case-1', 'case-2', 'case-3'],
      };

      expect(canAccessCase(user, 'case-2')).toBe(true);
    });

    it('should return false when user is not member of case', () => {
      const user: UserContext = {
        userId: 'user-1',
        roles: [],
        clearances: [],
        cases: ['case-1', 'case-3'],
      };

      expect(canAccessCase(user, 'case-2')).toBe(false);
    });

    it('should return true when no case membership tracking', () => {
      const user: UserContext = {
        userId: 'user-1',
        roles: [],
        clearances: [],
        // No cases array
      };

      expect(canAccessCase(user, 'case-2')).toBe(true);
    });
  });
});
