"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const EntitlementsService_js_1 = require("../EntitlementsService.js");
(0, globals_1.describe)('EntitlementsService', () => {
    let service;
    (0, globals_1.beforeEach)(() => {
        service = EntitlementsService_js_1.EntitlementsService.getInstance();
    });
    (0, globals_1.describe)('canUse', () => {
        (0, globals_1.it)('should return true by default for any feature', async () => {
            const result = await service.canUse('any_feature', 'tenant_123');
            (0, globals_1.expect)(result).toBe(true);
        });
    });
    (0, globals_1.describe)('quotaRemaining', () => {
        (0, globals_1.it)('should return Infinity by default for any feature', async () => {
            const result = await service.quotaRemaining('any_feature', 'tenant_123');
            (0, globals_1.expect)(result).toBe(Infinity);
        });
    });
    (0, globals_1.describe)('Singleton Pattern', () => {
        (0, globals_1.it)('should return the same instance', () => {
            const instance1 = EntitlementsService_js_1.EntitlementsService.getInstance();
            const instance2 = EntitlementsService_js_1.EntitlementsService.getInstance();
            (0, globals_1.expect)(instance1).toBe(instance2);
        });
    });
});
