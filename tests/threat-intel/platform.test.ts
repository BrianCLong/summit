import { ThreatIntelPlatform, ThreatHuntingRule } from '../../src/threat-intel/platform';

describe('ThreatIntelPlatform', () => {
  const buildPlatform = () => new ThreatIntelPlatform();

  it('ingests STIX/TAXII style feeds with TLP normalization and deduplication', () => {
    const platform = buildPlatform();
    const now = new Date();
    const feedResult = platform.ingestStixFeed(
      'taxii-lab',
      [
        {
          id: 'indicator--1',
          type: 'indicator',
          name: 'Suspicious beacon',
          created: now,
          modified: now,
        },
        {
          id: 'indicator--1',
          type: 'indicator',
          name: 'Suspicious beacon duplicate',
          created: now,
          modified: now,
          tlp: 'GREEN',
        },
      ],
      'AMBER',
    );

    expect(feedResult.accepted).toBe(1);
    expect(feedResult.rejected).toBe(1);
    const shared = platform.shareIntelligence({ id: 'partner', name: 'taxii-lab', maxTlp: 'AMBER', acceptedFeeds: [] });
    expect(shared.stix).toHaveLength(1);
    expect(shared.stix[0].tlp).toBe('AMBER');
  });

  it('maps MITRE ATT&CK techniques for detection and mitigation context', () => {
    const platform = buildPlatform();
    const mappings = platform.mapAttackTechniques(['T1190', 'T1041']);

    const techniques = mappings.map((m) => m.technique);
    expect(techniques).toContain('Exploit Public-Facing Application');
    expect(techniques).toContain('Exfiltration Over C2 Channel');
  });

  it('ingests TAXII bundles and infers TLP from marking definitions', () => {
    const platform = buildPlatform();
    const now = new Date();

    const result = platform.ingestTaxiiBundle(
      'taxii-bundle',
      {
        type: 'bundle',
        objects: [
          {
            id: 'indicator--10',
            type: 'indicator',
            name: 'Beacon infrastructure',
            description: 'Observed beaconing',
            created: now,
            modified: now,
            object_marking_refs: ['marking-definition--tlp:red'],
          },
          {
            id: 'tool--1',
            type: 'tool',
            name: 'C2 tool',
            description: 'Command and control capability',
            created: now,
            modified: now,
            object_marking_refs: ['marking-definition--tlp:green'],
          },
        ],
      },
      'AMBER',
    );

    expect(result.accepted).toBe(2);
    const partnerIntel = platform.shareIntelligence({ id: 'p1', name: 'analyst', maxTlp: 'GREEN', acceptedFeeds: ['taxii-bundle'] });
    expect(partnerIntel.stix).toHaveLength(1);
    expect(partnerIntel.stix[0].tlp).toBe('GREEN');
  });

  it('enriches IOCs with dark web and CVE overlap signals', () => {
    const platform = buildPlatform();
    platform.addDarkWebIntel({
      source: 'market',
      content: 'Sale of access using hash ABC',
      matchedIndicators: ['abc123'],
      riskScore: 80,
      tlp: 'AMBER',
      observed: new Date(),
    });
    platform.trackCve({
      id: 'CVE-2024-0001',
      cvss: 9.8,
      affectedProducts: ['cloud'],
      exploitedInTheWild: true,
      published: new Date(),
      tlp: 'GREEN',
    });
    const ioc = platform.addIoc({
      id: 'ioc-1',
      type: 'hash',
      value: 'abc123',
      source: 'sandbox',
      confidence: 80,
      tlp: 'AMBER',
      sightings: 3,
      tags: ['asn:64512', 'geo:us', 'cloud'],
      relatedTechniques: ['T1190'],
    });

    expect(ioc.enrichment?.reputationScore).toBeGreaterThanOrEqual(80);
    expect(ioc.enrichment?.darkWebHits).toBe(1);
    expect(ioc.enrichment?.cveOverlap).toContain('CVE-2024-0001');
  });

  it('scores correlated threats using actor sophistication, kill chain, and exploitation', () => {
    const platform = buildPlatform();
    platform.addThreatActorProfile({
      id: 'actor-1',
      name: 'APT Atlas',
      motivations: ['espionage'],
      sophistication: 'apt',
      region: 'global',
      sectors: ['cloud'],
      knownTechniques: ['T1190'],
      preferredKillChainPhases: ['exploitation'],
      confidence: 90,
      tlp: 'AMBER',
    });
    platform.trackCve({
      id: 'CVE-2024-9999',
      cvss: 9.1,
      affectedProducts: ['cloud'],
      exploitedInTheWild: true,
      published: new Date(),
      tlp: 'GREEN',
    });
    platform.addIoc({
      id: 'ioc-2',
      type: 'domain',
      value: 'apt-atlas.onion',
      source: 'sinkhole',
      confidence: 70,
      tlp: 'AMBER',
      sightings: 6,
      tags: ['geo:global'],
      relatedTechniques: ['T1190'],
    });

    const correlated = platform.correlate();
    expect(correlated[0].score).toBeGreaterThan(50);
    expect(correlated[0].actors[0].name).toBe('APT Atlas');
  });

  it('enforces TLP ceilings during partner intelligence sharing and hunts events', () => {
    const platform = buildPlatform();
    platform.addIoc({
      id: 'ioc-3',
      type: 'ip',
      value: '203.0.113.10',
      source: 'sensor',
      confidence: 60,
      tlp: 'RED',
      sightings: 1,
      tags: [],
    });
    const partnerIntel = platform.shareIntelligence({ id: 'p1', name: 'any', maxTlp: 'AMBER', acceptedFeeds: [] });
    expect(partnerIntel.iocs).toHaveLength(0);

    const rules: ThreatHuntingRule[] = [
      {
        id: 'hunt-1',
        name: 'High-risk geos',
        description: 'Flags AMBER or higher geo anomalies',
        severity: 'high',
        requiredTlp: 'AMBER',
        match: (event) => event.geo === 'eu' && event.score > 70,
      },
    ];
    const hunts = platform.hunt(
      [
        { id: 1, geo: 'eu', score: 80, tlp: 'AMBER' },
        { id: 2, geo: 'apac', score: 90, tlp: 'GREEN' },
      ],
      rules,
    );

    expect(hunts[0].matches).toHaveLength(1);
    expect(hunts[0].matches[0].id).toBe(1);
  });
});
