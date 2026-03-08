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
// Mock config before any imports to prevent process.exit
const globals_1 = require("@jest/globals");
globals_1.jest.mock('../../src/config.js', () => ({
    cfg: {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgres://test:test@localhost:5432/test',
        NEO4J_URI: 'bolt://localhost:7687',
        NEO4J_USER: 'neo4j',
        NEO4J_PASSWORD: 'test',
        REDIS_URL: 'redis://localhost:6379',
        JWT_SECRET: 'test-secret',
        JWT_ISSUER: 'test',
    },
}));
const csv_s3_1 = require("../../src/connectors/implementations/csv-s3");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
(0, globals_1.describe)('CSVConnector', () => {
    const testFile = path.join(__dirname, 'test.csv');
    (0, globals_1.beforeAll)(() => {
        fs.writeFileSync(testFile, 'id,name\n1,Test\n2,User');
    });
    (0, globals_1.afterAll)(() => {
        if (fs.existsSync(testFile))
            fs.unlinkSync(testFile);
    });
    const config = {
        id: 'csv-1',
        name: 'CSV Test',
        type: 'csv',
        tenantId: 'tenant-1',
        config: { path: testFile }
    };
    test('should read CSV file', async () => {
        const connector = new csv_s3_1.CSVConnector(config);
        const stream = await connector.readStream();
        const data = [];
        for await (const chunk of stream) {
            data.push(chunk);
        }
        (0, globals_1.expect)(data.length).toBe(2);
        (0, globals_1.expect)(data[0].data.name).toBe('Test');
    });
    test('should fetch schema', async () => {
        const connector = new csv_s3_1.CSVConnector(config);
        const schema = await connector.fetchSchema();
        (0, globals_1.expect)(schema.fields).toHaveLength(2);
        (0, globals_1.expect)(schema.fields[0].name).toBe('id');
    });
});
