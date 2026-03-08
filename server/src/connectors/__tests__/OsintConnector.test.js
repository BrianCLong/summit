"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const OsintConnector_js_1 = require("../implementations/OsintConnector.js");
const types_js_1 = require("../types.js");
const pino_1 = __importDefault(require("pino"));
(0, globals_1.describe)('OsintConnector', () => {
    const logger = pino_1.default({ level: 'silent' });
    (0, globals_1.it)('should initialize with correct config', () => {
        const config = {
            id: 'test-source',
            name: 'test-social',
            type: 'osint',
            tenantId: 'tenant-1',
            sourceType: types_js_1.OsintSourceType.SOCIAL,
            config: {}
        };
        const connector = new OsintConnector_js_1.OsintConnector(config, logger);
        (0, globals_1.expect)(connector).toBeDefined();
    });
    (0, globals_1.it)('should fetch a batch of mock records', async () => {
        const config = {
            id: 'test-source',
            name: 'test-social',
            type: 'osint',
            tenantId: 'tenant-1',
            sourceType: types_js_1.OsintSourceType.SOCIAL,
            config: {}
        };
        const connector = new OsintConnector_js_1.OsintConnector(config, logger);
        const records = await connector.fetchBatch(10);
        (0, globals_1.expect)(records).toHaveLength(10);
        (0, globals_1.expect)(records[0].sourceType).toBe(types_js_1.OsintSourceType.SOCIAL);
        (0, globals_1.expect)(records[0].content).toBeDefined();
    });
    (0, globals_1.it)('should stream records', async () => {
        const config = {
            id: 'test-source',
            name: 'test-web',
            type: 'osint',
            tenantId: 'tenant-1',
            sourceType: types_js_1.OsintSourceType.WEB,
            config: {}
        };
        const connector = new OsintConnector_js_1.OsintConnector(config, logger);
        const stream = await connector.fetchStream();
        let count = 0;
        // Consume a few records to verify stream works
        for await (const record of stream) {
            (0, globals_1.expect)(record.sourceType).toBe(types_js_1.OsintSourceType.WEB);
            count++;
            if (count >= 5)
                break;
        }
        (0, globals_1.expect)(count).toBe(5);
    });
});
