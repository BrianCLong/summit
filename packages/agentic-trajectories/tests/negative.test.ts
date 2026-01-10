import { AgentTrajectory } from '../src/schema.js';
import { dropTool, fuzzUser, perturbSteps } from '../src/augment/negative.js';

describe('negative augmentation', () => {
    it('drops tools deterministically', () => {
        const allowlist = ['bash', 'browser', 'search'];
        const dropped = dropTool(allowlist, { seed: 42 });
        expect(dropped).toEqual(['browser', 'search']);
        const droppedAgain = dropTool(allowlist, { seed: 42 });
        expect(droppedAgain).toEqual(dropped);
    });

    it('fuzzes user content with stable seed', () => {
        const fuzzed = fuzzUser('Please find data', { seed: 99 });
        expect(fuzzed).toBe('Pl3as3 find data');
    });

    it('perturbs steps by duplication deterministically', () => {
        const trajectory: AgentTrajectory = {
            id: 't1',
            meta: { schema_version: '1.0.0', generator_version: '0.1.0' },
            turns: [
                { role: 'user', content: 'hi' },
                { role: 'assistant', content: 'response' }
            ]
        };
        const mutated = perturbSteps(trajectory, { seed: 3 });
        expect(mutated.turns.length).toBe(3);
        expect(mutated.turns.filter((t) => t.content === 'response')).toHaveLength(2);
    });
});
