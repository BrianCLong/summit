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
const getResidencyConfigMock = globals_1.jest.fn();
const resolveTargetRegionMock = globals_1.jest.fn();
const getCurrentRegionMock = globals_1.jest.fn().mockReturnValue('us-east-1');
globals_1.jest.unstable_mockModule('../../../data-residency/residency-guard.js', () => ({
    ResidencyGuard: {
        getInstance: () => ({
            getResidencyConfig: getResidencyConfigMock,
        }),
    },
}));
globals_1.jest.unstable_mockModule('../../../services/RegionalFailoverService.js', () => ({
    RegionalFailoverService: {
        getInstance: () => ({
            resolveTargetRegion: resolveTargetRegionMock,
        }),
    },
}));
globals_1.jest.unstable_mockModule('../../../config/regional-config.js', () => ({
    getCurrentRegion: getCurrentRegionMock,
    REGIONAL_CONFIG: {
        'us-east-1': { region: 'us-east-1', baseUrl: 'https://us-east.summit.io' },
        'eu-central-1': { region: 'eu-central-1', baseUrl: 'https://eu-central.summit.io' },
    },
}));
// Set default resolveTargetRegion to avoid undefined during module initialization if it were used there
resolveTargetRegionMock.mockReturnValue('us-east-1');
const { GlobalTrafficSteering } = await Promise.resolve().then(() => __importStar(require('../GlobalTrafficSteering.js')));
describe('GlobalTrafficSteering', () => {
    let steering;
    beforeEach(() => {
        globals_1.jest.clearAllMocks();
        // Reset singleton if possible, or just use the existing one
        steering = GlobalTrafficSteering.getInstance();
    });
    it('should ALLOW traffic if current region matches primary region', async () => {
        getResidencyConfigMock.mockResolvedValue({
            primaryRegion: 'us-east-1',
            allowedRegions: ['us-east-1'],
            residencyMode: 'strict'
        });
        resolveTargetRegionMock.mockReturnValue('us-east-1');
        getCurrentRegionMock.mockReturnValue('us-east-1');
        const result = await steering.resolveSteeringAction('tenant-1');
        expect(result.action).toBe('ALLOW');
    });
    it('should REDIRECT traffic if current region is not allowed for strict tenant', async () => {
        getResidencyConfigMock.mockResolvedValue({
            primaryRegion: 'eu-central-1',
            allowedRegions: ['eu-central-1'],
            residencyMode: 'strict'
        });
        resolveTargetRegionMock.mockReturnValue('eu-central-1');
        getCurrentRegionMock.mockReturnValue('us-east-1');
        const result = await steering.resolveSteeringAction('tenant-1');
        expect(result.action).toBe('REDIRECT');
        expect(result.targetUrl).toBe('https://eu-central.summit.io');
    });
});
