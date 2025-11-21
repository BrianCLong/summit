import {
  NetworkTracker,
  ProcurementMonitor,
  FinancialTracker,
  ProliferationNetwork,
  ProcurementActivity,
  FinancialNode
} from '../src';

describe('NetworkTracker', () => {
  let tracker: NetworkTracker;

  beforeEach(() => {
    tracker = new NetworkTracker();
  });

  test('should register and retrieve networks', () => {
    const network: ProliferationNetwork = {
      id: 'network-001',
      name: 'Test Network',
      type: 'criminal',
      countries_involved: ['CountryA', 'CountryB'],
      key_actors: [
        {
          id: 'actor-001',
          name: 'Test Actor',
          role: 'Broker',
          nationality: 'CountryA',
          affiliated_entities: ['Company A'],
          known_contacts: ['Contact 1'],
          sanctions: false
        }
      ],
      materials_sought: ['centrifuge_components', 'maraging_steel'],
      procurement_methods: ['front_companies', 'transshipment'],
      routes: [
        {
          origin: 'CountryC',
          destination: 'CountryA',
          transit_countries: ['CountryD'],
          transport_modes: ['sea', 'air'],
          known_shipments: 5
        }
      ],
      financial_network: [],
      status: 'active',
      threat_level: 'high',
      first_identified: '2020-01-01'
    };

    tracker.registerNetwork(network);
    const active = tracker.getActiveNetworks();

    expect(active).toHaveLength(1);
    expect(active[0].name).toBe('Test Network');
  });

  test('should track materials sought', () => {
    tracker.registerNetwork({
      id: 'network-001',
      name: 'Centrifuge Network',
      type: 'state_sponsored',
      countries_involved: ['CountryA'],
      key_actors: [],
      materials_sought: ['centrifuge_components', 'uranium'],
      procurement_methods: [],
      routes: [],
      financial_network: [],
      status: 'active',
      threat_level: 'critical',
      first_identified: '2021-01-01'
    });

    tracker.registerNetwork({
      id: 'network-002',
      name: 'Missile Network',
      type: 'criminal',
      countries_involved: ['CountryB'],
      key_actors: [],
      materials_sought: ['rocket_propellant', 'guidance_systems'],
      procurement_methods: [],
      routes: [],
      financial_network: [],
      status: 'active',
      threat_level: 'high',
      first_identified: '2022-01-01'
    });

    const centrifugeNetworks = tracker.trackMaterial('centrifuge_components');
    expect(centrifugeNetworks).toHaveLength(1);
    expect(centrifugeNetworks[0].name).toBe('Centrifuge Network');
  });

  test('should identify key actors without sanctions', () => {
    tracker.registerNetwork({
      id: 'network-001',
      name: 'Test Network',
      type: 'criminal',
      countries_involved: ['CountryA'],
      key_actors: [
        {
          id: 'actor-001',
          name: 'Sanctioned Actor',
          role: 'Leader',
          affiliated_entities: [],
          known_contacts: [],
          sanctions: true
        },
        {
          id: 'actor-002',
          name: 'Unsanctioned Actor',
          role: 'Broker',
          affiliated_entities: [],
          known_contacts: [],
          sanctions: false
        }
      ],
      materials_sought: [],
      procurement_methods: [],
      routes: [],
      financial_network: [],
      status: 'active',
      threat_level: 'medium',
      first_identified: '2020-01-01'
    });

    const unsanctioned = tracker.identifyKeyActors();
    expect(unsanctioned).toHaveLength(1);
    expect(unsanctioned[0].name).toBe('Unsanctioned Actor');
  });
});

describe('ProcurementMonitor', () => {
  let monitor: ProcurementMonitor;

  beforeEach(() => {
    monitor = new ProcurementMonitor();
  });

  test('should record and filter activities', () => {
    monitor.recordActivity({
      id: 'proc-001',
      network_id: 'network-001',
      item_sought: 'centrifuge rotors',
      item_category: 'nuclear',
      quantity: '100 units',
      timestamp: new Date().toISOString(),
      interdicted: false,
      export_control_violation: true
    });

    monitor.recordActivity({
      id: 'proc-002',
      network_id: 'network-001',
      item_sought: 'precursor chemicals',
      item_category: 'chemical',
      timestamp: new Date().toISOString(),
      interdicted: true,
      export_control_violation: true
    });

    const nuclearActivities = monitor.getActivitiesByCategory('nuclear');
    expect(nuclearActivities).toHaveLength(1);
    expect(nuclearActivities[0].item_sought).toBe('centrifuge rotors');
  });

  test('should identify dual-use patterns', () => {
    for (let i = 0; i < 10; i++) {
      monitor.recordActivity({
        id: `proc-${i}`,
        network_id: 'network-001',
        item_sought: 'vacuum pumps',
        item_category: 'dual_use',
        timestamp: new Date().toISOString(),
        interdicted: false,
        export_control_violation: false
      });
    }

    const patterns = monitor.identifyDualUsePatterns();
    expect(patterns).toHaveLength(1);
    expect(patterns[0].item).toBe('vacuum pumps');
    expect(patterns[0].count).toBe(10);
  });
});

describe('FinancialTracker', () => {
  let tracker: FinancialTracker;

  beforeEach(() => {
    tracker = new FinancialTracker();
  });

  test('should identify shell companies', () => {
    tracker.addNode({
      entity_name: 'Legitimate Bank',
      entity_type: 'bank',
      country: 'CountryA',
      role: 'Financial institution',
      transactions_value: 1000000,
      sanctioned: false
    });

    tracker.addNode({
      entity_name: 'Shell Corp 1',
      entity_type: 'shell_company',
      country: 'CountryB',
      role: 'Intermediary',
      transactions_value: 500000,
      sanctioned: false
    });

    tracker.addNode({
      entity_name: 'Shell Corp 2',
      entity_type: 'shell_company',
      country: 'CountryC',
      role: 'Front',
      transactions_value: 250000,
      sanctioned: false
    });

    const shells = tracker.identifyShellCompanies();
    expect(shells).toHaveLength(2);
  });

  test('should track transaction flow', () => {
    tracker.addNode({
      entity_name: 'Target Entity',
      entity_type: 'company',
      country: 'CountryA',
      role: 'Procurement',
      transactions_value: 100000,
      sanctioned: false
    });

    tracker.addNode({
      entity_name: 'Target Entity',
      entity_type: 'company',
      country: 'CountryB',
      role: 'Distribution',
      transactions_value: 50000,
      sanctioned: false
    });

    const flow = tracker.trackTransactionFlow('Target Entity');
    expect(flow.total_value).toBe(150000);
    expect(flow.connections).toContain('CountryA');
    expect(flow.connections).toContain('CountryB');
  });
});
