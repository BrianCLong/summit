"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const redactionEngine_js_1 = require("../redactionEngine.js");
(0, globals_1.describe)('RedactionEngine', () => {
    let pool;
    let engine;
    (0, globals_1.beforeEach)(() => {
        pool = {
            query: globals_1.jest.fn(),
        };
        engine = new redactionEngine_js_1.RedactionEngine({ pool });
    });
    (0, globals_1.describe)('Field Redaction Operations', () => {
        (0, globals_1.it)('should mask a value with asterisks', async () => {
            const record = {
                email: 'user@example.com',
                password: 'secret123',
            };
            const rules = [
                {
                    id: 'mask-rule',
                    fieldPattern: 'password',
                    operation: 'mask',
                    storageTargets: ['postgres'],
                    parameters: {
                        maskChar: '*',
                        preserveLength: true,
                    },
                },
            ];
            const result = await engine.redactRecord(record, rules, {
                recordId: '123',
                storageSystem: 'postgres',
            });
            (0, globals_1.expect)(result.fields).toHaveLength(1);
            (0, globals_1.expect)(result.fields[0].fieldName).toBe('password');
            (0, globals_1.expect)(result.fields[0].redactedValue).toBe('*********');
            (0, globals_1.expect)(record.password).toBe('*********');
        });
        (0, globals_1.it)('should hash a value', async () => {
            const record = {
                ssn: '123-45-6789',
            };
            const rules = [
                {
                    id: 'hash-rule',
                    fieldPattern: 'ssn',
                    operation: 'hash',
                    storageTargets: ['postgres'],
                    parameters: {
                        hashAlgorithm: 'sha256',
                    },
                },
            ];
            const result = await engine.redactRecord(record, rules, {
                recordId: '123',
                storageSystem: 'postgres',
            });
            (0, globals_1.expect)(result.fields[0].redactedValue).toMatch(/^[a-f0-9]{64}$/);
            (0, globals_1.expect)(record.ssn).not.toBe('123-45-6789');
        });
        (0, globals_1.it)('should delete a field', async () => {
            const record = {
                name: 'John Doe',
                age: 30,
                sensitiveData: 'to be deleted',
            };
            const rules = [
                {
                    id: 'delete-rule',
                    fieldPattern: 'sensitiveData',
                    operation: 'delete',
                    storageTargets: ['postgres'],
                },
            ];
            const result = await engine.redactRecord(record, rules, {
                recordId: '123',
                storageSystem: 'postgres',
            });
            (0, globals_1.expect)(result.fields[0].redactedValue).toBeNull();
            (0, globals_1.expect)(record.sensitiveData).toBeNull();
        });
        (0, globals_1.it)('should anonymize an email field', async () => {
            const record = {
                email: 'john.doe@company.com',
            };
            const rules = [
                {
                    id: 'anon-rule',
                    fieldPattern: 'email',
                    operation: 'anonymize',
                    storageTargets: ['postgres'],
                },
            ];
            const result = await engine.redactRecord(record, rules, {
                recordId: '123',
                storageSystem: 'postgres',
            });
            (0, globals_1.expect)(result.fields[0].redactedValue).toMatch(/anonymous-[a-f0-9]+@example\.com/);
            (0, globals_1.expect)(result.fields[0].redactedValue).not.toBe('john.doe@company.com');
        });
        (0, globals_1.it)('should pseudonymize consistently', async () => {
            const record1 = { userId: 'user123' };
            const record2 = { userId: 'user123' };
            const rules = [
                {
                    id: 'pseudo-rule',
                    fieldPattern: 'userId',
                    operation: 'pseudonymize',
                    storageTargets: ['postgres'],
                },
            ];
            const result1 = await engine.redactRecord(record1, rules, {
                recordId: '1',
                storageSystem: 'postgres',
            });
            const result2 = await engine.redactRecord(record2, rules, {
                recordId: '2',
                storageSystem: 'postgres',
            });
            // Same value should produce same pseudonym
            (0, globals_1.expect)(result1.fields[0].redactedValue).toBe(result2.fields[0].redactedValue);
            (0, globals_1.expect)(result1.fields[0].redactedValue).not.toBe('user123');
        });
        (0, globals_1.it)('should truncate long values', async () => {
            const record = {
                description: 'This is a very long description that exceeds the maximum allowed length',
            };
            const rules = [
                {
                    id: 'truncate-rule',
                    fieldPattern: 'description',
                    operation: 'truncate',
                    storageTargets: ['postgres'],
                    parameters: {
                        maxLength: 20,
                    },
                },
            ];
            const result = await engine.redactRecord(record, rules, {
                recordId: '123',
                storageSystem: 'postgres',
            });
            (0, globals_1.expect)(result.fields[0].redactedValue).toBe('This is a very long ...');
            (0, globals_1.expect)(result.fields[0].redactedValue.length).toBeLessThanOrEqual(23); // 20 + '...'
        });
        (0, globals_1.it)('should generalize age to age range', async () => {
            const record = {
                age: 35,
            };
            const rules = [
                {
                    id: 'generalize-rule',
                    fieldPattern: 'age',
                    operation: 'generalize',
                    storageTargets: ['postgres'],
                },
            ];
            const result = await engine.redactRecord(record, rules, {
                recordId: '123',
                storageSystem: 'postgres',
            });
            (0, globals_1.expect)(result.fields[0].redactedValue).toBe('30-49');
        });
    });
    (0, globals_1.describe)('Rule Matching', () => {
        (0, globals_1.it)('should match wildcard patterns', async () => {
            const record = {
                userEmail: 'test@example.com',
                adminEmail: 'admin@example.com',
                contact: 'contact@example.com',
            };
            const rules = [
                {
                    id: 'wildcard-rule',
                    fieldPattern: '*Email',
                    operation: 'hash',
                    storageTargets: ['postgres'],
                },
            ];
            const result = await engine.redactRecord(record, rules, {
                recordId: '123',
                storageSystem: 'postgres',
            });
            (0, globals_1.expect)(result.fields).toHaveLength(2);
            (0, globals_1.expect)(result.fields.some((f) => f.fieldName === 'userEmail')).toBe(true);
            (0, globals_1.expect)(result.fields.some((f) => f.fieldName === 'adminEmail')).toBe(true);
            (0, globals_1.expect)(result.fields.some((f) => f.fieldName === 'contact')).toBe(false);
        });
        (0, globals_1.it)('should match by field type', async () => {
            const record = {
                userEmail: 'test@example.com',
                otherField: 'not-an-email',
            };
            const rules = [
                {
                    id: 'type-rule',
                    fieldPattern: '*',
                    operation: 'hash',
                    storageTargets: ['postgres'],
                    conditions: {
                        fieldType: 'email',
                    },
                },
            ];
            const result = await engine.redactRecord(record, rules, {
                recordId: '123',
                storageSystem: 'postgres',
            });
            (0, globals_1.expect)(result.fields).toHaveLength(1);
            (0, globals_1.expect)(result.fields[0].fieldName).toBe('userEmail');
        });
        (0, globals_1.it)('should apply more specific rules first', async () => {
            const record = {
                email: 'test@example.com',
            };
            const rules = [
                {
                    id: 'general-rule',
                    fieldPattern: '*',
                    operation: 'mask',
                    storageTargets: ['postgres'],
                },
                {
                    id: 'specific-rule',
                    fieldPattern: 'email',
                    operation: 'hash',
                    storageTargets: ['postgres'],
                },
            ];
            const result = await engine.redactRecord(record, rules, {
                recordId: '123',
                storageSystem: 'postgres',
            });
            // Specific rule should be applied (hash, not mask)
            (0, globals_1.expect)(result.fields[0].operation).toBe('hash');
        });
    });
    (0, globals_1.describe)('Provenance and Hash Stubs', () => {
        (0, globals_1.it)('should create hash stubs when requested', async () => {
            const record = {
                ssn: '123-45-6789',
            };
            const rules = [
                {
                    id: 'stub-rule',
                    fieldPattern: 'ssn',
                    operation: 'hash',
                    storageTargets: ['postgres'],
                    keepHashStub: true,
                },
            ];
            const result = await engine.redactRecord(record, rules, {
                recordId: '123',
                storageSystem: 'postgres',
                preserveProvenance: true,
            });
            (0, globals_1.expect)(result.fields[0].hashStub).toBeDefined();
            (0, globals_1.expect)(result.hashStubs.has('ssn')).toBe(true);
        });
        (0, globals_1.it)('should preserve original value when provenance is enabled', async () => {
            const record = {
                name: 'John Doe',
            };
            const rules = [
                {
                    id: 'preserve-rule',
                    fieldPattern: 'name',
                    operation: 'anonymize',
                    storageTargets: ['postgres'],
                },
            ];
            const result = await engine.redactRecord(record, rules, {
                recordId: '123',
                storageSystem: 'postgres',
                preserveProvenance: true,
            });
            (0, globals_1.expect)(result.fields[0].originalValue).toBe('John Doe');
        });
    });
    (0, globals_1.describe)('Bulk Operations', () => {
        (0, globals_1.it)('should redact multiple PostgreSQL records', async () => {
            const mockQuery = pool.query;
            mockQuery.mockResolvedValueOnce({
                rows: [
                    { id: '1', email: 'user1@example.com', name: 'User 1' },
                    { id: '2', email: 'user2@example.com', name: 'User 2' },
                ],
            });
            const rules = [
                {
                    id: 'email-rule',
                    fieldPattern: 'email',
                    operation: 'hash',
                    storageTargets: ['postgres'],
                },
            ];
            const results = await engine.redactPostgresRecords('users', ['1', '2'], rules);
            (0, globals_1.expect)(results).toHaveLength(2);
            (0, globals_1.expect)(results[0].recordId).toBe('1');
            (0, globals_1.expect)(results[1].recordId).toBe('2');
            (0, globals_1.expect)(mockQuery).toHaveBeenCalledWith(globals_1.expect.stringContaining('UPDATE users'), globals_1.expect.any(Array));
        });
    });
    (0, globals_1.describe)('Edge Cases', () => {
        (0, globals_1.it)('should handle null values', async () => {
            const record = {
                email: null,
            };
            const rules = [
                {
                    id: 'null-rule',
                    fieldPattern: 'email',
                    operation: 'hash',
                    storageTargets: ['postgres'],
                },
            ];
            const result = await engine.redactRecord(record, rules, {
                recordId: '123',
                storageSystem: 'postgres',
            });
            (0, globals_1.expect)(result.fields[0].redactedValue).toBe('');
        });
        (0, globals_1.it)('should handle empty rules array', async () => {
            const record = {
                name: 'John Doe',
                email: 'john@example.com',
            };
            const result = await engine.redactRecord(record, [], {
                recordId: '123',
                storageSystem: 'postgres',
            });
            (0, globals_1.expect)(result.fields).toHaveLength(0);
            (0, globals_1.expect)(record.name).toBe('John Doe');
            (0, globals_1.expect)(record.email).toBe('john@example.com');
        });
        (0, globals_1.it)('should handle records with no matching fields', async () => {
            const record = {
                id: 123,
                createdAt: new Date(),
            };
            const rules = [
                {
                    id: 'nonmatch-rule',
                    fieldPattern: 'nonexistent',
                    operation: 'delete',
                    storageTargets: ['postgres'],
                },
            ];
            const result = await engine.redactRecord(record, rules, {
                recordId: '123',
                storageSystem: 'postgres',
            });
            (0, globals_1.expect)(result.fields).toHaveLength(0);
        });
        (0, globals_1.it)('should filter rules by storage system', async () => {
            const record = {
                email: 'test@example.com',
            };
            const rules = [
                {
                    id: 'neo4j-rule',
                    fieldPattern: 'email',
                    operation: 'hash',
                    storageTargets: ['neo4j'], // Won't match postgres
                },
            ];
            const result = await engine.redactRecord(record, rules, {
                recordId: '123',
                storageSystem: 'postgres',
            });
            (0, globals_1.expect)(result.fields).toHaveLength(0);
        });
    });
    (0, globals_1.describe)('Format Preservation', () => {
        (0, globals_1.it)('should preserve format when masking phone numbers', async () => {
            const record = {
                phone: '555-123-4567',
            };
            const rules = [
                {
                    id: 'phone-rule',
                    fieldPattern: 'phone',
                    operation: 'mask',
                    storageTargets: ['postgres'],
                    parameters: {
                        maskChar: 'X',
                        preserveFormat: true,
                    },
                },
            ];
            const result = await engine.redactRecord(record, rules, {
                recordId: '123',
                storageSystem: 'postgres',
            });
            (0, globals_1.expect)(result.fields[0].redactedValue).toBe('XXX-XXX-XXXX');
        });
        (0, globals_1.it)('should preserve length when masking', async () => {
            const record = {
                secret: '12345',
            };
            const rules = [
                {
                    id: 'length-rule',
                    fieldPattern: 'secret',
                    operation: 'mask',
                    storageTargets: ['postgres'],
                    parameters: {
                        preserveLength: true,
                    },
                },
            ];
            const result = await engine.redactRecord(record, rules, {
                recordId: '123',
                storageSystem: 'postgres',
            });
            (0, globals_1.expect)(result.fields[0].redactedValue).toHaveLength(5);
        });
    });
});
