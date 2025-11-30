import {
  NuclearFacilityTracker,
  EnrichmentMonitor,
  ReprocessingSurveillance,
  ReactorMonitor,
  NuclearTestingDetection,
  FuelCycleTracker,
  NuclearInfrastructureMonitor,
  FacilityType,
  FacilityStatus,
  ConfidenceLevel,
  TestType,
  FuelCycleStage,
  TechnologyLevel
} from '../src';

describe('NuclearFacilityTracker', () => {
  let tracker: NuclearFacilityTracker;

  beforeEach(() => {
    tracker = new NuclearFacilityTracker();
  });

  test('should register and retrieve a facility', () => {
    const facility = {
      id: 'facility-001',
      name: 'Test Enrichment Plant',
      type: FacilityType.ENRICHMENT_PLANT,
      location: { latitude: 35.0, longitude: 51.0 },
      country: 'TestCountry',
      status: FacilityStatus.OPERATIONAL,
      iaea_safeguards: true,
      declared: true,
      confidence_level: ConfidenceLevel.CONFIRMED,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    tracker.registerFacility(facility);
    const retrieved = tracker.getFacility('facility-001');

    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe('Test Enrichment Plant');
    expect(retrieved?.type).toBe(FacilityType.ENRICHMENT_PLANT);
  });

  test('should get facilities by country', () => {
    tracker.registerFacility({
      id: 'f1',
      name: 'Facility 1',
      type: FacilityType.ENRICHMENT_PLANT,
      location: { latitude: 35.0, longitude: 51.0 },
      country: 'CountryA',
      status: FacilityStatus.OPERATIONAL,
      iaea_safeguards: true,
      declared: true,
      confidence_level: ConfidenceLevel.CONFIRMED,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    tracker.registerFacility({
      id: 'f2',
      name: 'Facility 2',
      type: FacilityType.POWER_REACTOR,
      location: { latitude: 36.0, longitude: 52.0 },
      country: 'CountryB',
      status: FacilityStatus.OPERATIONAL,
      iaea_safeguards: true,
      declared: true,
      confidence_level: ConfidenceLevel.CONFIRMED,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    const countryAFacilities = tracker.getFacilitiesByCountry('CountryA');
    expect(countryAFacilities).toHaveLength(1);
    expect(countryAFacilities[0].name).toBe('Facility 1');
  });

  test('should identify undeclared facilities', () => {
    tracker.registerFacility({
      id: 'undeclared-1',
      name: 'Secret Facility',
      type: FacilityType.ENRICHMENT_PLANT,
      location: { latitude: 35.0, longitude: 51.0 },
      country: 'TestCountry',
      status: FacilityStatus.OPERATIONAL,
      iaea_safeguards: false,
      declared: false,
      confidence_level: ConfidenceLevel.HIGH,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    const undeclared = tracker.getUndeclaredFacilities();
    expect(undeclared).toHaveLength(1);
    expect(undeclared[0].id).toBe('undeclared-1');
  });

  test('should get country statistics', () => {
    tracker.registerFacility({
      id: 'f1',
      name: 'Enrichment Plant',
      type: FacilityType.ENRICHMENT_PLANT,
      location: { latitude: 35.0, longitude: 51.0 },
      country: 'TestCountry',
      status: FacilityStatus.OPERATIONAL,
      iaea_safeguards: true,
      declared: true,
      confidence_level: ConfidenceLevel.CONFIRMED,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    tracker.registerFacility({
      id: 'f2',
      name: 'Reactor',
      type: FacilityType.POWER_REACTOR,
      location: { latitude: 36.0, longitude: 52.0 },
      country: 'TestCountry',
      status: FacilityStatus.UNDER_CONSTRUCTION,
      iaea_safeguards: true,
      declared: true,
      confidence_level: ConfidenceLevel.CONFIRMED,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    const stats = tracker.getCountryStatistics('TestCountry');
    expect(stats.total).toBe(2);
    expect(stats.safeguarded).toBe(2);
    expect(stats.declared).toBe(2);
  });
});

describe('EnrichmentMonitor', () => {
  let monitor: EnrichmentMonitor;

  beforeEach(() => {
    monitor = new EnrichmentMonitor();
  });

  test('should record enrichment activity', () => {
    const activity = {
      facility_id: 'enrichment-001',
      timestamp: new Date().toISOString(),
      enrichment_level: 5.0,
      production_rate: 1000,
      swu_capacity: 5000,
      centrifuge_count: 1000,
      indicators: [],
      confidence: ConfidenceLevel.HIGH,
      sources: ['satellite', 'iaea']
    };

    monitor.recordActivity(activity);
    const activities = monitor.getActivities('enrichment-001');

    expect(activities).toHaveLength(1);
    expect(activities[0].enrichment_level).toBe(5.0);
  });

  test('should assess proliferation risk for HEU production', () => {
    monitor.recordActivity({
      facility_id: 'heu-facility',
      timestamp: new Date().toISOString(),
      enrichment_level: 60.0,
      swu_capacity: 15000,
      centrifuge_count: 6000,
      indicators: [],
      confidence: ConfidenceLevel.HIGH,
      sources: []
    });

    const risk = monitor.assessProliferationRisk('heu-facility');
    expect(risk.risk_level).toBe('critical');
    expect(risk.factors).toContain('HEU production capability');
  });

  test('should calculate SWU capacity', () => {
    monitor.recordActivity({
      facility_id: 'swu-test',
      timestamp: new Date().toISOString(),
      enrichment_level: 5.0,
      swu_capacity: 10000,
      indicators: [],
      confidence: ConfidenceLevel.HIGH,
      sources: []
    });

    const swu = monitor.calculateTotalSWU('swu-test');
    expect(swu).toBe(10000);
  });
});

describe('NuclearTestingDetection', () => {
  let detector: NuclearTestingDetection;

  beforeEach(() => {
    detector = new NuclearTestingDetection();
  });

  test('should record and retrieve nuclear tests', () => {
    const test = {
      id: 'test-001',
      country: 'TestCountry',
      location: { latitude: 41.0, longitude: 129.0 },
      timestamp: '2023-01-15T00:00:00Z',
      test_type: TestType.UNDERGROUND,
      yield_estimate: 15,
      seismic_magnitude: 5.1,
      radionuclide_detection: true,
      detected_isotopes: ['Xe-133', 'Kr-85'],
      verification_methods: ['seismic', 'radionuclide'],
      confidence: ConfidenceLevel.CONFIRMED
    };

    detector.recordTest(test);
    const tests = detector.getTests('TestCountry');

    expect(tests).toHaveLength(1);
    expect(tests[0].yield_estimate).toBe(15);
  });

  test('should estimate yield from seismic magnitude', () => {
    const estimate = detector.estimateYieldFromSeismic(5.0);
    expect(estimate.yield_kt).toBeGreaterThan(1);
    expect(estimate.yield_kt).toBeLessThan(100);
    expect(estimate.range[0]).toBeLessThan(estimate.yield_kt);
    expect(estimate.range[1]).toBeGreaterThan(estimate.yield_kt);
  });

  test('should get testing trends', () => {
    detector.recordTest({
      id: 'test-1',
      country: 'TestCountry',
      location: { latitude: 41.0, longitude: 129.0 },
      timestamp: '2020-01-01T00:00:00Z',
      test_type: TestType.UNDERGROUND,
      yield_estimate: 10,
      radionuclide_detection: true,
      verification_methods: ['seismic'],
      confidence: ConfidenceLevel.CONFIRMED
    });

    detector.recordTest({
      id: 'test-2',
      country: 'TestCountry',
      location: { latitude: 41.0, longitude: 129.0 },
      timestamp: '2021-01-01T00:00:00Z',
      test_type: TestType.UNDERGROUND,
      yield_estimate: 20,
      radionuclide_detection: true,
      verification_methods: ['seismic'],
      confidence: ConfidenceLevel.CONFIRMED
    });

    const trends = detector.getTestingTrends('TestCountry');
    expect(trends.total_tests).toBe(2);
    expect(trends.total_yield_estimate).toBe(30);
  });
});

describe('NuclearInfrastructureMonitor', () => {
  let monitor: NuclearInfrastructureMonitor;

  beforeEach(() => {
    monitor = new NuclearInfrastructureMonitor();
  });

  test('should assess nuclear capability', () => {
    monitor.updateInfrastructure('AdvancedCountry', {
      country: 'AdvancedCountry',
      total_facilities: 20,
      facilities_by_type: {
        [FacilityType.ENRICHMENT_PLANT]: 2,
        [FacilityType.REPROCESSING_PLANT]: 1,
        [FacilityType.POWER_REACTOR]: 10
      },
      indigenous_capability: true,
      fuel_cycle_stage: [
        FuelCycleStage.MINING,
        FuelCycleStage.CONVERSION,
        FuelCycleStage.ENRICHMENT,
        FuelCycleStage.FUEL_FABRICATION,
        FuelCycleStage.REACTOR_OPERATION,
        FuelCycleStage.REPROCESSING,
        FuelCycleStage.WASTE_MANAGEMENT
      ],
      technology_level: TechnologyLevel.ADVANCED,
      international_cooperation: ['IAEA'],
      regulatory_framework: true,
      safeguards_coverage: 100
    });

    const capability = monitor.assessNuclearCapability('AdvancedCountry');
    expect(capability.has_complete_fuel_cycle).toBe(true);
    expect(capability.enrichment_capable).toBe(true);
    expect(capability.reprocessing_capable).toBe(true);
    expect(capability.weapons_potential).toBe('high');
  });
});
