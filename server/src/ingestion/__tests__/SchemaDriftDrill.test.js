"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const semantic_mapper_js_1 = require("../semantic-mapper.js");
(0, globals_1.describe)('Schema Drift Drill (Task #108)', () => {
    (0, globals_1.it)('should autonomously map a "User" payload to "Person" entity', async () => {
        const rawData = {
            full_name: 'John Doe',
            contact_email: 'john@example.com',
            job_role: 'Engineer'
        };
        const mapping = await semantic_mapper_js_1.semanticMapperService.suggestMapping(rawData);
        (0, globals_1.expect)(mapping.targetType).toBe('Person');
        (0, globals_1.expect)(mapping.overallConfidence).toBeGreaterThan(0.5);
        // Check specific field mappings
        const nameMap = mapping.mappings.find(m => m.sourceField === 'full_name');
        (0, globals_1.expect)(nameMap?.targetField).toBe('name');
        const emailMap = mapping.mappings.find(m => m.sourceField === 'contact_email');
        (0, globals_1.expect)(emailMap?.targetField).toBe('email');
    });
    (0, globals_1.it)('should autonomously map a "Company" payload to "Organization" entity', async () => {
        const rawData = {
            company_name: 'Acme Corp',
            web_address: 'acme.com',
            founded_in: '1999'
        };
        const mapping = await semantic_mapper_js_1.semanticMapperService.suggestMapping(rawData);
        (0, globals_1.expect)(mapping.targetType).toBe('Organization');
        const transformed = semantic_mapper_js_1.semanticMapperService.applyMapping(rawData, mapping);
        (0, globals_1.expect)(transformed.type).toBe('Organization');
        (0, globals_1.expect)(transformed.name).toBe('Acme Corp');
        (0, globals_1.expect)(transformed.website).toBe('acme.com');
    });
    (0, globals_1.it)('should degrade gracefully for unknown schemas', async () => {
        const rawData = {
            x: 1,
            y: 2,
            z: 3
        };
        const mapping = await semantic_mapper_js_1.semanticMapperService.suggestMapping(rawData);
        (0, globals_1.expect)(mapping.targetType).toBe('Unstructured');
    });
});
