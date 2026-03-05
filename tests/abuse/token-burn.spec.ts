import { describe, it, expect } from 'vitest';
import { AGENT_SCALING_CONFIG } from '../../src/agent-scaling/config';

describe('Token Burn Limits', () => {
    it('should enforce maximum token budgets', () => {
        expect(AGENT_SCALING_CONFIG.budgets.tokens).toBeDefined();
        expect(AGENT_SCALING_CONFIG.budgets.tokens).toBeLessThanOrEqual(50000);
    });
});
