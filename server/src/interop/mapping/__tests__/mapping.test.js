"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const validator_js_1 = require("../validator.js");
const engine_js_1 = require("../engine.js");
(0, globals_1.describe)('Interop Mapping DSL', () => {
    const validSpec = {
        owner: 'team-tests',
        version: '1.0.0',
        sourceSystem: 'test-system',
        license: 'MIT',
        mappings: [
            { source: 'ext_id', target: 'id', required: true, transform: 'string' },
            { source: 'ext_name', target: 'name', transform: 'trim' },
            { source: 'ext_nested.age', target: 'attributes.age', transform: 'number' },
        ],
        unknownFields: 'quarantine'
    };
    test('Valid spec passes validation', () => {
        (0, globals_1.expect)(() => validator_js_1.SpecValidator.validate(validSpec)).not.toThrow();
    });
    test('Invalid spec fails validation', () => {
        // Manually construct invalid spec instead of spreading to avoid TS issues with the inferred type
        const invalidSpec = {
            owner: 'team-tests',
            version: '1.0.0',
            sourceSystem: 'test-system',
            license: 'MIT',
            mappings: [
                { source: 123, target: 'id' } // Invalid source type (number instead of string)
            ],
            unknownFields: 'quarantine'
        };
        (0, globals_1.expect)(() => validator_js_1.SpecValidator.validate(invalidSpec)).toThrow();
    });
    test('Mapping engine correctly transforms input', () => {
        const engine = new engine_js_1.MappingEngine(validSpec);
        const input = {
            ext_id: 101,
            ext_name: '  John Doe  ',
            ext_nested: {
                age: "30"
            },
            extra_field: 'ignored'
        };
        const result = engine.execute(input);
        (0, globals_1.expect)(result.errors).toHaveLength(0);
        (0, globals_1.expect)(result.output.id).toBe('101');
        (0, globals_1.expect)(result.output.name).toBe('John Doe');
        (0, globals_1.expect)(result.output.attributes.age).toBe(30);
        // Quarantine check
        (0, globals_1.expect)(result.quarantined).toHaveProperty('extra_field');
        (0, globals_1.expect)(result.quarantined.extra_field).toBe('ignored');
        // Metadata check
        (0, globals_1.expect)(result.output._metadata.sourceSystem).toBe('test-system');
    });
    test('Missing required field produces error', () => {
        const engine = new engine_js_1.MappingEngine(validSpec);
        const input = {
            ext_name: 'Jane'
        };
        const result = engine.execute(input);
        (0, globals_1.expect)(result.errors).toContain('Missing required field: ext_id');
    });
    test('Transform error produces error', () => {
        const engine = new engine_js_1.MappingEngine(validSpec);
        const input = {
            ext_id: '123',
            ext_nested: { age: 'not-a-number' }
        };
        const result = engine.execute(input);
        (0, globals_1.expect)(result.errors.length).toBeGreaterThan(0);
        (0, globals_1.expect)(result.errors[0]).toMatch(/Transform error/);
    });
});
