import {
  MissileTracker,
  MissileTestMonitor,
  MissileCapabilityAssessor,
  MissileType,
  MissileClassification,
  PropulsionType,
  WarheadType,
  OperationalStatus,
  TestType,
  ConfidenceLevel
} from '../src';

describe('MissileTracker', () => {
  let tracker: MissileTracker;

  beforeEach(() => {
    tracker = new MissileTracker();
  });

  test('should register and retrieve missiles', () => {
    tracker.registerMissile({
      id: 'missile-001',
      name: 'Test ICBM',
      country: 'TestCountry',
      missile_type: MissileType.BALLISTIC_ICBM,
      classification: MissileClassification.STRATEGIC,
      range_km: 10000,
      payload_kg: 1000,
      propulsion: PropulsionType.SOLID_FUEL,
      guidance_system: ['inertial', 'stellar'],
      accuracy_cep_m: 150,
      stages: 3,
      mobile: true,
      silo_based: false,
      submarine_launched: false,
      mirv_capable: true,
      warhead_types: [WarheadType.NUCLEAR],
      operational_status: OperationalStatus.OPERATIONAL,
      estimated_inventory: 50,
      test_success_rate: 90
    });

    const missiles = tracker.getMissilesByCountry('TestCountry');
    expect(missiles).toHaveLength(1);
    expect(missiles[0].name).toBe('Test ICBM');
  });

  test('should get strategic missiles', () => {
    tracker.registerMissile({
      id: 'icbm-001',
      name: 'Strategic ICBM',
      country: 'TestCountry',
      missile_type: MissileType.BALLISTIC_ICBM,
      classification: MissileClassification.STRATEGIC,
      range_km: 12000,
      payload_kg: 1200,
      propulsion: PropulsionType.SOLID_FUEL,
      guidance_system: ['inertial'],
      stages: 3,
      mobile: false,
      silo_based: true,
      submarine_launched: false,
      mirv_capable: true,
      warhead_types: [WarheadType.NUCLEAR],
      operational_status: OperationalStatus.OPERATIONAL,
      estimated_inventory: 100
    });

    tracker.registerMissile({
      id: 'srbm-001',
      name: 'Tactical SRBM',
      country: 'TestCountry',
      missile_type: MissileType.BALLISTIC_SRBM,
      classification: MissileClassification.TACTICAL,
      range_km: 300,
      payload_kg: 500,
      propulsion: PropulsionType.SOLID_FUEL,
      guidance_system: ['inertial'],
      stages: 1,
      mobile: true,
      silo_based: false,
      submarine_launched: false,
      mirv_capable: false,
      warhead_types: [WarheadType.CONVENTIONAL],
      operational_status: OperationalStatus.OPERATIONAL,
      estimated_inventory: 200
    });

    const strategic = tracker.getStrategicMissiles('TestCountry');
    expect(strategic).toHaveLength(1);
    expect(strategic[0].name).toBe('Strategic ICBM');
  });

  test('should assess hypersonic capability', () => {
    tracker.registerMissile({
      id: 'hyper-001',
      name: 'Hypersonic Glide Vehicle',
      country: 'TestCountry',
      missile_type: MissileType.HYPERSONIC_GLIDE,
      classification: MissileClassification.STRATEGIC,
      range_km: 5000,
      payload_kg: 500,
      propulsion: PropulsionType.SCRAMJET,
      guidance_system: ['inertial', 'terminal'],
      stages: 2,
      mobile: true,
      silo_based: false,
      submarine_launched: false,
      mirv_capable: false,
      warhead_types: [WarheadType.NUCLEAR, WarheadType.CONVENTIONAL],
      operational_status: OperationalStatus.OPERATIONAL,
      estimated_inventory: 10
    });

    const capability = tracker.assessHypersonicCapability('TestCountry');
    expect(capability.has_capability).toBe(true);
    expect(capability.systems).toContain('Hypersonic Glide Vehicle');
  });

  test('should assess MIRV threat', () => {
    tracker.registerMissile({
      id: 'mirv-001',
      name: 'MIRV ICBM',
      country: 'TestCountry',
      missile_type: MissileType.BALLISTIC_ICBM,
      classification: MissileClassification.STRATEGIC,
      range_km: 10000,
      payload_kg: 2000,
      propulsion: PropulsionType.SOLID_FUEL,
      guidance_system: ['inertial'],
      stages: 3,
      mobile: false,
      silo_based: true,
      submarine_launched: false,
      mirv_capable: true,
      warhead_types: [WarheadType.NUCLEAR],
      operational_status: OperationalStatus.OPERATIONAL,
      estimated_inventory: 50
    });

    tracker.registerReentryVehicle({
      missile_system_id: 'mirv-001',
      rv_type: 'mirv',
      number_of_rvs: 10,
      penetration_aids: ['decoys', 'chaff'],
      maneuvering_capability: true,
      heat_shielding: 'advanced',
      terminal_guidance: true
    });

    const mirvThreat = tracker.assessMIRVThreat('mirv-001');
    expect(mirvThreat.is_mirv).toBe(true);
    expect(mirvThreat.warhead_count).toBe(10);
    expect(mirvThreat.targets_per_launch).toBe(10);
  });
});

describe('MissileTestMonitor', () => {
  let monitor: MissileTestMonitor;

  beforeEach(() => {
    monitor = new MissileTestMonitor();
  });

  test('should record and analyze tests', () => {
    monitor.recordTest({
      id: 'test-001',
      missile_system_id: 'missile-001',
      country: 'TestCountry',
      test_date: '2023-06-15',
      launch_site: { latitude: 35.0, longitude: 51.0 },
      test_type: TestType.FULL_RANGE,
      success: true,
      range_achieved_km: 5000,
      observations: ['Successful trajectory'],
      confidence: ConfidenceLevel.CONFIRMED
    });

    monitor.recordTest({
      id: 'test-002',
      missile_system_id: 'missile-001',
      country: 'TestCountry',
      test_date: '2023-07-20',
      launch_site: { latitude: 35.0, longitude: 51.0 },
      test_type: TestType.FULL_RANGE,
      success: true,
      range_achieved_km: 5200,
      observations: ['Improved range'],
      confidence: ConfidenceLevel.CONFIRMED
    });

    const successRate = monitor.calculateSuccessRate('missile-001');
    expect(successRate).toBe(100);
  });

  test('should detect new capabilities', () => {
    monitor.recordTest({
      id: 'test-003',
      missile_system_id: 'missile-002',
      country: 'TestCountry',
      test_date: '2023-08-01',
      launch_site: { latitude: 35.0, longitude: 51.0 },
      test_type: TestType.FULL_RANGE,
      success: true,
      observations: ['First test with MIRV'],
      new_capabilities: ['MIRV deployment', 'Extended range'],
      confidence: ConfidenceLevel.CONFIRMED
    });

    const capabilities = monitor.detectNewCapabilities('missile-002');
    expect(capabilities).toContain('MIRV deployment');
    expect(capabilities).toContain('Extended range');
  });

  test('should track test trends', () => {
    const now = new Date();
    const lastYear = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

    monitor.recordTest({
      id: 'test-recent',
      missile_system_id: 'missile-001',
      country: 'TestCountry',
      test_date: now.toISOString(),
      launch_site: { latitude: 35.0, longitude: 51.0 },
      test_type: TestType.FULL_RANGE,
      success: true,
      observations: [],
      confidence: ConfidenceLevel.CONFIRMED
    });

    const trend = monitor.getTestTrend('TestCountry');
    expect(trend.total_tests).toBe(1);
    expect(trend.tests_last_year).toBe(1);
  });
});

describe('MissileCapabilityAssessor', () => {
  let assessor: MissileCapabilityAssessor;

  beforeEach(() => {
    assessor = new MissileCapabilityAssessor();
  });

  test('should assess country capability', () => {
    const missiles = [
      {
        id: 'icbm-001',
        name: 'ICBM',
        country: 'TestCountry',
        missile_type: MissileType.BALLISTIC_ICBM,
        classification: MissileClassification.STRATEGIC,
        range_km: 10000,
        payload_kg: 1000,
        propulsion: PropulsionType.SOLID_FUEL,
        guidance_system: ['inertial'],
        stages: 3,
        mobile: false,
        silo_based: true,
        submarine_launched: false,
        mirv_capable: true,
        warhead_types: [WarheadType.NUCLEAR],
        operational_status: OperationalStatus.OPERATIONAL,
        estimated_inventory: 100
      },
      {
        id: 'slbm-001',
        name: 'SLBM',
        country: 'TestCountry',
        missile_type: MissileType.BALLISTIC_ICBM,
        classification: MissileClassification.STRATEGIC,
        range_km: 8000,
        payload_kg: 800,
        propulsion: PropulsionType.SOLID_FUEL,
        guidance_system: ['inertial'],
        stages: 2,
        mobile: false,
        silo_based: false,
        submarine_launched: true,
        mirv_capable: true,
        warhead_types: [WarheadType.NUCLEAR],
        operational_status: OperationalStatus.OPERATIONAL,
        estimated_inventory: 50
      }
    ];

    const capability = assessor.assessCountryCapability('TestCountry', missiles);
    expect(capability.strategic_capability).toBe(true);
    expect(capability.icbm_count).toBe(100);
    expect(capability.slbm_count).toBe(50);
    expect(capability.mirv_capability).toBe(true);
    expect(capability.second_strike_capability).toBe(true);
  });
});
