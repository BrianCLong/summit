"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const initiative_classifier_1 = require("../classifier/initiative-classifier");
(0, globals_1.describe)('classifyInitiative', () => {
    const rules = [
        {
            id: 'my-initiative',
            keywords: ['foo', 'bar'],
            patterns: [/baz-\d+/],
        },
    ];
    (0, globals_1.it)('matches keyword in title', () => {
        const item = {
            title: 'This has foo in it',
            description: 'nothing',
        };
        (0, globals_1.expect)((0, initiative_classifier_1.classifyInitiative)(item, rules)).toBe('my-initiative');
    });
    (0, globals_1.it)('matches pattern in description', () => {
        const item = {
            title: 'Normal title',
            description: 'Has baz-123 pattern',
        };
        (0, globals_1.expect)((0, initiative_classifier_1.classifyInitiative)(item, rules)).toBe('my-initiative');
    });
    (0, globals_1.it)('returns undefined for no match', () => {
        const item = {
            title: 'Nothing here',
            description: 'Also nothing',
        };
        (0, globals_1.expect)((0, initiative_classifier_1.classifyInitiative)(item, rules)).toBeUndefined();
    });
});
