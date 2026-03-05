import { describe, it, expect } from 'vitest';
import { AGENT_SCALING_CONFIG } from '../../src/agent-scaling/config';

describe('Agent Loop Limits', () => {
    it('should have a max step counter configured', () => {
        expect(AGENT_SCALING_CONFIG.maxStepCounter).toBeDefined();
        expect(AGENT_SCALING_CONFIG.maxStepCounter).toBeLessThanOrEqual(20);
    });
});
