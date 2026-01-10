/**
 * Negotiation Runtime Verification Tests
 *
 * Verifies that the negotiation runtime enforces protocol constraints.
 * Tests compliance with the Negotiation Protocol.
 *
 * @module test/verification/negotiation
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { NegotiationRuntime } from '../../server/src/agents/negotiation/NegotiationRuntime.js';
import { PolicyEngine } from '../../server/src/governance/PolicyEngine.js';
import { Policy } from '../../server/src/governance/types.js';
import {
  NegotiationRequest,
  NegotiationError,
  ProposalMessage,
  ChallengeMessage,
} from '../../server/src/agents/negotiation/types.js';

describe('Negotiation Protocol Governance Verification', () => {
  let runtime: NegotiationRuntime;
  let policyEngine: PolicyEngine;

  beforeEach(() => {
    // Create policy engine with test policies
    const policies: Policy[] = [
      {
        id: 'test-deny-sensitive-negotiation',
        description: 'Deny negotiations involving sensitive terms',
        scope: { stages: ['runtime'], tenants: ['*'] },
        rules: [{ field: 'goal', operator: 'contains', value: 'capability' }],
        action: 'DENY',
      },
    ];
    policyEngine = new PolicyEngine(policies);

    // Create negotiation runtime
    runtime = new NegotiationRuntime(
      { enablePolicyChecks: true, enableAuditLog: true },
      policyEngine
    );
  });

  // ==========================================================================
  // Test 1: Negotiations respect turn limits and roles
  // ==========================================================================

  describe('Turn Limits and Roles', () => {
    it('should enforce maximum turn limit', async () => {
      const request: NegotiationRequest = {
        type: 'resource_allocation',
        tenantId: 'tenant-123',
        proposerId: 'agent-1',
        challengerId: 'agent-2',
        initialProposal: {
          goal: 'Allocate GPU resources',
          terms: { gpu: 1, duration: 600 },
          justification: 'Need GPU for ML training',
        },
        limits: { maxTurns: 3 } as any,
      };

      const session = await runtime.initiate(request);

      // Submit messages up to turn limit
      await runtime.submitMessage(session.negotiationId, {
        role: 'challenger',
        type: 'challenge',
        inReplyTo: session.transcript[0].messageId,
        challenge: {
          objections: [{ field: 'duration', reason: 'Too long' }],
        },
        metadata: { agentId: 'agent-2', tenantId: 'tenant-123' },
      } as any);

      await runtime.submitMessage(session.negotiationId, {
        role: 'proposer',
        type: 'counter_proposal',
        proposal: {
          goal: 'Allocate GPU resources',
          terms: { gpu: 1, duration: 300 },
          justification: 'Reduced duration',
          evidence: [],
          tradeoffs: [],
        },
        metadata: { agentId: 'agent-1', tenantId: 'tenant-123', confidence: 0.8 },
      } as any);

      // Next message should trigger abort due to turn limit
      const finalSession = await runtime.submitMessage(session.negotiationId, {
        role: 'challenger',
        type: 'challenge',
        inReplyTo: session.transcript[0].messageId,
        challenge: {
          objections: [{ field: 'duration', reason: 'Still too long' }],
        },
        metadata: { agentId: 'agent-2', tenantId: 'tenant-123' },
      } as any);

      expect(finalSession.state).toBe('ABORTED');
      expect(finalSession.abortReason).toContain('Turn limit exceeded');
    });

    it('should track current turn accurately', async () => {
      const request: NegotiationRequest = {
        type: 'task_prioritization',
        tenantId: 'tenant-123',
        proposerId: 'agent-1',
        challengerId: 'agent-2',
        initialProposal: {
          goal: 'Prioritize compliance tasks',
          terms: { priority: 'high' },
          justification: 'Urgent deadline',
        },
      };

      const session = await runtime.initiate(request);
      expect(session.currentTurn).toBe(1);

      const updated = await runtime.submitMessage(session.negotiationId, {
        role: 'challenger',
        type: 'challenge',
        inReplyTo: session.transcript[0].messageId,
        challenge: {
          objections: [{ field: 'priority', reason: 'Other tasks more urgent' }],
        },
        metadata: { agentId: 'agent-2', tenantId: 'tenant-123' },
      } as any);

      expect(updated.currentTurn).toBe(2);
    });

    it('should validate role consistency', async () => {
      const request: NegotiationRequest = {
        type: 'resource_allocation',
        tenantId: 'tenant-123',
        proposerId: 'agent-1',
        challengerId: 'agent-2',
        initialProposal: {
          goal: 'Allocate memory',
          terms: { memory: 1024 },
          justification: 'Large dataset',
        },
      };

      const session = await runtime.initiate(request);
      expect(session.participants.proposerId).toBe('agent-1');
      expect(session.participants.challengerId).toBe('agent-2');
    });
  });

  // ==========================================================================
  // Test 2: Policy checks at negotiation phases
  // ==========================================================================

  describe('Policy Enforcement', () => {
    it('should block negotiations denied by pre-negotiation policy', async () => {
      const request: NegotiationRequest = {
        type: 'resource_allocation',
        tenantId: 'tenant-123',
        proposerId: 'agent-1',
        challengerId: 'agent-2',
        initialProposal: {
          goal: 'Grant capability to agent', // Will trigger DENY
          terms: { capability: 'admin' },
          justification: 'Need admin access',
        },
      };

      await expect(runtime.initiate(request)).rejects.toThrow('Policy denied negotiation');
    });

    it('should allow negotiations that pass policy checks', async () => {
      const request: NegotiationRequest = {
        type: 'resource_allocation',
        tenantId: 'tenant-123',
        proposerId: 'agent-1',
        challengerId: 'agent-2',
        initialProposal: {
          goal: 'Allocate CPU time',
          terms: { cpu: 2, duration: 300 },
          justification: 'Background processing',
        },
      };

      const session = await runtime.initiate(request);
      expect(session).toBeDefined();
      expect(session.state).toBe('CHALLENGE');
    });

    it('should record policy verdicts for each phase', async () => {
      const request: NegotiationRequest = {
        type: 'task_prioritization',
        tenantId: 'tenant-123',
        proposerId: 'agent-1',
        challengerId: 'agent-2',
        initialProposal: {
          goal: 'Reorder task queue',
          terms: { task1: 'high', task2: 'low' },
          justification: 'Deadline approaching',
        },
      };

      const session = await runtime.initiate(request);

      expect(session.policyVerdicts).toBeDefined();
      expect(session.policyVerdicts.length).toBeGreaterThan(0);
      expect(session.policyVerdicts[0].action).toBe('ALLOW');
    });
  });

  // ==========================================================================
  // Test 3: Transcript capture and integrity
  // ==========================================================================

  describe('Transcript Capture', () => {
    it('should capture all messages in transcript', async () => {
      const request: NegotiationRequest = {
        type: 'resource_allocation',
        tenantId: 'tenant-123',
        proposerId: 'agent-1',
        challengerId: 'agent-2',
        initialProposal: {
          goal: 'Share GPU resources',
          terms: { gpu: 0.5 },
          justification: 'Time-sharing',
        },
      };

      const session = await runtime.initiate(request);

      await runtime.submitMessage(session.negotiationId, {
        role: 'challenger',
        type: 'challenge',
        inReplyTo: session.transcript[0].messageId,
        challenge: {
          objections: [{ field: 'gpu', reason: 'Need full GPU' }],
        },
        metadata: { agentId: 'agent-2', tenantId: 'tenant-123' },
      } as any);

      const transcript = runtime.getTranscript(session.negotiationId);
      expect(transcript.length).toBe(2);
      expect(transcript[0].role).toBe('proposer');
      expect(transcript[1].role).toBe('challenger');
    });

    it('should generate redacted transcript with hash', async () => {
      const request: NegotiationRequest = {
        type: 'resource_allocation',
        tenantId: 'tenant-123',
        proposerId: 'agent-1',
        challengerId: 'agent-2',
        initialProposal: {
          goal: 'Allocate resources',
          terms: { cpu: 2 },
          justification: 'Test',
        },
      };

      const session = await runtime.initiate(request);
      const redacted = runtime.getRedactedTranscript(session.negotiationId);

      expect(redacted.hash).toBeDefined();
      expect(redacted.hash.length).toBe(64); // SHA-256 hex
      expect(redacted.messages.length).toBe(1);
      expect(redacted.messages[0].summary).toBeDefined();
    });

    it('should include all participants in transcript', async () => {
      const request: NegotiationRequest = {
        type: 'collaborative_planning',
        tenantId: 'tenant-123',
        proposerId: 'agent-1',
        challengerId: 'agent-2',
        arbiterId: 'arbiter-1',
        initialProposal: {
          goal: 'Plan multi-agent task',
          terms: { agent1_role: 'executor', agent2_role: 'monitor' },
          justification: 'Efficient execution',
        },
      };

      const session = await runtime.initiate(request);
      const redacted = runtime.getRedactedTranscript(session.negotiationId);

      expect(redacted.participants).toContain('agent-1');
      expect(redacted.participants).toContain('agent-2');
      expect(redacted.participants).toContain('arbiter-1');
    });
  });

  // ==========================================================================
  // Test 4: Resolution and approval workflow
  // ==========================================================================

  describe('Resolution and Approval', () => {
    it('should transition to APPROVAL state on agreement', async () => {
      const request: NegotiationRequest = {
        type: 'resource_allocation',
        tenantId: 'tenant-123',
        proposerId: 'agent-1',
        challengerId: 'agent-2',
        initialProposal: {
          goal: 'Fair resource split',
          terms: { agent1_cpu: 1, agent2_cpu: 1 },
          justification: 'Equal allocation',
        },
      };

      const session = await runtime.initiate(request);
      const resolved = await runtime.resolve(session.negotiationId, 'agreement', 'Both parties agreed');

      expect(resolved.state).toBe('APPROVAL');
      expect(resolved.outcome).toBe('agreement');
      expect(resolved.finalTerms).toBeDefined();
    });

    it('should require approval before closing', async () => {
      const request: NegotiationRequest = {
        type: 'task_prioritization',
        tenantId: 'tenant-123',
        proposerId: 'agent-1',
        challengerId: 'agent-2',
        initialProposal: {
          goal: 'Prioritize tasks',
          terms: { priority_order: ['task1', 'task2'] },
          justification: 'Optimal order',
        },
      };

      const session = await runtime.initiate(request);
      await runtime.resolve(session.negotiationId, 'agreement');

      expect(session.state).not.toBe('CLOSED'); // Should be APPROVAL
    });

    it('should close negotiation after approval', async () => {
      const request: NegotiationRequest = {
        type: 'resource_allocation',
        tenantId: 'tenant-123',
        proposerId: 'agent-1',
        challengerId: 'agent-2',
        initialProposal: {
          goal: 'Allocate storage',
          terms: { storage_gb: 100 },
          justification: 'Data retention',
        },
      };

      const session = await runtime.initiate(request);
      await runtime.resolve(session.negotiationId, 'agreement');
      const approved = await runtime.approve(
        session.negotiationId,
        'approved',
        'policy-engine',
        'Terms acceptable'
      );

      expect(approved.state).toBe('CLOSED');
    });

    it('should handle rejection during approval', async () => {
      const request: NegotiationRequest = {
        type: 'policy_conflict_resolution',
        tenantId: 'tenant-123',
        proposerId: 'agent-1',
        challengerId: 'agent-2',
        initialProposal: {
          goal: 'Resolve policy conflict',
          terms: { rule_precedence: 'rule1' },
          justification: 'More specific rule',
        },
      };

      const session = await runtime.initiate(request);
      await runtime.resolve(session.negotiationId, 'agreement');
      const rejected = await runtime.approve(
        session.negotiationId,
        'rejected',
        'human-operator',
        'Terms not acceptable'
      );

      expect(rejected.state).toBe('CLOSED');
      expect(rejected.transcript[rejected.transcript.length - 1].type).toBe('approval');
    });
  });

  // ==========================================================================
  // Test 5: Abort conditions
  // ==========================================================================

  describe('Abort Conditions', () => {
    it('should abort on policy violation', async () => {
      const request: NegotiationRequest = {
        type: 'resource_allocation',
        tenantId: 'tenant-123',
        proposerId: 'agent-1',
        challengerId: 'agent-2',
        initialProposal: {
          goal: 'Normal allocation',
          terms: { cpu: 1 },
          justification: 'Standard request',
        },
      };

      const session = await runtime.initiate(request);

      // Manually abort
      const aborted = await runtime.abort(session.negotiationId, 'Policy violation detected');

      expect(aborted.state).toBe('ABORTED');
      expect(aborted.outcome).toBe('aborted');
      expect(aborted.abortReason).toBe('Policy violation detected');
    });

    it('should prevent message submission after abort', async () => {
      const request: NegotiationRequest = {
        type: 'resource_allocation',
        tenantId: 'tenant-123',
        proposerId: 'agent-1',
        challengerId: 'agent-2',
        initialProposal: {
          goal: 'Test abort',
          terms: { test: true },
          justification: 'Testing',
        },
      };

      const session = await runtime.initiate(request);
      await runtime.abort(session.negotiationId, 'Test abort');

      await expect(
        runtime.submitMessage(session.negotiationId, {
          role: 'challenger',
          type: 'challenge',
          inReplyTo: session.transcript[0].messageId,
          challenge: { objections: [] },
          metadata: { agentId: 'agent-2', tenantId: 'tenant-123' },
        } as any)
      ).rejects.toThrow('Cannot submit message');
    });

    it('should generate resolution message on abort', async () => {
      const request: NegotiationRequest = {
        type: 'risk_mitigation',
        tenantId: 'tenant-123',
        proposerId: 'agent-1',
        challengerId: 'agent-2',
        initialProposal: {
          goal: 'Implement risk controls',
          terms: { control: 'encryption' },
          justification: 'Security requirement',
        },
      };

      const session = await runtime.initiate(request);
      await runtime.abort(session.negotiationId, 'Security violation');

      const transcript = runtime.getTranscript(session.negotiationId);
      const resolutionMsg = transcript.find((m) => m.type === 'resolution');

      expect(resolutionMsg).toBeDefined();
      expect('resolution' in resolutionMsg!).toBe(true);
      if ('resolution' in resolutionMsg!) {
        expect(resolutionMsg.resolution.outcome).toBe('aborted');
      }
    });
  });

  // ==========================================================================
  // Test 6: Audit events
  // ==========================================================================

  describe('Audit Trail', () => {
    it('should generate audit event on negotiation initiation', async () => {
      runtime.clearAuditEvents();

      const request: NegotiationRequest = {
        type: 'resource_allocation',
        tenantId: 'tenant-123',
        proposerId: 'agent-1',
        challengerId: 'agent-2',
        initialProposal: {
          goal: 'Allocate resources',
          terms: { cpu: 2 },
          justification: 'Test',
        },
      };

      await runtime.initiate(request);

      const events = runtime.getAuditEvents();
      expect(events.length).toBeGreaterThan(0);

      const initiatedEvent = events.find((e) => e.eventType === 'negotiation_initiated');
      expect(initiatedEvent).toBeDefined();
      expect(initiatedEvent!.agentId).toBe('agent-1');
    });

    it('should generate audit event on turn submission', async () => {
      runtime.clearAuditEvents();

      const request: NegotiationRequest = {
        type: 'task_prioritization',
        tenantId: 'tenant-123',
        proposerId: 'agent-1',
        challengerId: 'agent-2',
        initialProposal: {
          goal: 'Set priorities',
          terms: { priority: 'high' },
          justification: 'Urgent',
        },
      };

      const session = await runtime.initiate(request);

      await runtime.submitMessage(session.negotiationId, {
        role: 'challenger',
        type: 'challenge',
        inReplyTo: session.transcript[0].messageId,
        challenge: {
          objections: [{ field: 'priority', reason: 'Too high' }],
        },
        metadata: { agentId: 'agent-2', tenantId: 'tenant-123' },
      } as any);

      const events = runtime.getAuditEvents();
      const turnEvent = events.find((e) => e.eventType === 'negotiation_turn');
      expect(turnEvent).toBeDefined();
    });

    it('should generate audit event on resolution', async () => {
      runtime.clearAuditEvents();

      const request: NegotiationRequest = {
        type: 'resource_allocation',
        tenantId: 'tenant-123',
        proposerId: 'agent-1',
        challengerId: 'agent-2',
        initialProposal: {
          goal: 'Share resources',
          terms: { shared: true },
          justification: 'Fair',
        },
      };

      const session = await runtime.initiate(request);
      await runtime.resolve(session.negotiationId, 'agreement');

      const events = runtime.getAuditEvents();
      const resolvedEvent = events.find((e) => e.eventType === 'negotiation_resolved');
      expect(resolvedEvent).toBeDefined();
      expect(resolvedEvent!.outcome).toBe('agreement');
    });

    it('should generate audit event on abort', async () => {
      runtime.clearAuditEvents();

      const request: NegotiationRequest = {
        type: 'collaborative_planning',
        tenantId: 'tenant-123',
        proposerId: 'agent-1',
        challengerId: 'agent-2',
        initialProposal: {
          goal: 'Plan collaboration',
          terms: { plan: 'test' },
          justification: 'Testing',
        },
      };

      const session = await runtime.initiate(request);
      await runtime.abort(session.negotiationId, 'Test abort');

      const events = runtime.getAuditEvents();
      const abortEvent = events.find((e) => e.eventType === 'negotiation_aborted');
      expect(abortEvent).toBeDefined();
    });
  });

  // ==========================================================================
  // Test 7: Message schema validation
  // ==========================================================================

  describe('Message Validation', () => {
    it('should validate proposal message schema', async () => {
      const request: NegotiationRequest = {
        type: 'resource_allocation',
        tenantId: 'tenant-123',
        proposerId: 'agent-1',
        challengerId: 'agent-2',
        initialProposal: {
          goal: 'Test validation',
          terms: { test: true },
          justification: 'Schema test',
        },
      };

      const session = await runtime.initiate(request);

      // Initial proposal should be valid
      expect(session.transcript[0].role).toBe('proposer');
      expect('proposal' in session.transcript[0]).toBe(true);
    });

    it('should validate challenge message schema', async () => {
      const request: NegotiationRequest = {
        type: 'resource_allocation',
        tenantId: 'tenant-123',
        proposerId: 'agent-1',
        challengerId: 'agent-2',
        initialProposal: {
          goal: 'Test challenge',
          terms: { resource: 'cpu' },
          justification: 'Need CPU',
        },
      };

      const session = await runtime.initiate(request);

      const updated = await runtime.submitMessage(session.negotiationId, {
        role: 'challenger',
        type: 'challenge',
        inReplyTo: session.transcript[0].messageId,
        challenge: {
          objections: [{ field: 'resource', reason: 'GPU needed instead' }],
        },
        metadata: { agentId: 'agent-2', tenantId: 'tenant-123' },
      } as any);

      const lastMsg = updated.transcript[updated.transcript.length - 1];
      expect(lastMsg.role).toBe('challenger');
      expect('challenge' in lastMsg).toBe(true);
    });
  });
});
