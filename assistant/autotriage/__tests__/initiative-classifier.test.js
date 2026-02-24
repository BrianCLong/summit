import { describe, it, expect } from '@jest/globals';
import { classifyInitiative } from '../classifier/initiative-classifier';
describe('classifyInitiative', () => {
    const rules = [
        {
            id: 'my-initiative',
            keywords: ['foo', 'bar'],
            patterns: [/baz-\d+/],
        },
    ];
    it('matches keyword in title', () => {
        const item = {
            title: 'This has foo in it',
            description: 'nothing',
        };
        expect(classifyInitiative(item, rules)).toBe('my-initiative');
    });
    it('matches pattern in description', () => {
        const item = {
            title: 'Normal title',
            description: 'Has baz-123 pattern',
        };
        expect(classifyInitiative(item, rules)).toBe('my-initiative');
    });
    it('returns undefined for no match', () => {
        const item = {
            title: 'Nothing here',
            description: 'Also nothing',
        };
        expect(classifyInitiative(item, rules)).toBeUndefined();
    });
});
//# sourceMappingURL=initiative-classifier.test.js.map