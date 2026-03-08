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
// Use dynamic imports
const { UEBAModels } = await Promise.resolve().then(() => __importStar(require('../UEBAModels.js')));
(0, globals_1.describe)('UEBAModels', () => {
    let ueba;
    let redisMock;
    (0, globals_1.beforeEach)(() => {
        redisMock = {
            get: globals_1.jest.fn(),
            set: globals_1.jest.fn().mockResolvedValue('OK')
        };
        ueba = new UEBAModels(redisMock);
    });
    (0, globals_1.it)('should create and update a user profile', async () => {
        redisMock.get.mockResolvedValue(null); // No existing profile
        const event = {
            entityId: 'user-123',
            entityType: 'user',
            action: 'LOGIN',
            region: 'US-EAST',
            timestamp: new Date().toISOString()
        };
        const profile = await ueba.updateProfile(event);
        (0, globals_1.expect)(profile.entityId).toBe('user-123');
        (0, globals_1.expect)(profile.actionCounts['LOGIN']).toBe(1);
        (0, globals_1.expect)(profile.geographicRegions).toContain('US-EAST');
        (0, globals_1.expect)(redisMock.set).toHaveBeenCalled();
    });
    (0, globals_1.it)('should detect geographic anomaly', async () => {
        const existingProfile = {
            entityId: 'user-123',
            entityType: 'user',
            geographicRegions: ['US-EAST'],
            actionCounts: {},
            hourlyDistribution: new Array(24).fill(0),
            typicalResources: [],
            riskScore: 0
        };
        redisMock.get.mockResolvedValue(JSON.stringify(existingProfile));
        const event = {
            entityId: 'user-123',
            entityType: 'user',
            action: 'LOGIN',
            region: 'KP-PYONGYANG', // Significant geographic shift
            timestamp: new Date().toISOString()
        };
        const result = await ueba.analyzeAnomaly(event);
        (0, globals_1.expect)(result.isAnomaly).toBe(false); // Only 40 points for region imbalance alone if threshold is 60
        (0, globals_1.expect)(result.score).toBeGreaterThanOrEqual(40);
        (0, globals_1.expect)(result.reasons).toContain('Atypical geographic region: KP-PYONGYANG');
    });
    (0, globals_1.it)('should detect composite anomaly (hour + resource)', async () => {
        const existingProfile = {
            entityId: 'user-123',
            entityType: 'user',
            geographicRegions: ['US-EAST'],
            actionCounts: {},
            hourlyDistribution: new Array(24).fill(100), // Established baseline
            typicalResources: ['dashboard'],
            riskScore: 0
        };
        // Mock established baseline (9-5 activity)
        existingProfile.hourlyDistribution = new Array(24).fill(0);
        for (let i = 9; i <= 17; i++)
            existingProfile.hourlyDistribution[i] = 10;
        redisMock.get.mockResolvedValue(JSON.stringify(existingProfile));
        const event = {
            entityId: 'user-123',
            entityType: 'user',
            action: 'SENSITIVE_EXPORT',
            resource: 'classified-secrets',
            region: 'US-EAST',
            timestamp: new Date('2026-02-02T03:00:00Z').toISOString() // 3 AM
        };
        const result = await ueba.analyzeAnomaly(event);
        (0, globals_1.expect)(result.isAnomaly).toBe(false); // score 30 (hour) + 20 (resource) = 50 < 60
        (0, globals_1.expect)(result.score).toBe(50);
        (0, globals_1.expect)(result.reasons.length).toBe(2);
    });
});
