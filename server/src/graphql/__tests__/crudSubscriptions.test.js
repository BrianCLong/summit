"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const crudResolvers_js_1 = require("../resolvers/crudResolvers.js");
(0, globals_1.describe)('crud subscription predicates', () => {
    const event = (metadata, payload = {}) => ({
        id: 'evt-1',
        timestamp: Date.now(),
        payload,
        metadata,
    });
    (0, globals_1.it)('accepts events for the same tenant and investigation', () => {
        const predicate = (0, crudResolvers_js_1.buildGraphEventFilter)({ id: 'u1', tenantId: 't-1' }, 'inv-1');
        (0, globals_1.expect)(predicate(event({ tenantId: 't-1', investigationId: 'inv-1', type: 'ENTITY_CREATED' }, { investigationId: 'inv-1' }))).toBe(true);
    });
    (0, globals_1.it)('rejects events from other tenants', () => {
        const predicate = (0, crudResolvers_js_1.buildGraphEventFilter)({ id: 'u1', tenantId: 't-1' }, 'inv-1');
        (0, globals_1.expect)(predicate(event({ tenantId: 't-2', investigationId: 'inv-1', type: 'ENTITY_CREATED' }))).toBe(false);
    });
    (0, globals_1.it)('rejects events when type filter does not match', () => {
        const predicate = (0, crudResolvers_js_1.buildGraphEventFilter)({ id: 'u1', tenantId: 't-1' }, 'inv-1', ['ENTITY_UPDATED']);
        (0, globals_1.expect)(predicate(event({ tenantId: 't-1', investigationId: 'inv-1', type: 'ENTITY_CREATED' }))).toBe(false);
    });
});
