"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const FAR_FUTURE = '9999-12-31 23:59:59+00';
const store = [];
const getPostgresPoolMock = globals_1.jest.fn();
function toMs(value) {
    if (value === FAR_FUTURE)
        return Number.MAX_SAFE_INTEGER;
    return new Date(value).getTime();
}
const poolMock = {
    async connect() {
        return {
            async query(sql, params = []) {
                if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
                    return { rows: [], rowCount: 0 };
                }
                if (sql.includes('UPDATE bitemporal_entities')) {
                    const [id, tenantId, transactionTo, validFrom, transactionFrom] = params;
                    let updated = 0;
                    for (const fact of store) {
                        if (fact.id === id &&
                            fact.tenant_id === tenantId &&
                            fact.transaction_to === transactionTo &&
                            fact.valid_from === validFrom) {
                            fact.transaction_to = transactionFrom;
                            updated += 1;
                        }
                    }
                    return { rows: [], rowCount: updated };
                }
                if (sql.includes('INSERT INTO bitemporal_entities')) {
                    const [id, tenantId, kind, props, validFrom, validTo, transactionFrom] = params;
                    store.push({
                        id,
                        tenant_id: tenantId,
                        kind,
                        props: JSON.parse(props),
                        valid_from: validFrom,
                        valid_to: validTo,
                        transaction_from: transactionFrom,
                        transaction_to: FAR_FUTURE,
                    });
                    return { rows: [], rowCount: 1 };
                }
                return { rows: [], rowCount: 0 };
            },
            release() { },
        };
    },
    async query(_sql, params = []) {
        const [id, tenantId, asOfValid, asOfTransaction] = params;
        const validMs = toMs(asOfValid);
        const transactionMs = toMs(asOfTransaction);
        const match = store
            .filter((fact) => {
            return (fact.id === id &&
                fact.tenant_id === tenantId &&
                toMs(fact.valid_from) <= validMs &&
                toMs(fact.valid_to) > validMs &&
                toMs(fact.transaction_from) <= transactionMs &&
                toMs(fact.transaction_to) > transactionMs);
        })
            .sort((a, b) => toMs(b.transaction_from) - toMs(a.transaction_from))[0];
        if (!match)
            return { rows: [], rowCount: 0 };
        return {
            rows: [
                {
                    ...match,
                    valid_from: new Date(match.valid_from),
                    valid_to: match.valid_to === FAR_FUTURE
                        ? new Date('9999-12-31T23:59:59.000Z')
                        : new Date(match.valid_to),
                    transaction_from: new Date(match.transaction_from),
                    transaction_to: match.transaction_to === FAR_FUTURE
                        ? new Date('9999-12-31T23:59:59.000Z')
                        : new Date(match.transaction_to),
                },
            ],
            rowCount: 1,
        };
    },
};
globals_1.jest.unstable_mockModule('../../db/postgres.js', () => ({
    getPostgresPool: getPostgresPoolMock,
}));
(0, globals_1.describe)('Bitemporal Service (Task #109)', () => {
    let bitemporalService;
    const tenantId = 'test-tenant';
    const entityId = 'target-entity-123';
    (0, globals_1.beforeAll)(async () => {
        getPostgresPoolMock.mockReturnValue(poolMock);
        ({ bitemporalService } = await Promise.resolve().then(() => __importStar(require('../BitemporalService.js'))));
    });
    (0, globals_1.beforeEach)(() => {
        store.length = 0;
        getPostgresPoolMock.mockReturnValue(poolMock);
    });
    (0, globals_1.it)('should record a fact and allow point-in-time retrieval', async () => {
        const validFrom = new Date('2026-01-01T00:00:00Z');
        await bitemporalService.recordFact({
            id: entityId,
            tenantId,
            kind: 'Person',
            props: { name: 'John Doe', status: 'Active' },
            validFrom,
            createdBy: 'test-user',
        });
        const current = await bitemporalService.queryAsOf(entityId, tenantId);
        (0, globals_1.expect)(current).not.toBeNull();
        (0, globals_1.expect)(current?.props.name).toBe('John Doe');
        const pastValid = await bitemporalService.queryAsOf(entityId, tenantId, new Date('2025-01-01T00:00:00Z'));
        (0, globals_1.expect)(pastValid).toBeNull();
    });
    (0, globals_1.it)('should support system correction (transaction time travel)', async () => {
        const validFrom = new Date('2026-01-01T00:00:00Z');
        await bitemporalService.recordFact({
            id: entityId,
            tenantId,
            kind: 'Person',
            props: { name: 'John Doe', status: 'Active' },
            validFrom,
            createdBy: 'seed-user',
        });
        const transactionBeforeCorrection = new Date();
        await new Promise((resolve) => setTimeout(resolve, 5));
        await bitemporalService.recordFact({
            id: entityId,
            tenantId,
            kind: 'Person',
            props: { name: 'Jane Doe', status: 'Active' },
            validFrom,
            createdBy: 'corrector',
        });
        const current = await bitemporalService.queryAsOf(entityId, tenantId);
        (0, globals_1.expect)(current?.props.name).toBe('Jane Doe');
        const whatWeKnewThen = await bitemporalService.queryAsOf(entityId, tenantId, new Date(), transactionBeforeCorrection);
        (0, globals_1.expect)(whatWeKnewThen?.props.name).toBe('John Doe');
    });
});
