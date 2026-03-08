"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const schema_js_1 = require("../schema.js");
const zod_1 = require("zod");
(0, globals_1.describe)('Config Validation', () => {
    (0, globals_1.it)('should apply defaults for empty input', () => {
        const res = schema_js_1.ConfigSchema.parse({});
        (0, globals_1.expect)(res.port).toBe(4000);
        (0, globals_1.expect)(res.env).toBe('development');
        (0, globals_1.expect)(res.neo4j.uri).toBe('bolt://localhost:7687');
    });
    (0, globals_1.it)('should coerce types correctly', () => {
        const res = schema_js_1.ConfigSchema.parse({
            port: '8080',
            rateLimit: {
                maxRequests: '500'
            }
        });
        (0, globals_1.expect)(res.port).toBe(8080);
        (0, globals_1.expect)(res.rateLimit.maxRequests).toBe(500);
    });
    (0, globals_1.it)('should fail on invalid enum values', () => {
        (0, globals_1.expect)(() => {
            schema_js_1.ConfigSchema.parse({ env: 'invalid-env' });
        }).toThrow(zod_1.z.ZodError);
    });
    (0, globals_1.it)('should validate nested objects', () => {
        const res = schema_js_1.ConfigSchema.parse({
            neo4j: {
                username: 'custom'
            }
        });
        (0, globals_1.expect)(res.neo4j.username).toBe('custom');
        (0, globals_1.expect)(res.neo4j.password).toBe('devpassword'); // default preserved
    });
});
