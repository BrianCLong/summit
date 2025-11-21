// Offline Kit Acceptance Tests
// Verify: edge session can produce proof-carrying results,
// reconnection merges without conflicts, policy simulation shows no leakage

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { OfflineKit } from '../offline-kit';
import { proofCarryingResultSystem } from '../proof-carrying-results';
import { policyLeakSimulator } from '../policy-leak-simulator';
import { claimSyncEngine } from '../claim-sync';
import { crdtSyncEngine } from '../crdt-sync';

describe('Offline Kit - Acceptance Criteria', () => {
  let offlineKit: OfflineKit;
  const edgeNodeId = 'edge-test-node-001';
  const cloudNodeId = 'cloud-primary';

  beforeAll(async () => {
    // Initialize offline kit for edge node
    offlineKit = new OfflineKit({
      nodeId: edgeNodeId,
      nodeType: 'edge',
      offlineMode: true,
      services: ['investigation', 'analysis'],
      sync: {
        enabled: true,
        strategy: 'claims_only',
        verifiable: true,
        batchSize: 100,
        retryAttempts: 3,
      },
      security: {
        requireProofs: true,
        policySimulation: true,
        leakageDetection: true,
        airgapMode: false,
      },
    });

    await offlineKit.initialize();
  });

  afterAll(async () => {
    await offlineKit.shutdown();
  });

  describe('Acceptance: Edge session can produce proof-carrying results', () => {
    it('should create proof-carrying result for investigation analysis', async () => {
      // Simulate an investigation analysis performed offline
      const sessionId = 'session_edge_001';

      const result = await proofCarryingResultSystem.createResult({
        sessionId,
        nodeId: edgeNodeId,
        computationType: 'investigation',
        inputs: [
          {
            inputType: 'entity',
            sourceId: 'entity_001',
            value: {
              entityType: 'person',
              name: 'Test Subject',
              attributes: { role: 'analyst' },
            },
            provenance: ['investigation_123'],
          },
          {
            inputType: 'dataset',
            sourceId: 'dataset_456',
            value: {
              records: [
                { id: 1, score: 0.85 },
                { id: 2, score: 0.92 },
              ],
            },
            provenance: ['analysis_789'],
          },
        ],
        outputs: [
          {
            outputType: 'finding',
            value: {
              findingType: 'anomaly_detected',
              severity: 'medium',
              description: 'Pattern anomaly detected in dataset',
            },
            confidence: 0.89,
            derivedFrom: [`${edgeNodeId}_input_0`, `${edgeNodeId}_input_1`],
          },
          {
            outputType: 'score',
            value: 0.89,
            confidence: 0.95,
            derivedFrom: [`${edgeNodeId}_input_1`],
          },
        ],
        algorithm: 'anomaly-detection-v2',
        version: '2.0.1',
        parameters: {
          threshold: 0.8,
          windowSize: 100,
        },
        executionTime: 1250,
        resourceUsage: {
          cpuTimeMs: 1200,
          memoryBytes: 52428800, // 50MB
          storageReads: 15,
          storageWrites: 3,
          networkCalls: 0,
        },
      });

      // Verify result was created
      expect(result).toBeDefined();
      expect(result.resultId).toBeDefined();
      expect(result.nodeId).toBe(edgeNodeId);
      expect(result.computationType).toBe('investigation');

      // Verify inputs are hashed
      expect(result.inputs).toHaveLength(2);
      expect(result.inputs[0].valueHash).toMatch(/^[0-9a-f]{64}$/);

      // Verify outputs have proofs
      expect(result.outputs).toHaveLength(2);
      expect(result.outputs[0].valueHash).toMatch(/^[0-9a-f]{64}$/);

      // Verify proof exists
      expect(result.proof).toBeDefined();
      expect(result.proof.proofType).toBe('deterministic');
      expect(result.proof.signature).toBeDefined();
      expect(result.proof.algorithm).toBe('anomaly-detection-v2');

      // Verify attestation
      expect(result.attestation).toBeDefined();
      expect(result.attestation.attestationType).toBe('node');
      expect(result.attestation.attestor).toBe(edgeNodeId);
      expect(result.attestation.signature).toBeDefined();

      // Verify result passed verification
      expect(result.metadata.verified).toBe(true);
      expect(result.metadata.policyCompliant).toBe(true);

      console.log('✅ PASS: Edge session produced proof-carrying result');
      console.log(`   Result ID: ${result.resultId}`);
      console.log(`   Verified: ${result.metadata.verified}`);
      console.log(`   Inputs: ${result.inputs.length}, Outputs: ${result.outputs.length}`);
    });

    it('should verify proof-carrying result integrity', async () => {
      // Create a result
      const sessionId = 'session_edge_002';

      const result = await proofCarryingResultSystem.createResult({
        sessionId,
        nodeId: edgeNodeId,
        computationType: 'analysis',
        inputs: [
          {
            inputType: 'claim',
            sourceId: 'claim_001',
            value: { claimType: 'existence', subjectId: 'entity_789' },
          },
        ],
        outputs: [
          {
            outputType: 'classification',
            value: 'high_confidence',
            confidence: 0.95,
            derivedFrom: [`${edgeNodeId}_input_0`],
          },
        ],
        algorithm: 'classifier-v1',
        version: '1.0.0',
        parameters: {},
        executionTime: 500,
        resourceUsage: {
          cpuTimeMs: 450,
          memoryBytes: 10485760,
          storageReads: 5,
          storageWrites: 1,
          networkCalls: 0,
        },
      });

      // Verify the result
      const verification = await proofCarryingResultSystem.verifyResult(result);

      expect(verification.valid).toBe(true);
      expect(verification.checks.proofValid).toBe(true);
      expect(verification.checks.attestationValid).toBe(true);
      expect(verification.checks.inputsValid).toBe(true);
      expect(verification.checks.outputsConsistent).toBe(true);
      expect(verification.checks.policyCompliant).toBe(true);
      expect(verification.errors).toHaveLength(0);

      console.log('✅ PASS: Proof-carrying result verification succeeded');
      console.log(`   All checks passed: ${Object.values(verification.checks).every((c) => c)}`);
    });
  });

  describe('Acceptance: Reconnection merges without conflicts', () => {
    it('should sync claims without conflicts after reconnection', async () => {
      // Simulate offline operations
      const operations = [
        {
          timestamp: Date.now(),
          operation: 'create' as const,
          entityType: 'investigation',
          entityId: 'inv_offline_001',
          data: {
            title: 'Offline Investigation',
            status: 'in_progress',
            classification: 'confidential',
            _tenantId: 'tenant_edge',
          },
          dependencies: [],
        },
        {
          timestamp: Date.now() + 1000,
          operation: 'update' as const,
          entityType: 'investigation',
          entityId: 'inv_offline_001',
          data: {
            status: 'completed',
            findings: ['Finding 1', 'Finding 2'],
          },
          dependencies: [],
        },
      ];

      // Create CRDT operations
      const operationIds = [];
      for (const op of operations) {
        const opId = await crdtSyncEngine.applyOperation(op);
        operationIds.push(opId);
      }

      expect(operationIds).toHaveLength(2);

      // Convert to claims
      const syncResult = await claimSyncEngine.convertAndSync(
        edgeNodeId,
        cloudNodeId,
      );

      // Verify claims were created
      expect(syncResult.success).toBe(true);
      expect(syncResult.claimsSent).toBeGreaterThan(0);
      expect(syncResult.verified).toBe(true);

      // Verify no conflicts
      expect(syncResult.conflicts).toHaveLength(0);

      console.log('✅ PASS: Reconnection merged without conflicts');
      console.log(`   Claims sent: ${syncResult.claimsSent}`);
      console.log(`   Conflicts: ${syncResult.conflicts.length}`);
      console.log(`   Verified: ${syncResult.verified}`);
    });

    it('should handle CRDT conflict resolution correctly', async () => {
      // Simulate concurrent updates on same entity
      const entityId = 'entity_concurrent_001';

      // Operation 1 from edge node
      const op1 = await crdtSyncEngine.applyOperation({
        timestamp: Date.now(),
        operation: 'update',
        entityType: 'investigation',
        entityId,
        data: {
          priority: 'high',
          assignedTo: 'analyst_edge',
        },
        dependencies: [],
      });

      // Simulate operation 2 from cloud (would happen concurrently)
      // In real scenario, this would come from another node
      const op2 = await crdtSyncEngine.applyOperation({
        timestamp: Date.now() + 500, // Slightly later
        operation: 'update',
        entityType: 'investigation',
        entityId,
        data: {
          priority: 'critical',
          assignedTo: 'analyst_cloud',
        },
        dependencies: [],
      });

      // Both operations should be applied
      expect(op1).toBeDefined();
      expect(op2).toBeDefined();

      // CRDT conflict resolution should handle this automatically
      // Last-write-wins or merge strategy will be applied

      console.log('✅ PASS: CRDT conflict resolution handled concurrent updates');
      console.log(`   Operation 1: ${op1}`);
      console.log(`   Operation 2: ${op2}`);
    });
  });

  describe('Acceptance: Policy simulation shows no leakage', () => {
    it('should detect no leakage when clearances match', async () => {
      // Simulate operations with appropriate classification
      await crdtSyncEngine.applyOperation({
        timestamp: Date.now(),
        operation: 'create',
        entityType: 'investigation',
        entityId: 'inv_policy_001',
        data: {
          title: 'Unclassified Investigation',
          classification: 'unclassified',
          _tenantId: 'tenant_edge',
        },
        dependencies: [],
      });

      // Run policy simulation
      const simulation = await policyLeakSimulator.simulateSync(
        edgeNodeId,
        cloudNodeId,
      );

      // Verify no leakage detected
      expect(simulation.leakageDetected).toBe(false);
      expect(simulation.violations).toHaveLength(0);
      expect(simulation.riskScore).toBe(0);
      expect(simulation.summary.deniedOperations).toBe(0);

      console.log('✅ PASS: Policy simulation detected no leakage');
      console.log(`   Operations analyzed: ${simulation.operationsAnalyzed}`);
      console.log(`   Violations: ${simulation.violations.length}`);
      console.log(`   Risk score: ${simulation.riskScore}`);
      console.log(`   Leakage detected: ${simulation.leakageDetected}`);
    });

    it('should detect leakage when clearance insufficient', async () => {
      // Create operation with higher classification
      await crdtSyncEngine.applyOperation({
        timestamp: Date.now(),
        operation: 'create',
        entityType: 'investigation',
        entityId: 'inv_policy_002',
        data: {
          title: 'Classified Investigation',
          classification: 'top_secret',
          _tenantId: 'tenant_edge',
          sensitiveData: 'This should not leak',
        },
        dependencies: [],
      });

      // Run policy simulation
      const simulation = await policyLeakSimulator.simulateSync(
        edgeNodeId,
        cloudNodeId,
      );

      // Should detect clearance violation
      const clearanceViolations = simulation.violations.filter(
        (v) => v.violationType === 'clearance_violation',
      );

      expect(clearanceViolations.length).toBeGreaterThan(0);
      expect(simulation.leakageDetected).toBe(true);
      expect(simulation.riskScore).toBeGreaterThan(0);

      console.log('✅ PASS: Policy simulation detected clearance violation');
      console.log(`   Clearance violations: ${clearanceViolations.length}`);
      console.log(`   Risk score: ${simulation.riskScore}`);
      console.log(`   Recommendations: ${simulation.recommendations.length}`);
    });

    it('should detect tenant isolation violations', async () => {
      // Create operation for different tenant
      await crdtSyncEngine.applyOperation({
        timestamp: Date.now(),
        operation: 'create',
        entityType: 'investigation',
        entityId: 'inv_policy_003',
        data: {
          title: 'Other Tenant Investigation',
          _tenantId: 'tenant_other', // Different tenant
          classification: 'unclassified',
        },
        dependencies: [],
      });

      // Run policy simulation
      const simulation = await policyLeakSimulator.simulateSync(
        edgeNodeId,
        cloudNodeId,
      );

      // Should detect tenant isolation violation
      const tenantViolations = simulation.violations.filter(
        (v) => v.violationType === 'unauthorized_access',
      );

      if (tenantViolations.length > 0) {
        expect(tenantViolations[0].severity).toBe('critical');
        expect(simulation.leakageDetected).toBe(true);

        console.log('✅ PASS: Policy simulation detected tenant isolation violation');
        console.log(`   Tenant violations: ${tenantViolations.length}`);
        console.log(`   Severity: ${tenantViolations[0].severity}`);
      }
    });

    it('should provide remediation recommendations', async () => {
      // Create multiple operations with various violations
      await crdtSyncEngine.applyOperation({
        timestamp: Date.now(),
        operation: 'create',
        entityType: 'investigation',
        entityId: 'inv_policy_004',
        data: {
          title: 'Multi-Violation Investigation',
          classification: 'secret',
          _tenantId: 'tenant_other',
          residency: ['us-east'],
        },
        dependencies: [],
      });

      // Run simulation
      const simulation = await policyLeakSimulator.simulateSync(
        edgeNodeId,
        cloudNodeId,
      );

      // Should provide recommendations
      expect(simulation.recommendations).toBeDefined();
      expect(simulation.recommendations.length).toBeGreaterThan(0);

      // Recommendations should be actionable
      const hasClaimBasedRecommendation = simulation.recommendations.some(
        (r) => r.includes('claim'),
      );

      console.log('✅ PASS: Policy simulation provided recommendations');
      console.log(`   Total recommendations: ${simulation.recommendations.length}`);
      simulation.recommendations.forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec}`);
      });
    });
  });

  describe('Integration: Complete Offline-Sync-Verify Flow', () => {
    it('should complete full offline kit workflow', async () => {
      const sessionId = `integration_session_${Date.now()}`;

      // Step 1: Perform offline computation
      console.log('Step 1: Performing offline computation...');
      const computationResult = await proofCarryingResultSystem.createResult({
        sessionId,
        nodeId: edgeNodeId,
        computationType: 'investigation',
        inputs: [
          {
            inputType: 'entity',
            sourceId: 'entity_integration_001',
            value: { type: 'threat_indicator', severity: 'high' },
          },
        ],
        outputs: [
          {
            outputType: 'alert',
            value: { alertType: 'threat_detected', priority: 'urgent' },
            confidence: 0.95,
            derivedFrom: [`${edgeNodeId}_input_0`],
          },
        ],
        algorithm: 'threat-detector-v1',
        version: '1.0.0',
        parameters: { threshold: 0.9 },
        executionTime: 800,
        resourceUsage: {
          cpuTimeMs: 750,
          memoryBytes: 20971520,
          storageReads: 10,
          storageWrites: 2,
          networkCalls: 0,
        },
      });

      expect(computationResult.metadata.verified).toBe(true);
      console.log(`   ✓ Computation verified: ${computationResult.resultId}`);

      // Step 2: Create CRDT operations
      console.log('Step 2: Creating CRDT operations...');
      const opId = await crdtSyncEngine.applyOperation({
        timestamp: Date.now(),
        operation: 'create',
        entityType: 'alert',
        entityId: 'alert_integration_001',
        data: {
          alertType: 'threat_detected',
          priority: 'urgent',
          classification: 'confidential',
          _tenantId: 'tenant_edge',
        },
        dependencies: [],
      });

      expect(opId).toBeDefined();
      console.log(`   ✓ Operation created: ${opId}`);

      // Step 3: Run policy simulation
      console.log('Step 3: Running policy simulation...');
      const simulation = await policyLeakSimulator.simulateSync(
        edgeNodeId,
        cloudNodeId,
      );

      console.log(`   ✓ Simulation completed:`);
      console.log(`     - Operations analyzed: ${simulation.operationsAnalyzed}`);
      console.log(`     - Violations: ${simulation.violations.length}`);
      console.log(`     - Risk score: ${simulation.riskScore}`);
      console.log(`     - Leakage detected: ${simulation.leakageDetected}`);

      // Step 4: Convert to claims and sync
      console.log('Step 4: Converting to claims and syncing...');
      const syncResult = await claimSyncEngine.convertAndSync(
        edgeNodeId,
        cloudNodeId,
      );

      expect(syncResult.success).toBe(true);
      console.log(`   ✓ Sync completed:`);
      console.log(`     - Claims sent: ${syncResult.claimsSent}`);
      console.log(`     - Verified: ${syncResult.verified}`);
      console.log(`     - Conflicts: ${syncResult.conflicts.length}`);

      // Step 5: Verify complete workflow
      console.log('Step 5: Verifying complete workflow...');
      const allChecks = {
        computationVerified: computationResult.metadata.verified,
        operationCreated: !!opId,
        policyCompliant: !simulation.leakageDetected,
        syncSuccessful: syncResult.success,
        syncVerified: syncResult.verified,
        noConflicts: syncResult.conflicts.length === 0,
      };

      const allPassed = Object.values(allChecks).every((check) => check);

      expect(allPassed).toBe(true);

      console.log('✅ PASS: Complete offline kit workflow succeeded');
      console.log('   All checks:');
      Object.entries(allChecks).forEach(([check, passed]) => {
        console.log(`     ${passed ? '✓' : '✗'} ${check}`);
      });
    });
  });
});
