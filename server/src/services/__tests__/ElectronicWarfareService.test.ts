import {
  ElectronicWarfareService,
  EWAsset,
  EWEffectType,
  SpectrumSignal,
} from '../ElectronicWarfareService';

// Mock logger to avoid console output during tests
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe('ElectronicWarfareService', () => {
  let ewService: ElectronicWarfareService;
  let asset: EWAsset;

  beforeEach(() => {
    // Re-instantiate for each test to clear state
    ewService = new ElectronicWarfareService();
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
    const emitSpy = jest.spyOn(ewService, 'emit');
    ewService.registerAsset(asset);
    expect(emitSpy).toHaveBeenCalledWith('assetRegistered', asset);
  });

  test('should detect and analyze a signal', () => {
    // Need at least one passive sensor to analyze
    ewService.registerAsset({ ...asset, status: 'PASSIVE' });

    const signal: SpectrumSignal = {
      id: 'sig-1',
      frequency: 150,
      bandwidth: 0.025,
      power: -80,
      modulation: 'FM',
      type: 'COMMUNICATION',
      timestamp: new Date(),
    };

    const emitSpy = jest.spyOn(ewService, 'emit');
    ewService.detectSignal(signal);

    expect(emitSpy).toHaveBeenCalledWith('signalDetected', signal);
    // Should verify analyzeSignal was called automatically
    expect(emitSpy).toHaveBeenCalledWith('signalAnalyzed', expect.objectContaining({
      signalId: signal.id
    }));
  });

  test('should deploy a jammer successfully', (done) => {
    ewService.registerAsset(asset);

    const emitSpy = jest.spyOn(ewService, 'emit');
    const mission = ewService.deployJammer(asset.id, 150, 0.025, 'NOISE_JAMMING', 1); // 1 second duration

    expect(mission).toBeDefined();
    expect(mission.status).toBe('ACTIVE');
    expect(emitSpy).toHaveBeenCalledWith('jammingStarted', mission);

    // Wait for auto-stop
    setTimeout(() => {
      try {
        expect(emitSpy).toHaveBeenCalledWith('jammingStopped', expect.objectContaining({
            id: mission.id,
            status: 'COMPLETED'
        }));
        done();
      } catch (error) {
        done(error);
      }
    }, 1100);
  });

  test('should fail to deploy jammer if asset incapable', () => {
    ewService.registerAsset(asset);
    expect(() => {
      ewService.deployJammer(asset.id, 150, 0.025, 'DRFM_REPEATER', 10);
    }).toThrow(/does not support/);
  });

  test('should triangulate signal with sufficient sensors', () => {
    const asset2: EWAsset = { ...asset, id: 'sensor-2', type: 'MANPACK' };
    ewService.registerAsset(asset);
    ewService.registerAsset(asset2);

    const signal: SpectrumSignal = {
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
    expect(result).toBeDefined();
    expect(result?.triangulationPoints).toBe(2);
  });

  test('should not triangulate with insufficient sensors', () => {
    ewService.registerAsset(asset); // Only 1 sensor

    const signal: SpectrumSignal = {
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
    expect(result).toBeNull();
  });

  test('should analyze EMP blast radius', () => {
    const assetInZone: EWAsset = { ...asset, location: { lat: 0.01, lon: 0.01 } }; // Close
    const assetFar: EWAsset = { ...asset, id: 'far', location: { lat: 10, lon: 10 } }; // Far

    ewService.registerAsset(assetInZone);
    ewService.registerAsset(assetFar);

    const report = ewService.analyzeEMPBlast({ lat: 0, lon: 0 }, 10); // 10kt
    expect(report.assetsAtRisk).toContain(assetInZone.id);
    expect(report.assetsAtRisk).not.toContain(assetFar.id);
  });
});
