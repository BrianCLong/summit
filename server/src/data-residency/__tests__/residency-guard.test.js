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
/* eslint-disable no-undef */
const globals_1 = require("@jest/globals");
const queryMock = globals_1.jest.fn();
globals_1.jest.unstable_mockModule('../../db/postgres.js', () => ({
    getPostgresPool: () => ({
        query: queryMock,
    }),
}));
const { ResidencyGuard, ResidencyViolationError } = await Promise.resolve().then(() => __importStar(require('../residency-guard.js')));
describe('ResidencyGuard', () => {
    let guard;
    beforeEach(() => {
        globals_1.jest.clearAllMocks();
        guard = ResidencyGuard.getInstance();
    });
    it('should allow access when region is allowed', async () => {
        queryMock.mockResolvedValueOnce({
            rows: [
                {
                    region: 'us-east-1',
                    allowed_regions: '["us-west-2"]',
                },
            ],
        });
        await expect(guard.enforce('tenant-allowed', {
            operation: 'compute',
            targetRegion: 'us-west-2',
        })).resolves.not.toThrow();
    });
    it('should block access when region is prohibited', async () => {
        queryMock.mockResolvedValueOnce({
            rows: [
                {
                    region: 'us-east-1',
                    allowed_regions: '[]',
                },
            ],
        });
        queryMock.mockResolvedValueOnce({ rows: [] }); // checkExceptions
        await expect(guard.enforce('tenant-blocked', {
            operation: 'compute',
            targetRegion: 'eu-central-1',
        })).rejects.toThrow(ResidencyViolationError);
    });
});
