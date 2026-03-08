"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const registry_js_1 = require("../../src/governance/classification/registry.js");
const types_js_1 = require("../../src/governance/classification/types.js");
(0, globals_1.describe)('ClassificationRegistry', () => {
    let registry;
    (0, globals_1.beforeEach)(() => {
        registry = registry_js_1.ClassificationRegistry.getInstance();
        registry.clear();
    });
    (0, globals_1.it)('should be a singleton', () => {
        const reg1 = registry_js_1.ClassificationRegistry.getInstance();
        const reg2 = registry_js_1.ClassificationRegistry.getInstance();
        (0, globals_1.expect)(reg1).toBe(reg2);
    });
    (0, globals_1.it)('should register and retrieve classification', () => {
        registry.register('User.email', types_js_1.DataClassification.PII, types_js_1.DataSeverity.HIGH);
        const rule = registry.get('User.email');
        (0, globals_1.expect)(rule).toBeDefined();
        (0, globals_1.expect)(rule?.classification).toBe(types_js_1.DataClassification.PII);
        (0, globals_1.expect)(rule?.severity).toBe(types_js_1.DataSeverity.HIGH);
    });
    (0, globals_1.it)('should return undefined for unknown path', () => {
        (0, globals_1.expect)(registry.get('Unknown.field')).toBeUndefined();
    });
    (0, globals_1.it)('should overwrite existing registration', () => {
        registry.register('User.email', types_js_1.DataClassification.PII, types_js_1.DataSeverity.HIGH);
        registry.register('User.email', types_js_1.DataClassification.SECRET, types_js_1.DataSeverity.CRITICAL);
        const rule = registry.get('User.email');
        (0, globals_1.expect)(rule?.classification).toBe(types_js_1.DataClassification.SECRET);
        (0, globals_1.expect)(rule?.severity).toBe(types_js_1.DataSeverity.CRITICAL);
    });
});
