import {
  NPTMonitor,
  CTBTMonitor,
  IAEASafeguardsMonitor,
  CWCMonitor,
  Treaty,
  ComplianceStatus,
  TreatyCompliance
} from '../src';

describe('NPTMonitor', () => {
  let monitor: NPTMonitor;

  beforeEach(() => {
    monitor = new NPTMonitor();
  });

  test('should track compliant and non-compliant countries', () => {
    monitor.updateCompliance({
      country: 'CompliantCountry',
      treaty: Treaty.NPT,
      status: ComplianceStatus.COMPLIANT,
      ratification_date: '1970-03-05',
      violations: [],
      confidence_level: 'high'
    });

    monitor.updateCompliance({
      country: 'NonCompliantCountry',
      treaty: Treaty.NPT,
      status: ComplianceStatus.NON_COMPLIANT,
      violations: [
        {
          id: 'viol-001',
          treaty: Treaty.NPT,
          country: 'NonCompliantCountry',
          violation_type: 'Undeclared enrichment',
          date_identified: '2020-01-01',
          description: 'Covert enrichment facility discovered',
          severity: 'critical',
          resolved: false,
          iaea_reported: true
        }
      ],
      confidence_level: 'high'
    });

    const nonCompliant = monitor.getNonCompliantCountries();
    expect(nonCompliant).toHaveLength(1);
    expect(nonCompliant[0].country).toBe('NonCompliantCountry');
  });

  test('should track treaty withdrawals', () => {
    monitor.updateCompliance({
      country: 'WithdrawnCountry',
      treaty: Treaty.NPT,
      status: ComplianceStatus.WITHDRAWN,
      violations: [],
      confidence_level: 'high'
    });

    const withdrawals = monitor.getWithdrawals();
    expect(withdrawals).toHaveLength(1);
    expect(withdrawals[0].country).toBe('WithdrawnCountry');
  });
});

describe('CTBTMonitor', () => {
  let monitor: CTBTMonitor;

  beforeEach(() => {
    monitor = new CTBTMonitor();
  });

  test('should record and identify potential violations', () => {
    monitor.recordSeismicEvent({
      id: 'event-001',
      location: { lat: 41.3, lon: 129.1 },
      magnitude: 5.1,
      date: '2023-01-15',
      potential_test: true
    });

    monitor.recordSeismicEvent({
      id: 'event-002',
      location: { lat: 35.0, lon: 139.0 },
      magnitude: 4.5,
      date: '2023-02-01',
      potential_test: false
    });

    const violations = monitor.getPotentialViolations();
    expect(violations).toHaveLength(1);
    expect(violations[0].id).toBe('event-001');
  });
});

describe('IAEASafeguardsMonitor', () => {
  let monitor: IAEASafeguardsMonitor;

  beforeEach(() => {
    monitor = new IAEASafeguardsMonitor();
  });

  test('should track broader conclusion status', () => {
    monitor.updateSafeguards({
      country: 'TransparentCountry',
      safeguards_agreement: true,
      additional_protocol: true,
      declared_facilities: 15,
      inspections_per_year: 12,
      last_inspection: '2023-06-01',
      findings: [],
      broader_conclusion: true
    });

    monitor.updateSafeguards({
      country: 'ConcernCountry',
      safeguards_agreement: true,
      additional_protocol: false,
      declared_facilities: 5,
      inspections_per_year: 4,
      last_inspection: '2023-03-01',
      findings: [
        {
          inspection_id: 'insp-001',
          facility_id: 'fac-001',
          date: '2023-03-01',
          finding_type: 'anomaly',
          description: 'Unexplained material',
          resolved: false
        }
      ],
      broader_conclusion: false
    });

    const withBroader = monitor.getCountriesWithBroaderConclusion();
    expect(withBroader).toContain('TransparentCountry');
    expect(withBroader).not.toContain('ConcernCountry');

    const withoutAP = monitor.getCountriesWithoutAdditionalProtocol();
    expect(withoutAP).toContain('ConcernCountry');
    expect(withoutAP).not.toContain('TransparentCountry');
  });
});

describe('CWCMonitor', () => {
  let monitor: CWCMonitor;

  beforeEach(() => {
    monitor = new CWCMonitor();
  });

  test('should assess compliance based on destruction progress', () => {
    const compliant = monitor.assessCompliance('CountryA', {
      declared_stockpile: 1000,
      destroyed: 950,
      facilities_declared: 5
    });
    expect(compliant).toBe(ComplianceStatus.COMPLIANT);

    const partial = monitor.assessCompliance('CountryB', {
      declared_stockpile: 1000,
      destroyed: 600,
      facilities_declared: 3
    });
    expect(partial).toBe(ComplianceStatus.PARTIAL_COMPLIANCE);

    const nonCompliant = monitor.assessCompliance('CountryC', {
      declared_stockpile: 1000,
      destroyed: 200,
      facilities_declared: 1
    });
    expect(nonCompliant).toBe(ComplianceStatus.NON_COMPLIANT);
  });
});
