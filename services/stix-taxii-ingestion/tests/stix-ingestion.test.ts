/**
 * STIX/TAXII Ingestion Service Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type {
  StixBundle,
  Indicator,
  ThreatActor,
  Malware,
  Relationship,
  StixId,
} from '../src/types/stix-2.1.js';
import type { TaxiiFeedConfig } from '../src/types/taxii-2.1.js';

// Mock data
const mockIndicator: Indicator = {
  type: 'indicator',
  spec_version: '2.1',
  id: 'indicator--8e2e2d2b-17d4-4cbf-938f-98ee46b3cd3f' as StixId,
  created: '2024-01-01T00:00:00.000Z',
  modified: '2024-01-01T00:00:00.000Z',
  name: 'Malicious IP Indicator',
  description: 'IP address associated with APT29 C2 infrastructure',
  pattern: "[ipv4-addr:value = '192.168.1.1']",
  pattern_type: 'stix',
  valid_from: '2024-01-01T00:00:00.000Z',
  indicator_types: ['malicious-activity'],
  confidence: 85,
  labels: ['malicious-activity', 'apt'],
};

const mockThreatActor: ThreatActor = {
  type: 'threat-actor',
  spec_version: '2.1',
  id: 'threat-actor--56f3f0db-b5d5-431c-ae56-c18f02caf500' as StixId,
  created: '2024-01-01T00:00:00.000Z',
  modified: '2024-01-01T00:00:00.000Z',
  name: 'APT29',
  description: 'Russian state-sponsored threat actor also known as Cozy Bear',
  threat_actor_types: ['nation-state'],
  aliases: ['Cozy Bear', 'The Dukes', 'YTTRIUM'],
  first_seen: '2008-01-01T00:00:00.000Z',
  sophistication: 'expert',
  resource_level: 'government',
  primary_motivation: 'organizational-gain',
  goals: ['espionage', 'data theft'],
};

const mockMalware: Malware = {
  type: 'malware',
  spec_version: '2.1',
  id: 'malware--31b940d4-6f7f-459a-80ea-9c1f17b5891b' as StixId,
  created: '2024-01-01T00:00:00.000Z',
  modified: '2024-01-01T00:00:00.000Z',
  name: 'WellMess',
  description: 'Custom malware used by APT29',
  malware_types: ['backdoor', 'remote-access-trojan'],
  is_family: true,
  capabilities: ['communicates-with-c2', 'exfiltrates-data'],
};

const mockRelationship: Relationship = {
  type: 'relationship',
  spec_version: '2.1',
  id: 'relationship--44298a74-ba52-4f0c-87a3-1824e67d7fad' as StixId,
  created: '2024-01-01T00:00:00.000Z',
  modified: '2024-01-01T00:00:00.000Z',
  relationship_type: 'uses',
  source_ref: 'threat-actor--56f3f0db-b5d5-431c-ae56-c18f02caf500' as StixId,
  target_ref: 'malware--31b940d4-6f7f-459a-80ea-9c1f17b5891b' as StixId,
  description: 'APT29 uses WellMess malware',
};

const mockBundle: StixBundle = {
  type: 'bundle',
  id: 'bundle--5d0092c5-5f74-4287-9642-33f4c354e56d' as StixId,
  objects: [mockIndicator, mockThreatActor, mockMalware, mockRelationship],
};

const mockFeedConfig: TaxiiFeedConfig = {
  id: 'feed-test-001',
  name: 'Test TAXII Feed',
  enabled: true,
  serverUrl: 'https://taxii.example.com',
  apiRoot: '/taxii2/api-root',
  collectionId: 'collection--test-123',
  syncIntervalSeconds: 3600,
  priority: 'high',
  tlp: 'AMBER',
};

describe('STIX Types', () => {
  describe('Indicator', () => {
    it('should have required STIX 2.1 properties', () => {
      expect(mockIndicator.type).toBe('indicator');
      expect(mockIndicator.spec_version).toBe('2.1');
      expect(mockIndicator.id).toMatch(/^indicator--[a-f0-9-]+$/);
      expect(mockIndicator.pattern).toBeDefined();
      expect(mockIndicator.pattern_type).toBe('stix');
      expect(mockIndicator.valid_from).toBeDefined();
    });

    it('should have valid pattern syntax', () => {
      expect(mockIndicator.pattern).toMatch(/\[.*:.*=.*\]/);
    });
  });

  describe('ThreatActor', () => {
    it('should have required properties', () => {
      expect(mockThreatActor.type).toBe('threat-actor');
      expect(mockThreatActor.name).toBe('APT29');
      expect(mockThreatActor.threat_actor_types).toContain('nation-state');
    });

    it('should have valid sophistication level', () => {
      const validLevels = ['none', 'minimal', 'intermediate', 'advanced', 'expert', 'innovator', 'strategic'];
      expect(validLevels).toContain(mockThreatActor.sophistication);
    });
  });

  describe('Relationship', () => {
    it('should link source and target refs', () => {
      expect(mockRelationship.source_ref).toBe(mockThreatActor.id);
      expect(mockRelationship.target_ref).toBe(mockMalware.id);
      expect(mockRelationship.relationship_type).toBe('uses');
    });
  });

  describe('Bundle', () => {
    it('should contain all objects', () => {
      expect(mockBundle.objects).toHaveLength(4);
      expect(mockBundle.objects.map((o) => o.type)).toContain('indicator');
      expect(mockBundle.objects.map((o) => o.type)).toContain('threat-actor');
      expect(mockBundle.objects.map((o) => o.type)).toContain('malware');
      expect(mockBundle.objects.map((o) => o.type)).toContain('relationship');
    });
  });
});

describe('TAXII Types', () => {
  describe('FeedConfig', () => {
    it('should have required configuration', () => {
      expect(mockFeedConfig.id).toBeDefined();
      expect(mockFeedConfig.serverUrl).toMatch(/^https?:\/\//);
      expect(mockFeedConfig.syncIntervalSeconds).toBeGreaterThan(0);
    });

    it('should have valid TLP marking', () => {
      const validTLP = ['WHITE', 'GREEN', 'AMBER', 'RED'];
      expect(validTLP).toContain(mockFeedConfig.tlp);
    });
  });
});

describe('Pattern Extraction', () => {
  it('should extract IPv4 address from pattern', () => {
    const pattern = "[ipv4-addr:value = '192.168.1.1']";
    const match = pattern.match(/=\s*'([^']+)'/);
    expect(match?.[1]).toBe('192.168.1.1');
  });

  it('should extract domain from pattern', () => {
    const pattern = "[domain-name:value = 'malicious.example.com']";
    const match = pattern.match(/=\s*'([^']+)'/);
    expect(match?.[1]).toBe('malicious.example.com');
  });

  it('should extract file hash from pattern', () => {
    const pattern = "[file:hashes.'SHA-256' = 'aec070645fe53ee3b3763059376134f058cc337247c978add178b6ccdfb0019f']";
    const match = pattern.match(/=\s*'([^']+)'/);
    expect(match?.[1]).toBe('aec070645fe53ee3b3763059376134f058cc337247c978add178b6ccdfb0019f');
  });
});

describe('MITRE ATT&CK Mapping', () => {
  const MITRE_PATTERNS: Record<string, string> = {
    'phishing': 'T1566',
    'powershell': 'T1059.001',
    'credential': 'T1078',
    'ransomware': 'T1486',
    'lateral movement': 'T1021',
  };

  it('should map keywords to MITRE techniques', () => {
    const text = 'This malware uses powershell for execution and performs lateral movement';
    const matches: string[] = [];

    for (const [keyword, technique] of Object.entries(MITRE_PATTERNS)) {
      if (text.toLowerCase().includes(keyword)) {
        matches.push(technique);
      }
    }

    expect(matches).toContain('T1059.001');
    expect(matches).toContain('T1021');
  });
});

describe('Risk Score Calculation', () => {
  function calculateRiskScore(
    confidence: number,
    type: string,
    mitreMappings: number,
    labels: string[]
  ): number {
    let score = 50;

    // Confidence factor
    score = (score + confidence) / 2;

    // Type adjustment
    const highRiskTypes = ['malware', 'attack-pattern', 'threat-actor'];
    if (highRiskTypes.includes(type)) {
      score += 10;
    }

    // MITRE mappings
    score += Math.min(mitreMappings * 5, 20);

    // Severity labels
    if (labels.some((l) => /critical|severe/i.test(l))) score += 15;
    else if (labels.some((l) => /high/i.test(l))) score += 10;
    else if (labels.some((l) => /medium/i.test(l))) score += 5;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  it('should calculate risk score for high-confidence threat actor', () => {
    const score = calculateRiskScore(85, 'threat-actor', 3, ['apt', 'critical']);
    expect(score).toBeGreaterThan(70);
  });

  it('should calculate lower risk score for low-confidence indicator', () => {
    const score = calculateRiskScore(30, 'indicator', 0, ['low']);
    expect(score).toBeLessThan(50);
  });

  it('should clamp score between 0 and 100', () => {
    const highScore = calculateRiskScore(100, 'malware', 10, ['critical']);
    const lowScore = calculateRiskScore(0, 'note', 0, []);

    expect(highScore).toBeLessThanOrEqual(100);
    expect(lowScore).toBeGreaterThanOrEqual(0);
  });
});

describe('STIX ID Validation', () => {
  it('should validate STIX ID format', () => {
    const validIds = [
      'indicator--8e2e2d2b-17d4-4cbf-938f-98ee46b3cd3f',
      'threat-actor--56f3f0db-b5d5-431c-ae56-c18f02caf500',
      'malware--31b940d4-6f7f-459a-80ea-9c1f17b5891b',
      'relationship--44298a74-ba52-4f0c-87a3-1824e67d7fad',
    ];

    const stixIdRegex = /^[a-z-]+--[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

    for (const id of validIds) {
      expect(id).toMatch(stixIdRegex);
    }
  });

  it('should reject invalid STIX IDs', () => {
    const invalidIds = [
      'indicator-8e2e2d2b-17d4-4cbf-938f-98ee46b3cd3f', // single dash
      'INDICATOR--8e2e2d2b-17d4-4cbf-938f-98ee46b3cd3f', // uppercase
      'indicator--8e2e2d2b-17d4-4cbf-938f', // truncated UUID
      'indicator--not-a-uuid', // invalid UUID
    ];

    const stixIdRegex = /^[a-z-]+--[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

    for (const id of invalidIds) {
      expect(id).not.toMatch(stixIdRegex);
    }
  });
});

describe('Timestamp Handling', () => {
  it('should parse ISO 8601 timestamps', () => {
    const timestamp = '2024-01-01T00:00:00.000Z';
    const date = new Date(timestamp);

    expect(date.getUTCFullYear()).toBe(2024);
    expect(date.getUTCMonth()).toBe(0);
    expect(date.getUTCDate()).toBe(1);
  });

  it('should compare timestamps correctly', () => {
    const earlier = '2024-01-01T00:00:00.000Z';
    const later = '2024-12-31T23:59:59.999Z';

    expect(new Date(earlier).getTime()).toBeLessThan(new Date(later).getTime());
  });
});
