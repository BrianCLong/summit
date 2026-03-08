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
const axiosGetMock = globals_1.jest.fn();
globals_1.jest.unstable_mockModule('axios', () => ({
    default: {
        get: axiosGetMock,
    },
}));
const setRegionStatusMock = globals_1.jest.fn();
const getStatusMock = globals_1.jest.fn();
globals_1.jest.unstable_mockModule('../../../services/RegionalAvailabilityService.js', () => ({
    RegionalAvailabilityService: {
        getInstance: () => ({
            setRegionStatus: setRegionStatusMock,
            getStatus: getStatusMock,
        }),
    },
}));
globals_1.jest.unstable_mockModule('../../../config/regional-config.js', () => ({
    getCurrentRegion: () => 'us-east-1',
    REGIONAL_CONFIG: {
        'us-east-1': { region: 'us-east-1', baseUrl: 'https://us-east.summit.io' },
        'us-west-2': { region: 'us-west-2', baseUrl: 'https://us-west.summit.io' },
    },
}));
const { FailoverOrchestrator } = await Promise.resolve().then(() => __importStar(require('../FailoverOrchestrator.js')));
describe('FailoverOrchestrator', () => {
    let orchestrator;
    beforeEach(() => {
        globals_1.jest.clearAllMocks();
        globals_1.jest.useFakeTimers();
        orchestrator = FailoverOrchestrator.getInstance();
        getStatusMock.mockReturnValue({
            failoverMode: 'AUTOMATIC',
            regions: {
                'us-east-1': { status: 'HEALTHY' },
                'us-west-2': { status: 'HEALTHY' },
            }
        });
    });
    afterEach(() => {
        orchestrator.stop();
        globals_1.jest.useRealTimers();
    });
    it('should mark region as DOWN after failure threshold', async () => {
        axiosGetMock.mockRejectedValue(new Error('Timeout'));
        orchestrator.start();
        // Trigger 3 checks
        for (let i = 0; i < 3; i++) {
            globals_1.jest.advanceTimersByTime(30000);
            await Promise.resolve(); // allow promises to settle
        }
        expect(setRegionStatusMock).toHaveBeenCalledWith('us-west-2', 'DOWN');
    });
    it('should recover region if health check succeeds', async () => {
        axiosGetMock.mockResolvedValue({ status: 200 });
        // Simulate current state is failure (manually trigger one failure first)
        // We need to access private state or just run it multiple times.
        // Let's assume it was down and now recovers.
        // To test recovery, we first need to get it to a failed state.
        axiosGetMock.mockRejectedValueOnce(new Error('Fail'));
        orchestrator.start();
        globals_1.jest.advanceTimersByTime(30000);
        await Promise.resolve();
        axiosGetMock.mockResolvedValue({ status: 200 });
        globals_1.jest.advanceTimersByTime(30000);
        await Promise.resolve();
        expect(setRegionStatusMock).toHaveBeenCalledWith('us-west-2', 'HEALTHY');
    });
});
