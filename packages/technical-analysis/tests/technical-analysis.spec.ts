import {
  SatelliteImageryAnalyzer,
  SeismicDetectionSystem,
  RadionuclideMonitor,
  OSINTAnalyzer,
  SatelliteImage,
  SeismicEvent,
  RadionuclideDetection
} from '../src';

describe('SatelliteImageryAnalyzer', () => {
  let analyzer: SatelliteImageryAnalyzer;

  beforeEach(() => {
    analyzer = new SatelliteImageryAnalyzer();
  });

  test('should analyze construction activity', () => {
    const images: SatelliteImage[] = [
      {
        id: 'img-001',
        facility_id: 'fac-001',
        location: { latitude: 35.0, longitude: 51.0 },
        capture_date: '2023-01-01',
        resolution_m: 0.5,
        sensor_type: 'optical',
        analysis_results: [
          {
            analysis_type: 'construction',
            findings: ['Ground clearing detected'],
            change_detected: true,
            confidence: 0.8
          }
        ]
      },
      {
        id: 'img-002',
        facility_id: 'fac-001',
        location: { latitude: 35.0, longitude: 51.0 },
        capture_date: '2023-06-01',
        resolution_m: 0.5,
        sensor_type: 'optical',
        analysis_results: [
          {
            analysis_type: 'construction',
            findings: ['Building foundations visible'],
            change_detected: true,
            confidence: 0.9
          }
        ]
      }
    ];

    const result = analyzer.analyzeConstruction(images);
    expect(result.construction_detected).toBe(true);
    expect(result.timeline).toHaveLength(2);
  });

  test('should detect facility expansion', () => {
    const before: SatelliteImage = {
      id: 'before',
      location: { latitude: 35.0, longitude: 51.0 },
      capture_date: '2022-01-01',
      resolution_m: 0.5,
      sensor_type: 'optical',
      analysis_results: [
        {
          analysis_type: 'structure_detection',
          findings: ['2 buildings'],
          change_detected: false,
          confidence: 0.9
        }
      ]
    };

    const after: SatelliteImage = {
      id: 'after',
      location: { latitude: 35.0, longitude: 51.0 },
      capture_date: '2023-01-01',
      resolution_m: 0.5,
      sensor_type: 'optical',
      analysis_results: [
        {
          analysis_type: 'structure_detection',
          findings: ['4 buildings detected'],
          change_detected: true,
          confidence: 0.9
        },
        {
          analysis_type: 'construction',
          findings: ['New building'],
          change_detected: true,
          confidence: 0.85
        }
      ]
    };

    const result = analyzer.detectFacilityExpansion(before, after);
    expect(result.expansion_detected).toBe(true);
    expect(result.new_structures).toBe(2);
  });
});

describe('SeismicDetectionSystem', () => {
  let system: SeismicDetectionSystem;

  beforeEach(() => {
    system = new SeismicDetectionSystem();
  });

  test('should identify potential nuclear tests', () => {
    system.recordEvent({
      id: 'event-001',
      location: { latitude: 41.3, longitude: 129.1 },
      timestamp: '2023-01-15T00:00:00Z',
      magnitude: 5.3,
      magnitude_type: 'mb',
      depth_km: 1,
      event_type: 'explosion',
      confidence: 0.95,
      stations_detected: 50
    });

    system.recordEvent({
      id: 'event-002',
      location: { latitude: 35.0, longitude: 139.0 },
      timestamp: '2023-02-01T00:00:00Z',
      magnitude: 6.0,
      magnitude_type: 'Mw',
      depth_km: 30,
      event_type: 'earthquake',
      confidence: 0.99,
      stations_detected: 100
    });

    const tests = system.identifyNuclearTests();
    expect(tests.length).toBeGreaterThanOrEqual(1);
  });

  test('should estimate yield from magnitude', () => {
    const estimate = system.estimateYield(5.0);
    expect(estimate.yield_kt).toBeGreaterThan(0);
    expect(estimate.uncertainty).toBeGreaterThan(0);
  });
});

describe('RadionuclideMonitor', () => {
  let monitor: RadionuclideMonitor;

  beforeEach(() => {
    monitor = new RadionuclideMonitor();
  });

  test('should analyze isotope ratios for source identification', () => {
    const detection: RadionuclideDetection = {
      id: 'det-001',
      station_id: 'station-001',
      location: { latitude: 50.0, longitude: 10.0 },
      detection_date: '2023-01-20',
      isotopes: [
        {
          isotope: 'Xe-133',
          half_life: '5.2 days',
          concentration: 0.5,
          unit: 'mBq/m3',
          significance: 'high'
        },
        {
          isotope: 'Kr-85',
          half_life: '10.7 years',
          concentration: 0.3,
          unit: 'mBq/m3',
          significance: 'high'
        }
      ],
      event_type: 'unknown'
    };

    const analysis = monitor.analyzeIsotopeRatio(detection);
    expect(analysis.likely_source).toBe('weapon_test');
    expect(analysis.confidence).toBeGreaterThan(0.5);
  });

  test('should filter detections by period', () => {
    monitor.recordDetection({
      id: 'det-001',
      station_id: 'station-001',
      location: { latitude: 50.0, longitude: 10.0 },
      detection_date: '2023-01-15',
      isotopes: [],
      event_type: 'unknown'
    });

    monitor.recordDetection({
      id: 'det-002',
      station_id: 'station-001',
      location: { latitude: 50.0, longitude: 10.0 },
      detection_date: '2023-06-15',
      isotopes: [],
      event_type: 'unknown'
    });

    const filtered = monitor.getDetectionsByPeriod('2023-01-01', '2023-03-01');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('det-001');
  });
});

describe('OSINTAnalyzer', () => {
  let analyzer: OSINTAnalyzer;

  beforeEach(() => {
    analyzer = new OSINTAnalyzer();
  });

  test('should analyze technical publications for proliferation concerns', () => {
    const highRisk = analyzer.analyzeTechnicalPublication({
      title: 'Advanced Centrifuge Design for Uranium Enrichment',
      authors: ['Scientist A'],
      institution: 'Atomic Energy Institute',
      country: 'TestCountry',
      keywords: ['centrifuge', 'enrichment', 'uranium hexafluoride', 'SWU']
    });

    expect(highRisk.proliferation_concern).toBe(true);
    expect(highRisk.risk_level).toBe('high');
    expect(highRisk.concern_areas.length).toBeGreaterThanOrEqual(2);

    const lowRisk = analyzer.analyzeTechnicalPublication({
      title: 'Solar Panel Efficiency Improvements',
      authors: ['Researcher B'],
      institution: 'Energy Research Lab',
      country: 'TestCountry',
      keywords: ['solar', 'photovoltaic', 'renewable energy']
    });

    expect(lowRisk.proliferation_concern).toBe(false);
    expect(lowRisk.risk_level).toBe('low');
  });

  test('should track procurement patterns', () => {
    const purchases = [
      { item: 'vacuum pumps high-capacity', quantity: 10, buyer: 'Company A', date: '2023-01-01' },
      { item: 'vacuum pumps high-capacity', quantity: 5, buyer: 'Company A', date: '2023-02-01' },
      { item: 'vacuum pumps high-capacity', quantity: 8, buyer: 'Company A', date: '2023-03-01' },
      { item: 'vacuum pumps high-capacity', quantity: 12, buyer: 'Company A', date: '2023-04-01' },
      { item: 'vacuum pumps high-capacity', quantity: 6, buyer: 'Company A', date: '2023-05-01' },
      { item: 'vacuum pumps high-capacity', quantity: 9, buyer: 'Company A', date: '2023-06-01' },
      { item: 'office supplies', quantity: 100, buyer: 'Company A', date: '2023-01-15' }
    ];

    const result = analyzer.trackProcurementPatterns(purchases);
    expect(result.suspicious).toBe(true);
    expect(result.patterns.length).toBeGreaterThan(0);
  });
});
