"use strict";
/**
 * Entity Resolution Service - Blocking Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const blocking_js_1 = require("../matching/blocking.js");
(0, globals_1.describe)('Blocking', () => {
    (0, globals_1.describe)('computeBlockingKeys', () => {
        (0, globals_1.it)('should generate email domain key', () => {
            const record = {
                id: '1',
                entityType: 'Person',
                attributes: {
                    email: 'john@example.com',
                },
            };
            const keys = (0, blocking_js_1.computeBlockingKeys)(record);
            (0, globals_1.expect)(keys.some((k) => k.key.includes('example.com'))).toBe(true);
        });
        (0, globals_1.it)('should generate name+country key', () => {
            const record = {
                id: '2',
                entityType: 'Person',
                attributes: {
                    name: 'John Smith',
                    country: 'US',
                },
            };
            const keys = (0, blocking_js_1.computeBlockingKeys)(record);
            (0, globals_1.expect)(keys.some((k) => k.key.includes('smith') && k.key.includes('us'))).toBe(true);
        });
        (0, globals_1.it)('should generate org key', () => {
            const record = {
                id: '3',
                entityType: 'Organization',
                attributes: {
                    organization: 'Acme Corp',
                },
            };
            const keys = (0, blocking_js_1.computeBlockingKeys)(record);
            (0, globals_1.expect)(keys.some((k) => k.key.includes('org:'))).toBe(true);
        });
        (0, globals_1.it)('should fallback to entity type if no other keys', () => {
            const record = {
                id: '4',
                entityType: 'Person',
                attributes: {},
            };
            const keys = (0, blocking_js_1.computeBlockingKeys)(record);
            (0, globals_1.expect)(keys.some((k) => k.key === 'type:Person')).toBe(true);
        });
    });
    (0, globals_1.describe)('groupByBlockingKeys', () => {
        (0, globals_1.it)('should group records by shared keys', () => {
            const records = [
                {
                    id: '1',
                    entityType: 'Person',
                    attributes: { email: 'john@example.com' },
                },
                {
                    id: '2',
                    entityType: 'Person',
                    attributes: { email: 'jane@example.com' },
                },
                {
                    id: '3',
                    entityType: 'Person',
                    attributes: { email: 'bob@different.com' },
                },
            ];
            const groups = (0, blocking_js_1.groupByBlockingKeys)(records);
            // Records 1 and 2 should share email_domain:example.com
            const exampleGroup = groups.get('email_domain:example.com');
            (0, globals_1.expect)(exampleGroup).toBeDefined();
            (0, globals_1.expect)(exampleGroup).toContain('1');
            (0, globals_1.expect)(exampleGroup).toContain('2');
            (0, globals_1.expect)(exampleGroup).not.toContain('3');
        });
    });
    (0, globals_1.describe)('findCandidatePairs', () => {
        (0, globals_1.it)('should find pairs that share blocking keys', () => {
            const records = [
                {
                    id: '1',
                    entityType: 'Person',
                    attributes: { email: 'john@example.com' },
                },
                {
                    id: '2',
                    entityType: 'Person',
                    attributes: { email: 'jane@example.com' },
                },
            ];
            const pairs = (0, blocking_js_1.findCandidatePairs)(records);
            (0, globals_1.expect)(pairs.length).toBeGreaterThan(0);
            (0, globals_1.expect)(pairs).toContainEqual(['1', '2']);
        });
        (0, globals_1.it)('should not create pairs for records without shared keys', () => {
            const records = [
                {
                    id: '1',
                    entityType: 'Person',
                    attributes: { email: 'john@example.com' },
                },
                {
                    id: '2',
                    entityType: 'Person',
                    attributes: { email: 'jane@different.com' },
                },
            ];
            const pairs = (0, blocking_js_1.findCandidatePairs)(records);
            // Should not create a pair based solely on email domains
            (0, globals_1.expect)(pairs).not.toContainEqual(['1', '2']);
        });
        (0, globals_1.it)('should avoid duplicate pairs', () => {
            const records = [
                {
                    id: '1',
                    entityType: 'Person',
                    attributes: {
                        email: 'john@example.com',
                        organization: 'Acme',
                    },
                },
                {
                    id: '2',
                    entityType: 'Person',
                    attributes: {
                        email: 'jane@example.com',
                        organization: 'Acme',
                    },
                },
            ];
            const pairs = (0, blocking_js_1.findCandidatePairs)(records);
            // Should only have one pair (1,2), not duplicated
            const pair12Count = pairs.filter((p) => (p[0] === '1' && p[1] === '2') || (p[0] === '2' && p[1] === '1')).length;
            (0, globals_1.expect)(pair12Count).toBe(1);
        });
    });
});
