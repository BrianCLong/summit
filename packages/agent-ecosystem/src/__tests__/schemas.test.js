"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const schemas_js_1 = require("../schemas.js");
(0, vitest_1.describe)('Schemas', () => {
    (0, vitest_1.it)('should validate a valid resource', () => {
        const validResource = {
            name: 'Test Resource',
            type: 'Tool',
            url: 'https://example.com',
            capabilities: {
                tool_use: true
            }
        };
        const result = schemas_js_1.ResourceSchema.parse(validResource);
        (0, vitest_1.expect)(result.name).toBe('Test Resource');
        (0, vitest_1.expect)(result.capabilities.tool_use).toBe(true);
        (0, vitest_1.expect)(result.capabilities.memory).toBe(false); // Default
        (0, vitest_1.expect)(result.id).toBeUndefined();
    });
    (0, vitest_1.it)('should validate capabilities defaults', () => {
        const caps = schemas_js_1.CapabilitiesSchema.parse({});
        (0, vitest_1.expect)(caps.tool_use).toBe(false);
    });
});
