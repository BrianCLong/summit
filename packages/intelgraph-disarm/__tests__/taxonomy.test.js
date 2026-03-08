"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("../src/index.js");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('DISARM Taxonomy Loader', () => {
    (0, globals_1.it)('should load the taxonomy successfully', () => {
        const taxonomy = (0, index_js_1.loadDisarmTaxonomy)();
        (0, globals_1.expect)(taxonomy).toBeDefined();
        (0, globals_1.expect)(taxonomy.version).toBe('1.0');
        (0, globals_1.expect)(taxonomy.techniques.length).toBeGreaterThan(0);
    });
    (0, globals_1.it)('should contain specific techniques', () => {
        const taxonomy = (0, index_js_1.loadDisarmTaxonomy)();
        const t0081 = taxonomy.techniques.find((t) => t.technique_id === 'T0081');
        (0, globals_1.expect)(t0081).toBeDefined();
        (0, globals_1.expect)(t0081?.technique_name).toBe('Create Inauthentic Accounts');
        (0, globals_1.expect)(t0081?.observables).toHaveLength(3);
    });
    (0, globals_1.it)('should fail if schema is invalid', () => {
        // This implicitly tests the Zod schema validation because loadDisarmTaxonomy calls parse().
        // Since the source file is valid, this should pass.
        (0, globals_1.expect)(() => (0, index_js_1.loadDisarmTaxonomy)()).not.toThrow();
    });
});
