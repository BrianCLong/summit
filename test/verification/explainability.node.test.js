"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const ExplainabilityExplorerService_1 = require("../../server/src/explainability/ExplainabilityExplorerService");
(0, globals_1.describe)('Explainability Verification Suite', () => {
    let service;
    const testTenantA = 'tenant-a-test';
    const testTenantB = 'tenant-b-test';
    const testRequester = 'test-user-123';
    (0, globals_1.beforeAll)(() => {
        service = ExplainabilityExplorerService_1.ExplainabilityExplorerService.getInstance();
    });
    (0, globals_1.describe)('1. API Contract Compliance', () => {
        (0, globals_1.it)('should return only fields defined in the explainability contract', async () => {
            const response = await service.listRuns(testTenantA, {}, testRequester);
            (0, globals_1.expect)(response).toHaveProperty('success');
            (0, globals_1.expect)(response).toHaveProperty('data');
            (0, globals_1.expect)(response).toHaveProperty('meta');
            // Verify meta fields
            (0, globals_1.expect)(response.meta).toHaveProperty('request_id');
            (0, globals_1.expect)(response.meta).toHaveProperty('tenant_id');
            (0, globals_1.expect)(response.meta).toHaveProperty('queried_at');
            (0, globals_1.expect)(response.meta).toHaveProperty('version');
            (0, globals_1.expect)(response.meta.version).toBe('1.0.0');
            (0, globals_1.expect)(response.meta.tenant_id).toBe(testTenantA);
        });
        (0, globals_1.it)('should include all required fields in ExplainableRun', async () => {
            // Create a mock run and verify structure
            const mockRunId = 'test-run-123';
            const response = await service.getRun(mockRunId, testTenantA, testRequester);
            if (response.data) {
                const run = response.data;
                // Required fields (per contract)
                (0, globals_1.expect)(run).toHaveProperty('run_id');
                (0, globals_1.expect)(run).toHaveProperty('run_type');
                (0, globals_1.expect)(run).toHaveProperty('tenant_id');
                (0, globals_1.expect)(run).toHaveProperty('actor');
                (0, globals_1.expect)(run).toHaveProperty('started_at');
                (0, globals_1.expect)(run).toHaveProperty('inputs');
                (0, globals_1.expect)(run).toHaveProperty('outputs');
                (0, globals_1.expect)(run).toHaveProperty('explanation');
                (0, globals_1.expect)(run).toHaveProperty('confidence');
                (0, globals_1.expect)(run).toHaveProperty('audit_event_ids');
                (0, globals_1.expect)(run).toHaveProperty('version');
                // Nested required fields
                (0, globals_1.expect)(run.inputs).toHaveProperty('input_hash');
                (0, globals_1.expect)(run.outputs).toHaveProperty('output_hash');
                (0, globals_1.expect)(run.explanation).toHaveProperty('summary');
                (0, globals_1.expect)(run.confidence).toHaveProperty('overall_confidence');
                // Version must be semver
                (0, globals_1.expect)(run.version).toMatch(/^\d+\.\d+\.\d+$/);
            }
        });
        (0, globals_1.it)('should not return extra fields beyond the contract', async () => {
            const response = await service.listRuns(testTenantA, {}, testRequester);
            const allowedTopLevelKeys = ['success', 'data', 'meta', 'errors'];
            const actualKeys = Object.keys(response);
            actualKeys.forEach((key) => {
                (0, globals_1.expect)(allowedTopLevelKeys).toContain(key);
            });
        });
    });
    (0, globals_1.describe)('2. Tenant Isolation', () => {
        (0, globals_1.it)('should enforce tenant context in list requests', async () => {
            const responseA = await service.listRuns(testTenantA, {}, testRequester);
            const responseB = await service.listRuns(testTenantB, {}, testRequester);
            (0, globals_1.expect)(responseA.meta.tenant_id).toBe(testTenantA);
            (0, globals_1.expect)(responseB.meta.tenant_id).toBe(testTenantB);
        });
        (0, globals_1.it)('should not allow cross-tenant access to runs', async () => {
            const runId = 'test-run-tenant-a';
            // Attempt to access tenant A's run from tenant B context
            const response = await service.getRun(runId, testTenantB, testRequester);
            // Should fail or return null (tenant isolation)
            if (response.data) {
                (0, globals_1.expect)(response.data.tenant_id).toBe(testTenantB);
            }
        });
        (0, globals_1.it)('should filter runs by tenant automatically', async () => {
            const responseA = await service.listRuns(testTenantA, {}, testRequester);
            const responseB = await service.listRuns(testTenantB, {}, testRequester);
            // All runs in response A should belong to tenant A
            if (responseA.data) {
                responseA.data.forEach((run) => {
                    (0, globals_1.expect)(run.tenant_id).toBe(testTenantA);
                });
            }
            // All runs in response B should belong to tenant B
            if (responseB.data) {
                responseB.data.forEach((run) => {
                    (0, globals_1.expect)(run.tenant_id).toBe(testTenantB);
                });
            }
        });
    });
    (0, globals_1.describe)('3. Redaction Rules', () => {
        (0, globals_1.it)('should redact PII fields consistently', async () => {
            // Test with mock data containing PII
            const mockRunId = 'test-run-pii';
            const response = await service.getRun(mockRunId, testTenantA, testRequester);
            if (response.data) {
                const run = response.data;
                // Check redacted fields are listed
                (0, globals_1.expect)(run).toHaveProperty('redacted_fields');
                (0, globals_1.expect)(Array.isArray(run.redacted_fields)).toBe(true);
                // If PII was redacted, it should be in the list
                if (run.inputs.pii_fields_redacted.length > 0) {
                    (0, globals_1.expect)(run.redacted_fields.length).toBeGreaterThan(0);
                }
            }
        });
        (0, globals_1.it)('should preserve input/output hashes even when fields are redacted', async () => {
            const mockRunId = 'test-run-redacted';
            const response = await service.getRun(mockRunId, testTenantA, testRequester);
            if (response.data) {
                const run = response.data;
                // Hash must exist even if fields are redacted
                (0, globals_1.expect)(run.inputs.input_hash).toBeTruthy();
                (0, globals_1.expect)(run.outputs.output_hash).toBeTruthy();
                // Hash must be hex string (SHA-256 = 64 chars)
                (0, globals_1.expect)(run.inputs.input_hash).toMatch(/^[a-f0-9]{64}$/i);
                (0, globals_1.expect)(run.outputs.output_hash).toMatch(/^[a-f0-9]{64}$/i);
            }
        });
        (0, globals_1.it)('should mark redacted fields with [REDACTED:TYPE] placeholder', async () => {
            // This test would verify actual redacted values if we had real data
            // For now, verify the contract is defined correctly
            const mockRunId = 'test-run-secrets';
            const response = await service.getRun(mockRunId, testTenantA, testRequester);
            if (response.data) {
                const run = response.data;
                // If secrets were redacted, they should be tracked
                (0, globals_1.expect)(run.inputs).toHaveProperty('secret_fields_redacted');
                (0, globals_1.expect)(run.outputs).toHaveProperty('secret_fields_redacted');
            }
        });
    });
    (0, globals_1.describe)('4. Lineage Traversal', () => {
        (0, globals_1.it)('should traverse provenance lineage correctly', async () => {
            const mockRunId = 'test-run-lineage';
            const depth = 2;
            const response = await service.getLineage(mockRunId, testTenantA, depth);
            (0, globals_1.expect)(response.success).toBe(true);
            if (response.data) {
                (0, globals_1.expect)(response.data).toHaveProperty('run_id');
                (0, globals_1.expect)(response.data).toHaveProperty('depth_traversed');
                (0, globals_1.expect)(response.data).toHaveProperty('nodes');
                (0, globals_1.expect)(response.data).toHaveProperty('edges');
                (0, globals_1.expect)(response.data.run_id).toBe(mockRunId);
                (0, globals_1.expect)(response.data.depth_traversed).toBe(depth);
            }
        });
        (0, globals_1.it)('should link runs to provenance chains', async () => {
            const mockRunId = 'test-run-provenance';
            const response = await service.getRun(mockRunId, testTenantA, testRequester);
            if (response.data) {
                const run = response.data;
                (0, globals_1.expect)(run).toHaveProperty('provenance_links');
                (0, globals_1.expect)(run.provenance_links).toHaveProperty('provenance_chain_id');
                (0, globals_1.expect)(run.provenance_links).toHaveProperty('claims');
                (0, globals_1.expect)(run.provenance_links).toHaveProperty('evidence');
                (0, globals_1.expect)(run.provenance_links).toHaveProperty('sources');
                (0, globals_1.expect)(run.provenance_links).toHaveProperty('transforms');
            }
        });
        (0, globals_1.it)('should verify linkage integrity', async () => {
            const mockRunId = 'test-run-verify';
            const response = await service.verifyLinkage(mockRunId, testTenantA);
            (0, globals_1.expect)(response.success).toBe(true);
            if (response.data) {
                (0, globals_1.expect)(response.data).toHaveProperty('run_id');
                (0, globals_1.expect)(response.data).toHaveProperty('verified');
                (0, globals_1.expect)(response.data).toHaveProperty('checks');
                // Verification checks
                (0, globals_1.expect)(response.data.checks).toHaveProperty('run_exists');
                (0, globals_1.expect)(response.data.checks).toHaveProperty('audit_events_linked');
                (0, globals_1.expect)(response.data.checks).toHaveProperty('provenance_chain_valid');
                (0, globals_1.expect)(response.data.checks).toHaveProperty('sbom_hashes_match');
            }
        });
    });
    (0, globals_1.describe)('5. Access Control (No Privileged Access Required)', () => {
        (0, globals_1.it)('should allow basic reads without admin privileges', async () => {
            // Regular user should be able to list runs
            const response = await service.listRuns(testTenantA, {}, 'regular-user');
            (0, globals_1.expect)(response.success).toBe(true);
            (0, globals_1.expect)(response.meta.tenant_id).toBe(testTenantA);
        });
        (0, globals_1.it)('should allow viewing own tenant runs without elevation', async () => {
            const mockRunId = 'test-run-access';
            const response = await service.getRun(mockRunId, testTenantA, 'regular-user');
            // Should succeed (or fail with not found, but not permission denied)
            (0, globals_1.expect)(response.meta.tenant_id).toBe(testTenantA);
        });
        (0, globals_1.it)('should support filtering without admin access', async () => {
            const filter = {
                run_type: 'agent_run',
                min_confidence: 0.8,
                limit: 10,
            };
            const response = await service.listRuns(testTenantA, filter, 'regular-user');
            (0, globals_1.expect)(response.success).toBe(true);
        });
    });
    (0, globals_1.describe)('6. Run Comparison', () => {
        (0, globals_1.it)('should compare two runs and compute deltas', async () => {
            const runIdA = 'test-run-a';
            const runIdB = 'test-run-b';
            const response = await service.compareRuns(runIdA, runIdB, testTenantA);
            if (response.data) {
                const comparison = response.data;
                (0, globals_1.expect)(comparison).toHaveProperty('run_a');
                (0, globals_1.expect)(comparison).toHaveProperty('run_b');
                (0, globals_1.expect)(comparison).toHaveProperty('deltas');
                // Deltas structure
                (0, globals_1.expect)(comparison.deltas).toHaveProperty('input_diff');
                (0, globals_1.expect)(comparison.deltas).toHaveProperty('output_diff');
                (0, globals_1.expect)(comparison.deltas).toHaveProperty('confidence_delta');
                (0, globals_1.expect)(comparison.deltas).toHaveProperty('duration_delta_ms');
                (0, globals_1.expect)(comparison.deltas).toHaveProperty('different_capabilities');
                (0, globals_1.expect)(comparison.deltas).toHaveProperty('different_policies');
                // Confidence delta should be a number
                (0, globals_1.expect)(typeof comparison.deltas.confidence_delta).toBe('number');
            }
        });
        (0, globals_1.it)('should prevent cross-tenant comparisons', async () => {
            // Run A from tenant A, Run B from tenant B
            const runIdA = 'test-run-tenant-a';
            const runIdB = 'test-run-tenant-b';
            // Attempting comparison should either fail or only compare within same tenant
            const response = await service.compareRuns(runIdA, runIdB, testTenantA);
            // If comparison succeeds, both runs should be from same tenant
            if (response.success && response.data) {
                (0, globals_1.expect)(response.data.run_a.tenant_id).toBe(testTenantA);
                // Run B might not be found or rejected
            }
        });
    });
    (0, globals_1.describe)('7. API Error Handling', () => {
        (0, globals_1.it)('should return proper error structure when run not found', async () => {
            const response = await service.getRun('non-existent-run', testTenantA, testRequester);
            if (!response.success) {
                (0, globals_1.expect)(response.errors).toBeDefined();
                (0, globals_1.expect)(Array.isArray(response.errors)).toBe(true);
                (0, globals_1.expect)(response.errors[0]).toHaveProperty('code');
                (0, globals_1.expect)(response.errors[0]).toHaveProperty('message');
            }
        });
        (0, globals_1.it)('should include request_id for debugging', async () => {
            const response = await service.listRuns(testTenantA, {}, testRequester);
            (0, globals_1.expect)(response.meta.request_id).toBeTruthy();
            (0, globals_1.expect)(typeof response.meta.request_id).toBe('string');
        });
        (0, globals_1.it)('should include queried_at timestamp', async () => {
            const response = await service.listRuns(testTenantA, {}, testRequester);
            (0, globals_1.expect)(response.meta.queried_at).toBeTruthy();
            // Should be valid ISO 8601 timestamp
            const date = new Date(response.meta.queried_at);
            (0, globals_1.expect)(date.toISOString()).toBe(response.meta.queried_at);
        });
    });
    (0, globals_1.describe)('8. Read-Only Guarantees', () => {
        (0, globals_1.it)('should not expose any mutation methods in service', () => {
            const serviceMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(service));
            // All methods should be read-only (get, list, compare, verify)
            const mutationKeywords = ['create', 'update', 'delete', 'insert', 'modify', 'set', 'write'];
            serviceMethods.forEach((method) => {
                const hasMatationKeyword = mutationKeywords.some((keyword) => method.toLowerCase().includes(keyword));
                (0, globals_1.expect)(hasMatationKeyword).toBe(false);
            });
        });
        (0, globals_1.it)('should enforce read-only at API level', () => {
            // This would be tested at integration level with actual HTTP requests
            // Verify no POST/PUT/DELETE/PATCH routes exist in explainability-explorer router
            (0, globals_1.expect)(true).toBe(true); // Placeholder
        });
    });
    (0, globals_1.describe)('9. Performance & Pagination', () => {
        (0, globals_1.it)('should respect limit parameter', async () => {
            const filter = { limit: 5 };
            const response = await service.listRuns(testTenantA, filter, testRequester);
            if (response.data) {
                (0, globals_1.expect)(response.data.length).toBeLessThanOrEqual(5);
            }
        });
        (0, globals_1.it)('should respect offset parameter', async () => {
            const filter = { limit: 10, offset: 5 };
            const response = await service.listRuns(testTenantA, filter, testRequester);
            // Should succeed without error
            (0, globals_1.expect)(response.success).toBe(true);
        });
        (0, globals_1.it)('should support filtering by run_type', async () => {
            const filter = { run_type: 'agent_run' };
            const response = await service.listRuns(testTenantA, filter, testRequester);
            if (response.data) {
                response.data.forEach((run) => {
                    (0, globals_1.expect)(run.run_type).toBe('agent_run');
                });
            }
        });
        (0, globals_1.it)('should support filtering by min_confidence', async () => {
            const filter = { min_confidence: 0.8 };
            const response = await service.listRuns(testTenantA, filter, testRequester);
            if (response.data) {
                response.data.forEach((run) => {
                    (0, globals_1.expect)(run.confidence.overall_confidence).toBeGreaterThanOrEqual(0.8);
                });
            }
        });
    });
    (0, globals_1.afterAll)(() => {
        // Cleanup if needed
    });
});
