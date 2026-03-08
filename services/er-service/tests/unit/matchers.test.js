"use strict";
/**
 * Unit Tests for Matchers
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const index_js_1 = require("../../src/matchers/index.js");
(0, globals_1.describe)('Deterministic Matchers', () => {
    (0, globals_1.describe)('NationalIdMatcher', () => {
        let matcher;
        (0, globals_1.beforeEach)(() => {
            matcher = new index_js_1.NationalIdMatcher();
        });
        (0, globals_1.it)('should match identical national IDs', async () => {
            const input = {
                entityType: 'Person',
                attributesA: { nationalId: '123-45-6789' },
                attributesB: { nationalId: '123-45-6789' },
            };
            const results = await matcher.match(input);
            (0, globals_1.expect)(results.length).toBeGreaterThan(0);
            (0, globals_1.expect)(results[0].similarity).toBe(1.0);
            (0, globals_1.expect)(results[0].isDeterministic).toBe(true);
        });
        (0, globals_1.it)('should match national IDs with different formatting', async () => {
            const input = {
                entityType: 'Person',
                attributesA: { nationalId: '123-45-6789' },
                attributesB: { nationalId: '123456789' },
            };
            const results = await matcher.match(input);
            (0, globals_1.expect)(results.length).toBeGreaterThan(0);
            (0, globals_1.expect)(results[0].similarity).toBe(1.0);
        });
        (0, globals_1.it)('should not match different national IDs', async () => {
            const input = {
                entityType: 'Person',
                attributesA: { nationalId: '123-45-6789' },
                attributesB: { nationalId: '987-65-4321' },
            };
            const results = await matcher.match(input);
            (0, globals_1.expect)(results.length).toBeGreaterThan(0);
            (0, globals_1.expect)(results[0].similarity).toBe(0.0);
        });
        (0, globals_1.it)('should return empty results when no IDs present', async () => {
            const input = {
                entityType: 'Person',
                attributesA: { name: 'John' },
                attributesB: { name: 'John' },
            };
            const results = await matcher.match(input);
            (0, globals_1.expect)(results.length).toBe(0);
        });
    });
    (0, globals_1.describe)('EmailMatcher', () => {
        let matcher;
        (0, globals_1.beforeEach)(() => {
            matcher = new index_js_1.EmailMatcher();
        });
        (0, globals_1.it)('should match identical emails', async () => {
            const input = {
                entityType: 'Person',
                attributesA: { email: 'john@example.com' },
                attributesB: { email: 'john@example.com' },
            };
            const results = await matcher.match(input);
            (0, globals_1.expect)(results.length).toBeGreaterThan(0);
            (0, globals_1.expect)(results[0].similarity).toBe(1.0);
        });
        (0, globals_1.it)('should match emails with different casing', async () => {
            const input = {
                entityType: 'Person',
                attributesA: { email: 'John@Example.COM' },
                attributesB: { email: 'john@example.com' },
            };
            const results = await matcher.match(input);
            (0, globals_1.expect)(results.length).toBeGreaterThan(0);
            (0, globals_1.expect)(results[0].similarity).toBe(1.0);
        });
        (0, globals_1.it)('should match Gmail-style aliases', async () => {
            const input = {
                entityType: 'Person',
                attributesA: { email: 'john.doe+work@gmail.com' },
                attributesB: { email: 'johndoe@gmail.com' },
            };
            const results = await matcher.match(input);
            (0, globals_1.expect)(results.length).toBeGreaterThan(0);
            (0, globals_1.expect)(results[0].similarity).toBe(1.0);
        });
        (0, globals_1.it)('should not match different emails', async () => {
            const input = {
                entityType: 'Person',
                attributesA: { email: 'john@example.com' },
                attributesB: { email: 'jane@example.com' },
            };
            const results = await matcher.match(input);
            (0, globals_1.expect)(results.length).toBeGreaterThan(0);
            (0, globals_1.expect)(results[0].similarity).toBe(0.0);
        });
    });
    (0, globals_1.describe)('PhoneMatcher', () => {
        let matcher;
        (0, globals_1.beforeEach)(() => {
            matcher = new index_js_1.PhoneMatcher();
        });
        (0, globals_1.it)('should match identical phone numbers', async () => {
            const input = {
                entityType: 'Person',
                attributesA: { phone: '+1-555-123-4567' },
                attributesB: { phone: '+1-555-123-4567' },
            };
            const results = await matcher.match(input);
            (0, globals_1.expect)(results.length).toBeGreaterThan(0);
            (0, globals_1.expect)(results[0].similarity).toBe(1.0);
        });
        (0, globals_1.it)('should match phone numbers with different formatting', async () => {
            const input = {
                entityType: 'Person',
                attributesA: { phone: '+1 (555) 123-4567' },
                attributesB: { phone: '5551234567' },
            };
            const results = await matcher.match(input);
            (0, globals_1.expect)(results.length).toBeGreaterThan(0);
            (0, globals_1.expect)(results[0].similarity).toBe(1.0);
        });
    });
    (0, globals_1.describe)('PassportMatcher', () => {
        let matcher;
        (0, globals_1.beforeEach)(() => {
            matcher = new index_js_1.PassportMatcher();
        });
        (0, globals_1.it)('should match identical passport numbers', async () => {
            const input = {
                entityType: 'Person',
                attributesA: {
                    props: {
                        identifications: [{ type: 'passport', value: 'AB123456', issuingCountry: 'US' }],
                    },
                },
                attributesB: {
                    props: {
                        identifications: [{ type: 'passport', value: 'AB123456', issuingCountry: 'US' }],
                    },
                },
            };
            const results = await matcher.match(input);
            (0, globals_1.expect)(results.length).toBeGreaterThan(0);
            (0, globals_1.expect)(results[0].similarity).toBe(1.0);
        });
    });
});
(0, globals_1.describe)('Probabilistic Matchers', () => {
    (0, globals_1.describe)('NameMatcher', () => {
        let matcher;
        (0, globals_1.beforeEach)(() => {
            matcher = new index_js_1.NameMatcher();
        });
        (0, globals_1.it)('should give high score for identical names', async () => {
            const input = {
                entityType: 'Person',
                attributesA: { props: { name: 'John Smith' } },
                attributesB: { props: { name: 'John Smith' } },
            };
            const results = await matcher.match(input);
            (0, globals_1.expect)(results.length).toBeGreaterThan(0);
            (0, globals_1.expect)(results[0].similarity).toBe(1.0);
        });
        (0, globals_1.it)('should give high score for similar names', async () => {
            const input = {
                entityType: 'Person',
                attributesA: { props: { name: 'John Smith' } },
                attributesB: { props: { name: 'Jon Smith' } },
            };
            const results = await matcher.match(input);
            (0, globals_1.expect)(results.length).toBeGreaterThan(0);
            (0, globals_1.expect)(results[0].similarity).toBeGreaterThan(0.8);
        });
        (0, globals_1.it)('should give moderate score for name order variations', async () => {
            const input = {
                entityType: 'Person',
                attributesA: { props: { name: 'John Michael Smith' } },
                attributesB: { props: { name: 'Smith, John Michael' } },
            };
            const results = await matcher.match(input);
            (0, globals_1.expect)(results.length).toBeGreaterThan(0);
            (0, globals_1.expect)(results[0].similarity).toBeGreaterThan(0.6);
        });
        (0, globals_1.it)('should give low score for different names', async () => {
            const input = {
                entityType: 'Person',
                attributesA: { props: { name: 'John Smith' } },
                attributesB: { props: { name: 'Jane Doe' } },
            };
            const results = await matcher.match(input);
            (0, globals_1.expect)(results.length).toBeGreaterThan(0);
            (0, globals_1.expect)(results[0].similarity).toBeLessThan(0.5);
        });
        (0, globals_1.it)('should normalize organization names', async () => {
            const input = {
                entityType: 'Organization',
                attributesA: { props: { name: 'Acme Corporation Inc.' } },
                attributesB: { props: { name: 'Acme Corp' } },
            };
            const results = await matcher.match(input);
            (0, globals_1.expect)(results.length).toBeGreaterThan(0);
            (0, globals_1.expect)(results[0].similarity).toBeGreaterThan(0.7);
        });
    });
    (0, globals_1.describe)('DateOfBirthMatcher', () => {
        let matcher;
        (0, globals_1.beforeEach)(() => {
            matcher = new index_js_1.DateOfBirthMatcher();
        });
        (0, globals_1.it)('should match identical dates', async () => {
            const input = {
                entityType: 'Person',
                attributesA: { props: { dateOfBirth: '1990-05-15' } },
                attributesB: { props: { dateOfBirth: '1990-05-15' } },
            };
            const results = await matcher.match(input);
            (0, globals_1.expect)(results.length).toBeGreaterThan(0);
            (0, globals_1.expect)(results[0].similarity).toBe(1.0);
        });
        (0, globals_1.it)('should detect day/month transposition', async () => {
            const input = {
                entityType: 'Person',
                attributesA: { props: { dateOfBirth: '1990-05-12' } },
                attributesB: { props: { dateOfBirth: '1990-12-05' } },
            };
            const results = await matcher.match(input);
            (0, globals_1.expect)(results.length).toBeGreaterThan(0);
            (0, globals_1.expect)(results[0].similarity).toBeGreaterThan(0.8);
            (0, globals_1.expect)(results[0].explanation).toContain('transposition');
        });
        (0, globals_1.it)('should give partial score for year-only match', async () => {
            const input = {
                entityType: 'Person',
                attributesA: { props: { dateOfBirth: '1990-05-15' } },
                attributesB: { props: { dateOfBirth: '1990-08-20' } },
            };
            const results = await matcher.match(input);
            (0, globals_1.expect)(results.length).toBeGreaterThan(0);
            (0, globals_1.expect)(results[0].similarity).toBe(0.3);
        });
        (0, globals_1.it)('should give zero for completely different dates', async () => {
            const input = {
                entityType: 'Person',
                attributesA: { props: { dateOfBirth: '1990-05-15' } },
                attributesB: { props: { dateOfBirth: '1985-08-20' } },
            };
            const results = await matcher.match(input);
            (0, globals_1.expect)(results.length).toBeGreaterThan(0);
            (0, globals_1.expect)(results[0].similarity).toBe(0.0);
        });
    });
    (0, globals_1.describe)('AddressMatcher', () => {
        let matcher;
        (0, globals_1.beforeEach)(() => {
            matcher = new index_js_1.AddressMatcher();
        });
        (0, globals_1.it)('should give high score for similar addresses', async () => {
            const input = {
                entityType: 'Person',
                attributesA: {
                    props: {
                        address: {
                            street: '123 Main Street',
                            city: 'New York',
                            state: 'NY',
                            postalCode: '10001',
                            country: 'USA',
                        },
                    },
                },
                attributesB: {
                    props: {
                        address: {
                            street: '123 Main St',
                            city: 'New York',
                            state: 'NY',
                            postalCode: '10001',
                            country: 'USA',
                        },
                    },
                },
            };
            const results = await matcher.match(input);
            (0, globals_1.expect)(results.length).toBeGreaterThan(0);
            (0, globals_1.expect)(results[0].similarity).toBeGreaterThan(0.8);
        });
        (0, globals_1.it)('should give partial score for same city/country', async () => {
            const input = {
                entityType: 'Person',
                attributesA: {
                    props: {
                        address: {
                            street: '123 Main Street',
                            city: 'New York',
                            country: 'USA',
                        },
                    },
                },
                attributesB: {
                    props: {
                        address: {
                            street: '456 Oak Avenue',
                            city: 'New York',
                            country: 'USA',
                        },
                    },
                },
            };
            const results = await matcher.match(input);
            (0, globals_1.expect)(results.length).toBeGreaterThan(0);
            (0, globals_1.expect)(results[0].similarity).toBeGreaterThan(0.3);
        });
    });
});
