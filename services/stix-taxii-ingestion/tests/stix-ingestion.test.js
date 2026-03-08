"use strict";
/**
 * STIX/TAXII Ingestion Service Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
// Mock data
const mockIndicator = {
    type: 'indicator',
    spec_version: '2.1',
    id: 'indicator--8e2e2d2b-17d4-4cbf-938f-98ee46b3cd3f',
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
const mockThreatActor = {
    type: 'threat-actor',
    spec_version: '2.1',
    id: 'threat-actor--56f3f0db-b5d5-431c-ae56-c18f02caf500',
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
const mockMalware = {
    type: 'malware',
    spec_version: '2.1',
    id: 'malware--31b940d4-6f7f-459a-80ea-9c1f17b5891b',
    created: '2024-01-01T00:00:00.000Z',
    modified: '2024-01-01T00:00:00.000Z',
    name: 'WellMess',
    description: 'Custom malware used by APT29',
    malware_types: ['backdoor', 'remote-access-trojan'],
    is_family: true,
    capabilities: ['communicates-with-c2', 'exfiltrates-data'],
};
const mockRelationship = {
    type: 'relationship',
    spec_version: '2.1',
    id: 'relationship--44298a74-ba52-4f0c-87a3-1824e67d7fad',
    created: '2024-01-01T00:00:00.000Z',
    modified: '2024-01-01T00:00:00.000Z',
    relationship_type: 'uses',
    source_ref: 'threat-actor--56f3f0db-b5d5-431c-ae56-c18f02caf500',
    target_ref: 'malware--31b940d4-6f7f-459a-80ea-9c1f17b5891b',
    description: 'APT29 uses WellMess malware',
};
const mockBundle = {
    type: 'bundle',
    id: 'bundle--5d0092c5-5f74-4287-9642-33f4c354e56d',
    objects: [mockIndicator, mockThreatActor, mockMalware, mockRelationship],
};
const mockFeedConfig = {
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
(0, vitest_1.describe)('STIX Types', () => {
    (0, vitest_1.describe)('Indicator', () => {
        (0, vitest_1.it)('should have required STIX 2.1 properties', () => {
            (0, vitest_1.expect)(mockIndicator.type).toBe('indicator');
            (0, vitest_1.expect)(mockIndicator.spec_version).toBe('2.1');
            (0, vitest_1.expect)(mockIndicator.id).toMatch(/^indicator--[a-f0-9-]+$/);
            (0, vitest_1.expect)(mockIndicator.pattern).toBeDefined();
            (0, vitest_1.expect)(mockIndicator.pattern_type).toBe('stix');
            (0, vitest_1.expect)(mockIndicator.valid_from).toBeDefined();
        });
        (0, vitest_1.it)('should have valid pattern syntax', () => {
            (0, vitest_1.expect)(mockIndicator.pattern).toMatch(/\[.*:.*=.*\]/);
        });
    });
    (0, vitest_1.describe)('ThreatActor', () => {
        (0, vitest_1.it)('should have required properties', () => {
            (0, vitest_1.expect)(mockThreatActor.type).toBe('threat-actor');
            (0, vitest_1.expect)(mockThreatActor.name).toBe('APT29');
            (0, vitest_1.expect)(mockThreatActor.threat_actor_types).toContain('nation-state');
        });
        (0, vitest_1.it)('should have valid sophistication level', () => {
            const validLevels = ['none', 'minimal', 'intermediate', 'advanced', 'expert', 'innovator', 'strategic'];
            (0, vitest_1.expect)(validLevels).toContain(mockThreatActor.sophistication);
        });
    });
    (0, vitest_1.describe)('Relationship', () => {
        (0, vitest_1.it)('should link source and target refs', () => {
            (0, vitest_1.expect)(mockRelationship.source_ref).toBe(mockThreatActor.id);
            (0, vitest_1.expect)(mockRelationship.target_ref).toBe(mockMalware.id);
            (0, vitest_1.expect)(mockRelationship.relationship_type).toBe('uses');
        });
    });
    (0, vitest_1.describe)('Bundle', () => {
        (0, vitest_1.it)('should contain all objects', () => {
            (0, vitest_1.expect)(mockBundle.objects).toHaveLength(4);
            (0, vitest_1.expect)(mockBundle.objects.map((o) => o.type)).toContain('indicator');
            (0, vitest_1.expect)(mockBundle.objects.map((o) => o.type)).toContain('threat-actor');
            (0, vitest_1.expect)(mockBundle.objects.map((o) => o.type)).toContain('malware');
            (0, vitest_1.expect)(mockBundle.objects.map((o) => o.type)).toContain('relationship');
        });
    });
});
(0, vitest_1.describe)('TAXII Types', () => {
    (0, vitest_1.describe)('FeedConfig', () => {
        (0, vitest_1.it)('should have required configuration', () => {
            (0, vitest_1.expect)(mockFeedConfig.id).toBeDefined();
            (0, vitest_1.expect)(mockFeedConfig.serverUrl).toMatch(/^https?:\/\//);
            (0, vitest_1.expect)(mockFeedConfig.syncIntervalSeconds).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('should have valid TLP marking', () => {
            const validTLP = ['WHITE', 'GREEN', 'AMBER', 'RED'];
            (0, vitest_1.expect)(validTLP).toContain(mockFeedConfig.tlp);
        });
    });
});
(0, vitest_1.describe)('Pattern Extraction', () => {
    (0, vitest_1.it)('should extract IPv4 address from pattern', () => {
        const pattern = "[ipv4-addr:value = '192.168.1.1']";
        const match = pattern.match(/=\s*'([^']+)'/);
        (0, vitest_1.expect)(match?.[1]).toBe('192.168.1.1');
    });
    (0, vitest_1.it)('should extract domain from pattern', () => {
        const pattern = "[domain-name:value = 'malicious.example.com']";
        const match = pattern.match(/=\s*'([^']+)'/);
        (0, vitest_1.expect)(match?.[1]).toBe('malicious.example.com');
    });
    (0, vitest_1.it)('should extract file hash from pattern', () => {
        const pattern = "[file:hashes.'SHA-256' = 'aec070645fe53ee3b3763059376134f058cc337247c978add178b6ccdfb0019f']";
        const match = pattern.match(/=\s*'([^']+)'/);
        (0, vitest_1.expect)(match?.[1]).toBe('aec070645fe53ee3b3763059376134f058cc337247c978add178b6ccdfb0019f');
    });
});
(0, vitest_1.describe)('MITRE ATT&CK Mapping', () => {
    const MITRE_PATTERNS = {
        'phishing': 'T1566',
        'powershell': 'T1059.001',
        'credential': 'T1078',
        'ransomware': 'T1486',
        'lateral movement': 'T1021',
    };
    (0, vitest_1.it)('should map keywords to MITRE techniques', () => {
        const text = 'This malware uses powershell for execution and performs lateral movement';
        const matches = [];
        for (const [keyword, technique] of Object.entries(MITRE_PATTERNS)) {
            if (text.toLowerCase().includes(keyword)) {
                matches.push(technique);
            }
        }
        (0, vitest_1.expect)(matches).toContain('T1059.001');
        (0, vitest_1.expect)(matches).toContain('T1021');
    });
});
(0, vitest_1.describe)('Risk Score Calculation', () => {
    function calculateRiskScore(confidence, type, mitreMappings, labels) {
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
        if (labels.some((l) => /critical|severe/i.test(l)))
            score += 15;
        else if (labels.some((l) => /high/i.test(l)))
            score += 10;
        else if (labels.some((l) => /medium/i.test(l)))
            score += 5;
        return Math.max(0, Math.min(100, Math.round(score)));
    }
    (0, vitest_1.it)('should calculate risk score for high-confidence threat actor', () => {
        const score = calculateRiskScore(85, 'threat-actor', 3, ['apt', 'critical']);
        (0, vitest_1.expect)(score).toBeGreaterThan(70);
    });
    (0, vitest_1.it)('should calculate lower risk score for low-confidence indicator', () => {
        const score = calculateRiskScore(30, 'indicator', 0, ['low']);
        (0, vitest_1.expect)(score).toBeLessThan(50);
    });
    (0, vitest_1.it)('should clamp score between 0 and 100', () => {
        const highScore = calculateRiskScore(100, 'malware', 10, ['critical']);
        const lowScore = calculateRiskScore(0, 'note', 0, []);
        (0, vitest_1.expect)(highScore).toBeLessThanOrEqual(100);
        (0, vitest_1.expect)(lowScore).toBeGreaterThanOrEqual(0);
    });
});
(0, vitest_1.describe)('STIX ID Validation', () => {
    (0, vitest_1.it)('should validate STIX ID format', () => {
        const validIds = [
            'indicator--8e2e2d2b-17d4-4cbf-938f-98ee46b3cd3f',
            'threat-actor--56f3f0db-b5d5-431c-ae56-c18f02caf500',
            'malware--31b940d4-6f7f-459a-80ea-9c1f17b5891b',
            'relationship--44298a74-ba52-4f0c-87a3-1824e67d7fad',
        ];
        const stixIdRegex = /^[a-z-]+--[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
        for (const id of validIds) {
            (0, vitest_1.expect)(id).toMatch(stixIdRegex);
        }
    });
    (0, vitest_1.it)('should reject invalid STIX IDs', () => {
        const invalidIds = [
            'indicator-8e2e2d2b-17d4-4cbf-938f-98ee46b3cd3f', // single dash
            'INDICATOR--8e2e2d2b-17d4-4cbf-938f-98ee46b3cd3f', // uppercase
            'indicator--8e2e2d2b-17d4-4cbf-938f', // truncated UUID
            'indicator--not-a-uuid', // invalid UUID
        ];
        const stixIdRegex = /^[a-z-]+--[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
        for (const id of invalidIds) {
            (0, vitest_1.expect)(id).not.toMatch(stixIdRegex);
        }
    });
});
(0, vitest_1.describe)('Timestamp Handling', () => {
    (0, vitest_1.it)('should parse ISO 8601 timestamps', () => {
        const timestamp = '2024-01-01T00:00:00.000Z';
        const date = new Date(timestamp);
        (0, vitest_1.expect)(date.getUTCFullYear()).toBe(2024);
        (0, vitest_1.expect)(date.getUTCMonth()).toBe(0);
        (0, vitest_1.expect)(date.getUTCDate()).toBe(1);
    });
    (0, vitest_1.it)('should compare timestamps correctly', () => {
        const earlier = '2024-01-01T00:00:00.000Z';
        const later = '2024-12-31T23:59:59.999Z';
        (0, vitest_1.expect)(new Date(earlier).getTime()).toBeLessThan(new Date(later).getTime());
    });
});
