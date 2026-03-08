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
const queryMock = globals_1.jest.fn();
globals_1.jest.unstable_mockModule('../../config/database.js', () => ({
    getPostgresPool: () => ({
        query: queryMock,
    }),
}));
describe('RegionalKMSManager', () => {
    let RegionalKMSManager;
    let kmsManager;
    (0, globals_1.beforeAll)(async () => {
        ({ RegionalKMSManager } = await Promise.resolve().then(() => __importStar(require('../RegionalKMSManager.js'))));
    });
    beforeEach(() => {
        globals_1.jest.clearAllMocks();
        RegionalKMSManager.instance = undefined;
        kmsManager = RegionalKMSManager.getInstance();
    });
    it('should return KMS config if found for tenant and region', async () => {
        queryMock.mockResolvedValue({
            rows: [{
                    id: 'kms-1',
                    tenant_id: 'tenant-1',
                    region: 'us-east-1',
                    provider: 'aws',
                    key_id: 'arn:aws:kms:us-east-1:123:key/abc',
                    status: 'active'
                }]
        });
        const config = await kmsManager.getKMSConfig('tenant-1', 'us-east-1');
        expect(config).toBeDefined();
        expect(config?.kmsKeyId).toBe('arn:aws:kms:us-east-1:123:key/abc');
        expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM kms_configs'), ['tenant-1', 'us-east-1']);
    });
    it('should return null if no active config is found', async () => {
        queryMock.mockResolvedValue({ rows: [] });
        const config = await kmsManager.getKMSConfig('tenant-1', 'eu-central-1');
        expect(config).toBeNull();
    });
});
