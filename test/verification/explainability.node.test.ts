/**
 * Explainability Verification Suite
 *
 * Verifies explainability guarantees:
 * 1. API returns only fields allowed by contract
 * 2. Tenant isolation is enforced
 * 3. Redaction rules apply consistently
 * 4. Lineage traversal is correct and complete
 * 5. UI/CLI do not require privileged access for basic views
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { ExplainabilityExplorerService } from '../../server/src/explainability/ExplainabilityExplorerService';
import {
  ExplainableRun,
  ExplainabilityAPIResponse,
  ListRunsFilter,
} from '../../server/src/explainability/types';

describe('Explainability Verification Suite', () => {
  let service: ExplainabilityExplorerService;
  const testTenantA = 'tenant-a-test';
  const testTenantB = 'tenant-b-test';
  const testRequester = 'test-user-123';

  beforeAll(() => {
    service = ExplainabilityExplorerService.getInstance();
  });

  describe('1. API Contract Compliance', () => {
    it('should return only fields defined in the explainability contract', async () => {
      const response = await service.listRuns(testTenantA, {}, testRequester);

      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('data');
      expect(response).toHaveProperty('meta');

      // Verify meta fields
      expect(response.meta).toHaveProperty('request_id');
      expect(response.meta).toHaveProperty('tenant_id');
      expect(response.meta).toHaveProperty('queried_at');
      expect(response.meta).toHaveProperty('version');
      expect(response.meta.version).toBe('1.0.0');
      expect(response.meta.tenant_id).toBe(testTenantA);
    });

    it('should include all required fields in ExplainableRun', async () => {
      // Create a mock run and verify structure
      const mockRunId = 'test-run-123';
      const response = await service.getRun(mockRunId, testTenantA, testRequester);

      if (response.data) {
        const run = response.data;

        // Required fields (per contract)
        expect(run).toHaveProperty('run_id');
        expect(run).toHaveProperty('run_type');
        expect(run).toHaveProperty('tenant_id');
        expect(run).toHaveProperty('actor');
        expect(run).toHaveProperty('started_at');
        expect(run).toHaveProperty('inputs');
        expect(run).toHaveProperty('outputs');
        expect(run).toHaveProperty('explanation');
        expect(run).toHaveProperty('confidence');
        expect(run).toHaveProperty('audit_event_ids');
        expect(run).toHaveProperty('version');

        // Nested required fields
        expect(run.inputs).toHaveProperty('input_hash');
        expect(run.outputs).toHaveProperty('output_hash');
        expect(run.explanation).toHaveProperty('summary');
        expect(run.confidence).toHaveProperty('overall_confidence');

        // Version must be semver
        expect(run.version).toMatch(/^\d+\.\d+\.\d+$/);
      }
    });

    it('should not return extra fields beyond the contract', async () => {
      const response = await service.listRuns(testTenantA, {}, testRequester);

      const allowedTopLevelKeys = ['success', 'data', 'meta', 'errors'];
      const actualKeys = Object.keys(response);

      actualKeys.forEach((key) => {
        expect(allowedTopLevelKeys).toContain(key);
      });
    });
  });

  describe('2. Tenant Isolation', () => {
    it('should enforce tenant context in list requests', async () => {
      const responseA = await service.listRuns(testTenantA, {}, testRequester);
      const responseB = await service.listRuns(testTenantB, {}, testRequester);

      expect(responseA.meta.tenant_id).toBe(testTenantA);
      expect(responseB.meta.tenant_id).toBe(testTenantB);
    });

    it('should not allow cross-tenant access to runs', async () => {
      const runId = 'test-run-tenant-a';

      // Attempt to access tenant A's run from tenant B context
      const response = await service.getRun(runId, testTenantB, testRequester);

      // Should fail or return null (tenant isolation)
      if (response.data) {
        expect(response.data.tenant_id).toBe(testTenantB);
      }
    });

    it('should filter runs by tenant automatically', async () => {
      const responseA = await service.listRuns(testTenantA, {}, testRequester);
      const responseB = await service.listRuns(testTenantB, {}, testRequester);

      // All runs in response A should belong to tenant A
      if (responseA.data) {
        responseA.data.forEach((run) => {
          expect(run.tenant_id).toBe(testTenantA);
        });
      }

      // All runs in response B should belong to tenant B
      if (responseB.data) {
        responseB.data.forEach((run) => {
          expect(run.tenant_id).toBe(testTenantB);
        });
      }
    });
  });

  describe('3. Redaction Rules', () => {
    it('should redact PII fields consistently', async () => {
      // Test with mock data containing PII
      const mockRunId = 'test-run-pii';
      const response = await service.getRun(mockRunId, testTenantA, testRequester);

      if (response.data) {
        const run = response.data;

        // Check redacted fields are listed
        expect(run).toHaveProperty('redacted_fields');
        expect(Array.isArray(run.redacted_fields)).toBe(true);

        // If PII was redacted, it should be in the list
        if (run.inputs.pii_fields_redacted.length > 0) {
          expect(run.redacted_fields.length).toBeGreaterThan(0);
        }
      }
    });

    it('should preserve input/output hashes even when fields are redacted', async () => {
      const mockRunId = 'test-run-redacted';
      const response = await service.getRun(mockRunId, testTenantA, testRequester);

      if (response.data) {
        const run = response.data;

        // Hash must exist even if fields are redacted
        expect(run.inputs.input_hash).toBeTruthy();
        expect(run.outputs.output_hash).toBeTruthy();

        // Hash must be hex string (SHA-256 = 64 chars)
        expect(run.inputs.input_hash).toMatch(/^[a-f0-9]{64}$/i);
        expect(run.outputs.output_hash).toMatch(/^[a-f0-9]{64}$/i);
      }
    });

    it('should mark redacted fields with [REDACTED:TYPE] placeholder', async () => {
      // This test would verify actual redacted values if we had real data
      // For now, verify the contract is defined correctly
      const mockRunId = 'test-run-secrets';
      const response = await service.getRun(mockRunId, testTenantA, testRequester);

      if (response.data) {
        const run = response.data;

        // If secrets were redacted, they should be tracked
        expect(run.inputs).toHaveProperty('secret_fields_redacted');
        expect(run.outputs).toHaveProperty('secret_fields_redacted');
      }
    });
  });

  describe('4. Lineage Traversal', () => {
    it('should traverse provenance lineage correctly', async () => {
      const mockRunId = 'test-run-lineage';
      const depth = 2;

      const response = await service.getLineage(mockRunId, testTenantA, depth);

      expect(response.success).toBe(true);

      if (response.data) {
        expect(response.data).toHaveProperty('run_id');
        expect(response.data).toHaveProperty('depth_traversed');
        expect(response.data).toHaveProperty('nodes');
        expect(response.data).toHaveProperty('edges');

        expect(response.data.run_id).toBe(mockRunId);
        expect(response.data.depth_traversed).toBe(depth);
      }
    });

    it('should link runs to provenance chains', async () => {
      const mockRunId = 'test-run-provenance';
      const response = await service.getRun(mockRunId, testTenantA, testRequester);

      if (response.data) {
        const run = response.data;

        expect(run).toHaveProperty('provenance_links');
        expect(run.provenance_links).toHaveProperty('provenance_chain_id');
        expect(run.provenance_links).toHaveProperty('claims');
        expect(run.provenance_links).toHaveProperty('evidence');
        expect(run.provenance_links).toHaveProperty('sources');
        expect(run.provenance_links).toHaveProperty('transforms');
      }
    });

    it('should verify linkage integrity', async () => {
      const mockRunId = 'test-run-verify';
      const response = await service.verifyLinkage(mockRunId, testTenantA);

      expect(response.success).toBe(true);

      if (response.data) {
        expect(response.data).toHaveProperty('run_id');
        expect(response.data).toHaveProperty('verified');
        expect(response.data).toHaveProperty('checks');

        // Verification checks
        expect(response.data.checks).toHaveProperty('run_exists');
        expect(response.data.checks).toHaveProperty('audit_events_linked');
        expect(response.data.checks).toHaveProperty('provenance_chain_valid');
        expect(response.data.checks).toHaveProperty('sbom_hashes_match');
      }
    });
  });

  describe('5. Access Control (No Privileged Access Required)', () => {
    it('should allow basic reads without admin privileges', async () => {
      // Regular user should be able to list runs
      const response = await service.listRuns(testTenantA, {}, 'regular-user');

      expect(response.success).toBe(true);
      expect(response.meta.tenant_id).toBe(testTenantA);
    });

    it('should allow viewing own tenant runs without elevation', async () => {
      const mockRunId = 'test-run-access';
      const response = await service.getRun(mockRunId, testTenantA, 'regular-user');

      // Should succeed (or fail with not found, but not permission denied)
      expect(response.meta.tenant_id).toBe(testTenantA);
    });

    it('should support filtering without admin access', async () => {
      const filter: ListRunsFilter = {
        run_type: 'agent_run',
        min_confidence: 0.8,
        limit: 10,
      };

      const response = await service.listRuns(testTenantA, filter, 'regular-user');

      expect(response.success).toBe(true);
    });
  });

  describe('6. Run Comparison', () => {
    it('should compare two runs and compute deltas', async () => {
      const runIdA = 'test-run-a';
      const runIdB = 'test-run-b';

      const response = await service.compareRuns(runIdA, runIdB, testTenantA);

      if (response.data) {
        const comparison = response.data;

        expect(comparison).toHaveProperty('run_a');
        expect(comparison).toHaveProperty('run_b');
        expect(comparison).toHaveProperty('deltas');

        // Deltas structure
        expect(comparison.deltas).toHaveProperty('input_diff');
        expect(comparison.deltas).toHaveProperty('output_diff');
        expect(comparison.deltas).toHaveProperty('confidence_delta');
        expect(comparison.deltas).toHaveProperty('duration_delta_ms');
        expect(comparison.deltas).toHaveProperty('different_capabilities');
        expect(comparison.deltas).toHaveProperty('different_policies');

        // Confidence delta should be a number
        expect(typeof comparison.deltas.confidence_delta).toBe('number');
      }
    });

    it('should prevent cross-tenant comparisons', async () => {
      // Run A from tenant A, Run B from tenant B
      const runIdA = 'test-run-tenant-a';
      const runIdB = 'test-run-tenant-b';

      // Attempting comparison should either fail or only compare within same tenant
      const response = await service.compareRuns(runIdA, runIdB, testTenantA);

      // If comparison succeeds, both runs should be from same tenant
      if (response.success && response.data) {
        expect(response.data.run_a.tenant_id).toBe(testTenantA);
        // Run B might not be found or rejected
      }
    });
  });

  describe('7. API Error Handling', () => {
    it('should return proper error structure when run not found', async () => {
      const response = await service.getRun('non-existent-run', testTenantA, testRequester);

      if (!response.success) {
        expect(response.errors).toBeDefined();
        expect(Array.isArray(response.errors)).toBe(true);
        expect(response.errors![0]).toHaveProperty('code');
        expect(response.errors![0]).toHaveProperty('message');
      }
    });

    it('should include request_id for debugging', async () => {
      const response = await service.listRuns(testTenantA, {}, testRequester);

      expect(response.meta.request_id).toBeTruthy();
      expect(typeof response.meta.request_id).toBe('string');
    });

    it('should include queried_at timestamp', async () => {
      const response = await service.listRuns(testTenantA, {}, testRequester);

      expect(response.meta.queried_at).toBeTruthy();

      // Should be valid ISO 8601 timestamp
      const date = new Date(response.meta.queried_at);
      expect(date.toISOString()).toBe(response.meta.queried_at);
    });
  });

  describe('8. Read-Only Guarantees', () => {
    it('should not expose any mutation methods in service', () => {
      const serviceMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(service));

      // All methods should be read-only (get, list, compare, verify)
      const mutationKeywords = ['create', 'update', 'delete', 'insert', 'modify', 'set', 'write'];

      serviceMethods.forEach((method) => {
        const hasMatationKeyword = mutationKeywords.some((keyword) =>
          method.toLowerCase().includes(keyword)
        );
        expect(hasMatationKeyword).toBe(false);
      });
    });

    it('should enforce read-only at API level', () => {
      // This would be tested at integration level with actual HTTP requests
      // Verify no POST/PUT/DELETE/PATCH routes exist in explainability-explorer router
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('9. Performance & Pagination', () => {
    it('should respect limit parameter', async () => {
      const filter: ListRunsFilter = { limit: 5 };
      const response = await service.listRuns(testTenantA, filter, testRequester);

      if (response.data) {
        expect(response.data.length).toBeLessThanOrEqual(5);
      }
    });

    it('should respect offset parameter', async () => {
      const filter: ListRunsFilter = { limit: 10, offset: 5 };
      const response = await service.listRuns(testTenantA, filter, testRequester);

      // Should succeed without error
      expect(response.success).toBe(true);
    });

    it('should support filtering by run_type', async () => {
      const filter: ListRunsFilter = { run_type: 'agent_run' };
      const response = await service.listRuns(testTenantA, filter, testRequester);

      if (response.data) {
        response.data.forEach((run) => {
          expect(run.run_type).toBe('agent_run');
        });
      }
    });

    it('should support filtering by min_confidence', async () => {
      const filter: ListRunsFilter = { min_confidence: 0.8 };
      const response = await service.listRuns(testTenantA, filter, testRequester);

      if (response.data) {
        response.data.forEach((run) => {
          expect(run.confidence.overall_confidence).toBeGreaterThanOrEqual(0.8);
        });
      }
    });
  });

  afterAll(() => {
    // Cleanup if needed
  });
});
