import { describe, it, expect } from 'vitest';
import { OrchestratorPolicy } from '../src/orchestrator_policy.js';

describe('OrchestratorPolicy', () => {
    it('should deny by default', () => {
        const policy = new OrchestratorPolicy();
        expect(policy.checkPermission('unknown_action', {})).toBe(false);
    });

    it('should allow authorized actions', () => {
        const policy = new OrchestratorPolicy();
        const context = { user: { id: 'lead' }, team: { leadAgentId: 'lead' } };
        expect(policy.checkPermission('approve_join', context)).toBe(true);
    });

    it('should deny unauthorized approval', () => {
        const policy = new OrchestratorPolicy();
        const context = { user: { id: 'imposter' }, team: { leadAgentId: 'lead' } };
        expect(policy.checkPermission('approve_join', context)).toBe(false);
    });
});
