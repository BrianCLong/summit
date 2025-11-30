import {
  ChemicalWeaponsTracker,
  BiologicalWeaponsTracker,
  WeaponsDevelopmentTracker,
  StockpileEstimator,
  WMDThreatAssessor,
  ChemicalAgentType,
  StorageCondition,
  PathogenType,
  WeaponizationLevel,
  ThreatLevel,
  SecurityLevel,
  ProgramStatus,
  ConfidenceLevel
} from '../src';

describe('ChemicalWeaponsTracker', () => {
  let tracker: ChemicalWeaponsTracker;

  beforeEach(() => {
    tracker = new ChemicalWeaponsTracker();
  });

  test('should register and retrieve chemical weapons', () => {
    tracker.registerWeapon({
      id: 'cw-001',
      agent_type: ChemicalAgentType.NERVE_AGENT,
      agent_name: 'Sarin',
      country: 'TestCountry',
      quantity_estimate: 100,
      quantity_unit: 'metric_tons',
      storage_condition: StorageCondition.BULK_STORAGE,
      last_updated: new Date().toISOString(),
      confidence: ConfidenceLevel.HIGH
    });

    const stockpile = tracker.getStockpileByCountry('TestCountry');
    expect(stockpile).toHaveLength(1);
    expect(stockpile[0].agent_name).toBe('Sarin');
  });

  test('should estimate total stockpile', () => {
    tracker.registerWeapon({
      id: 'cw-001',
      agent_type: ChemicalAgentType.NERVE_AGENT,
      agent_name: 'Sarin',
      country: 'TestCountry',
      quantity_estimate: 100,
      quantity_unit: 'metric_tons',
      storage_condition: StorageCondition.BULK_STORAGE,
      last_updated: new Date().toISOString(),
      confidence: ConfidenceLevel.HIGH
    });

    tracker.registerWeapon({
      id: 'cw-002',
      agent_type: ChemicalAgentType.BLISTER_AGENT,
      agent_name: 'Mustard',
      country: 'TestCountry',
      quantity_estimate: 50,
      quantity_unit: 'metric_tons',
      storage_condition: StorageCondition.BULK_STORAGE,
      last_updated: new Date().toISOString(),
      confidence: ConfidenceLevel.HIGH
    });

    const total = tracker.estimateTotalStockpile('TestCountry');
    expect(total).toBe(150);
  });

  test('should assess CWC compliance', () => {
    tracker.registerFacility({
      id: 'cwf-001',
      name: 'Chemical Production Facility',
      location: { latitude: 35.0, longitude: 51.0 },
      country: 'TestCountry',
      facility_type: 'production',
      agents_produced: ['Sarin'],
      cwc_declared: false,
      dual_use: false,
      operational_status: 'operational'
    });

    const compliance = tracker.assessCWCCompliance('TestCountry');
    expect(compliance.compliant).toBe(false);
    expect(compliance.violations.length).toBeGreaterThan(0);
  });
});

describe('BiologicalWeaponsTracker', () => {
  let tracker: BiologicalWeaponsTracker;

  beforeEach(() => {
    tracker = new BiologicalWeaponsTracker();
  });

  test('should register and assess biological threats', () => {
    tracker.registerThreat({
      id: 'bio-001',
      pathogen_type: PathogenType.BACTERIA,
      pathogen_name: 'Anthrax',
      country: 'TestCountry',
      weaponization_level: WeaponizationLevel.RESEARCH,
      delivery_capability: false,
      vaccine_available: true,
      genetic_modification: false,
      bsl_level: 3,
      threat_level: ThreatLevel.MODERATE,
      last_assessed: new Date().toISOString()
    });

    const capability = tracker.assessBioWeaponCapability('TestCountry');
    expect(capability.capability_level).toBeDefined();
  });

  test('should identify high-risk pathogens', () => {
    tracker.registerThreat({
      id: 'bio-high',
      pathogen_type: PathogenType.VIRUS,
      pathogen_name: 'Weaponized Virus',
      country: 'TestCountry',
      weaponization_level: WeaponizationLevel.WEAPONIZED,
      delivery_capability: true,
      vaccine_available: false,
      genetic_modification: true,
      threat_level: ThreatLevel.CRITICAL,
      last_assessed: new Date().toISOString()
    });

    const highRisk = tracker.identifyHighRiskPathogens('TestCountry');
    expect(highRisk).toHaveLength(1);
    expect(highRisk[0].pathogen_name).toBe('Weaponized Virus');
  });

  test('should register and assess biosafety of facilities', () => {
    tracker.registerFacility({
      id: 'bsl4-001',
      name: 'High Containment Lab',
      location: { latitude: 35.0, longitude: 51.0 },
      country: 'TestCountry',
      biosafety_level: 4,
      research_focus: ['dangerous pathogens'],
      pathogen_inventory: ['Ebola', 'Marburg'],
      bwc_compliant: true,
      dual_use_concern: true,
      security_level: SecurityLevel.MAXIMUM,
      oversight: ['Ministry of Health']
    });

    const assessment = tracker.assessBiosafety('bsl4-001');
    expect(assessment.biosafety_adequate).toBe(true);
    expect(assessment.security_level).toBe(SecurityLevel.MAXIMUM);
  });
});

describe('WeaponsDevelopmentTracker', () => {
  let tracker: WeaponsDevelopmentTracker;

  beforeEach(() => {
    tracker = new WeaponsDevelopmentTracker();
  });

  test('should track program maturity', () => {
    tracker.registerProgram({
      id: 'prog-001',
      country: 'TestCountry',
      program_type: 'nuclear',
      status: ProgramStatus.ACTIVE,
      milestones: [
        { milestone: 'Enrichment', achieved: true, confidence: ConfidenceLevel.CONFIRMED, description: 'Achieved enrichment' },
        { milestone: 'Weaponization', achieved: false, confidence: ConfidenceLevel.MODERATE, description: 'In progress' }
      ],
      key_facilities: ['facility-1'],
      technical_capability: {
        design_capability: true,
        production_capability: true,
        testing_capability: false,
        deployment_capability: false,
        miniaturization: false,
        overall_assessment: 'intermediate'
      }
    });

    const maturity = tracker.assessProgramMaturity('prog-001');
    expect(maturity.achieved_milestones).toBe(1);
    expect(maturity.total_milestones).toBe(2);
    expect(maturity.maturity_level).toBe(50);
  });

  test('should identify key capabilities', () => {
    tracker.registerProgram({
      id: 'prog-002',
      country: 'TestCountry',
      program_type: 'nuclear',
      status: ProgramStatus.ACTIVE,
      milestones: [],
      key_facilities: [],
      technical_capability: {
        design_capability: true,
        production_capability: true,
        testing_capability: true,
        deployment_capability: false,
        miniaturization: false,
        overall_assessment: 'intermediate'
      }
    });

    const capabilities = tracker.identifyKeyCapabilities('prog-002');
    expect(capabilities).toContain('Design');
    expect(capabilities).toContain('Production');
    expect(capabilities).toContain('Testing');
    expect(capabilities).not.toContain('Deployment');
  });
});

describe('StockpileEstimator', () => {
  let estimator: StockpileEstimator;

  beforeEach(() => {
    estimator = new StockpileEstimator();
  });

  test('should track stockpile trends', () => {
    estimator.recordEstimate({
      country: 'TestCountry',
      weapon_type: 'nuclear',
      total_weapons: 100,
      delivery_systems: ['ICBM', 'SLBM'],
      operational_readiness: 80,
      modernization_status: 'active',
      estimate_date: '2020-01-01',
      confidence: ConfidenceLevel.HIGH,
      sources: ['intelligence']
    });

    estimator.recordEstimate({
      country: 'TestCountry',
      weapon_type: 'nuclear',
      total_weapons: 120,
      delivery_systems: ['ICBM', 'SLBM'],
      operational_readiness: 85,
      modernization_status: 'active',
      estimate_date: '2023-01-01',
      confidence: ConfidenceLevel.HIGH,
      sources: ['intelligence']
    });

    const trend = estimator.trackStockpileTrend('TestCountry', 'nuclear');
    expect(trend.trend).toBe('increasing');
    expect(trend.change_percentage).toBe(20);
  });

  test('should compare stockpiles', () => {
    estimator.recordEstimate({
      country: 'CountryA',
      weapon_type: 'nuclear',
      total_weapons: 500,
      delivery_systems: ['ICBM'],
      operational_readiness: 80,
      modernization_status: 'active',
      estimate_date: '2023-01-01',
      confidence: ConfidenceLevel.HIGH,
      sources: []
    });

    estimator.recordEstimate({
      country: 'CountryB',
      weapon_type: 'nuclear',
      total_weapons: 300,
      delivery_systems: ['ICBM'],
      operational_readiness: 80,
      modernization_status: 'active',
      estimate_date: '2023-01-01',
      confidence: ConfidenceLevel.HIGH,
      sources: []
    });

    const comparison = estimator.compareStockpiles('CountryA', 'CountryB', 'nuclear');
    expect(comparison.larger).toBe('CountryA');
    expect(comparison.country1_total).toBe(500);
    expect(comparison.country2_total).toBe(300);
  });
});

describe('WMDThreatAssessor', () => {
  let assessor: WMDThreatAssessor;

  beforeEach(() => {
    assessor = new WMDThreatAssessor();
  });

  test('should assess overall threat', () => {
    const assessment = assessor.assessOverallThreat('TestCountry', {
      stockpile: {
        country: 'TestCountry',
        weapon_type: 'nuclear',
        total_weapons: 200,
        delivery_systems: ['ICBM'],
        operational_readiness: 90,
        modernization_status: 'active',
        estimate_date: '2023-01-01',
        confidence: ConfidenceLevel.HIGH,
        sources: []
      }
    });

    expect(assessment.threat_level).toBeDefined();
    expect(assessment.threat_score).toBeGreaterThan(0);
    expect(assessment.factors.length).toBeGreaterThan(0);
  });

  test('should assess proliferation risk', () => {
    const risk = assessor.assessProliferationRisk('TestCountry', {
      undeclared_facilities: 2,
      international_sanctions: true,
      treaty_violations: 3,
      export_control_violations: 1
    });

    expect(risk.risk_level).toBe('high');
    expect(risk.risk_factors.length).toBeGreaterThan(0);
  });
});
