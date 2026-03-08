"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const ElectronicWarfareService_js_1 = require("../ElectronicWarfareService.js");
// Mock logger to avoid console output during tests
globals_1.jest.mock('../../utils/logger', () => ({
    info: globals_1.jest.fn(),
    warn: globals_1.jest.fn(),
    error: globals_1.jest.fn(),
}));
(0, globals_1.describe)('ElectronicWarfareService', () => {
    let ewService;
    let asset;
    (0, globals_1.beforeEach)(() => {
        // Re-instantiate for each test to clear state
        ewService = new ElectronicWarfareService_js_1.ElectronicWarfareService();
        asset = {
            id: 'test-asset-1',
            name: 'Test Jammer',
            type: 'GROUND_STATION',
            location: { lat: 0, lon: 0 },
            capabilities: ['NOISE_JAMMING', 'COMM_DISRUPTION'],
            maxPower: 100,
            frequencyRange: [30, 3000],
            status: 'ACTIVE',
            activeProtection: [],
        };
    });
    test('should register an asset', () => {
        const emitSpy = globals_1.jest.spyOn(ewService, 'emit');
        ewService.registerAsset(asset);
        (0, globals_1.expect)(emitSpy).toHaveBeenCalledWith('assetRegistered', asset);
    });
    test('should detect and analyze a signal', () => {
        // Need at least one passive sensor to analyze
        ewService.registerAsset({ ...asset, status: 'PASSIVE' });
        const signal = {
            id: 'sig-1',
            frequency: 150,
            bandwidth: 0.025,
            power: -80,
            modulation: 'FM',
            type: 'COMMUNICATION',
            timestamp: new Date(),
        };
        const emitSpy = globals_1.jest.spyOn(ewService, 'emit');
        ewService.detectSignal(signal);
        (0, globals_1.expect)(emitSpy).toHaveBeenCalledWith('signalDetected', signal);
        // Should verify analyzeSignal was called automatically
        (0, globals_1.expect)(emitSpy).toHaveBeenCalledWith('signalAnalyzed', globals_1.expect.objectContaining({
            signalId: signal.id
        }));
    });
    test('should deploy a jammer successfully', (done) => {
        ewService.registerAsset(asset);
        const emitSpy = globals_1.jest.spyOn(ewService, 'emit');
        const mission = ewService.deployJammer(asset.id, 150, 0.025, 'NOISE_JAMMING', 1); // 1 second duration
        (0, globals_1.expect)(mission).toBeDefined();
        (0, globals_1.expect)(mission.status).toBe('ACTIVE');
        (0, globals_1.expect)(emitSpy).toHaveBeenCalledWith('jammingStarted', mission);
        // Wait for auto-stop
        setTimeout(() => {
            try {
                (0, globals_1.expect)(emitSpy).toHaveBeenCalledWith('jammingStopped', globals_1.expect.objectContaining({
                    id: mission.id,
                    status: 'COMPLETED'
                }));
                done();
            }
            catch (error) {
                done(error);
            }
        }, 1100);
    });
    test('should fail to deploy jammer if asset incapable', () => {
        ewService.registerAsset(asset);
        (0, globals_1.expect)(() => {
            ewService.deployJammer(asset.id, 150, 0.025, 'DRFM_REPEATER', 10);
        }).toThrow(/does not support/);
    });
    test('should triangulate signal with sufficient sensors', () => {
        const asset2 = { ...asset, id: 'sensor-2', type: 'MANPACK' };
        ewService.registerAsset(asset);
        ewService.registerAsset(asset2);
        const signal = {
            id: 'target-sig',
            frequency: 150,
            bandwidth: 0.025,
            power: -80,
            modulation: 'FM',
            type: 'COMMUNICATION',
            location: { lat: 10, lon: 10 },
            timestamp: new Date(),
        };
        ewService.detectSignal(signal);
        const result = ewService.triangulateSignal('target-sig');
        (0, globals_1.expect)(result).toBeDefined();
        (0, globals_1.expect)(result?.triangulationPoints).toBe(2);
    });
    test('should not triangulate with insufficient sensors', () => {
        ewService.registerAsset(asset); // Only 1 sensor
        const signal = {
            id: 'target-sig',
            frequency: 150,
            bandwidth: 0.025,
            power: -80,
            modulation: 'FM',
            type: 'COMMUNICATION',
            location: { lat: 10, lon: 10 },
            timestamp: new Date(),
        };
        ewService.detectSignal(signal);
        const result = ewService.triangulateSignal('target-sig');
        (0, globals_1.expect)(result).toBeNull();
    });
    test('should analyze EMP blast radius', () => {
        const assetInZone = { ...asset, location: { lat: 0.01, lon: 0.01 } }; // Close
        const assetFar = { ...asset, id: 'far', location: { lat: 10, lon: 10 } }; // Far
        ewService.registerAsset(assetInZone);
        ewService.registerAsset(assetFar);
        const report = ewService.analyzeEMPBlast({ lat: 0, lon: 0 }, 10); // 10kt
        (0, globals_1.expect)(report.assetsAtRisk).toContain(assetInZone.id);
        (0, globals_1.expect)(report.assetsAtRisk).not.toContain(assetFar.id);
    });
});
