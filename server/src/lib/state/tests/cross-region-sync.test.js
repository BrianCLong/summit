"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const cross_region_sync_js_1 = require("../cross-region-sync.js");
const conflict_resolver_js_1 = require("../conflict-resolver.js");
(0, globals_1.describe)('CrossRegionSyncService', () => {
    let broker;
    let serviceA;
    let serviceB;
    let serviceC;
    (0, globals_1.beforeEach)(() => {
        broker = new cross_region_sync_js_1.MockMessageBroker();
        serviceA = new cross_region_sync_js_1.CrossRegionSyncService('us-east-1', broker);
        serviceB = new cross_region_sync_js_1.CrossRegionSyncService('us-west-2', broker);
        serviceC = new cross_region_sync_js_1.CrossRegionSyncService('eu-west-1', broker);
    });
    const gCounterFactory = {
        create: () => new conflict_resolver_js_1.GCounter('temp'),
        fromJSON: (json) => conflict_resolver_js_1.GCounter.fromJSON(json)
    };
    test('should sync GCounter between two regions', async () => {
        const key = 'active-users';
        // Initialize CRDTs
        const counterA = new conflict_resolver_js_1.GCounter('us-east-1');
        const counterB = new conflict_resolver_js_1.GCounter('us-west-2');
        serviceA.registerCRDT(key, counterA, gCounterFactory);
        serviceB.registerCRDT(key, counterB, gCounterFactory);
        // Initial state
        (0, globals_1.expect)(counterA.value).toBe(0);
        (0, globals_1.expect)(counterB.value).toBe(0);
        // Modify A and sync
        counterA.increment(10);
        await serviceA.sync(key);
        // Wait for async processing (since mock broker is technically sync, but we use async functions)
        await new Promise(resolve => setTimeout(resolve, 10));
        // Check B updated
        const updatedB = serviceB.getCRDT(key);
        (0, globals_1.expect)(updatedB.value).toBe(10);
        // Modify B and sync
        counterB.increment(5);
        await serviceB.sync(key);
        await new Promise(resolve => setTimeout(resolve, 10));
        // Check A updated (10 + 5)
        const updatedA = serviceA.getCRDT(key);
        (0, globals_1.expect)(updatedA.value).toBe(15);
    });
    test('should handle concurrent updates via merge', async () => {
        const key = 'concurrent-test';
        const counterA = new conflict_resolver_js_1.GCounter('us-east-1');
        const counterB = new conflict_resolver_js_1.GCounter('us-west-2');
        serviceA.registerCRDT(key, counterA, gCounterFactory);
        serviceB.registerCRDT(key, counterB, gCounterFactory);
        // Concurrent increments
        counterA.increment(10);
        counterB.increment(20);
        // Sync both ways
        await serviceA.sync(key);
        await serviceB.sync(key);
        await new Promise(resolve => setTimeout(resolve, 10));
        const finalA = serviceA.getCRDT(key);
        const finalB = serviceB.getCRDT(key);
        (0, globals_1.expect)(finalA.value).toBe(30);
        (0, globals_1.expect)(finalB.value).toBe(30);
    });
});
