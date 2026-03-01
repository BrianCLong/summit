import { PolicyGate, AgentCharter } from './index.ts';
import path from 'path';

describe('PolicyGate OPA Integration', () => {
    const policyPath = path.resolve(process.cwd(), 'policy/opa/runtime_agent.rego');
    const gate = new PolicyGate(policyPath);

    const charter: AgentCharter = {
        agentId: 'agent-007',
        name: 'James Bond Agent',
        version: '1.0.0',
        authority: {
            scopes: ['autonomous', 'read', 'write'],
            maxBudgetUSD: 1000,
            maxTokensPerRun: 50000,
            expiryDate: '2027-12-31T23:59:59Z',
        },
        gates: {
            requireHumanApprovalFor: ['delete_repo', 'force_push'],
            allowedTools: ['git_pull', 'git_commit', 'git_push'],
        },
        ownerSignature: 'valid-sig-123',
    };

    it('should allow a tool in the allowlist', () => {
        const result = gate.validate(charter, 'git_push', {}, 100);
        expect(result.allowed).toBe(true);
    });

    it('should deny a tool not in the allowlist', () => {
        const result = gate.validate(charter, 'format_c', {}, 100);
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain("tool 'format_c' not allowed");
    });

    it('should deny autonomous actions (level >= 3) without human signature', () => {
        const result = gate.validate(charter, 'git_push', { human_approval_signed: false }, 100);
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain("HITL signed approval required");
    });

    it('should allow autonomous actions with human signature', () => {
        const result = gate.validate(charter, 'git_push', { human_approval_signed: true }, 100);
        expect(result.allowed).toBe(true);
    });
});
