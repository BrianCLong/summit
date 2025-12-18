/**
 * STIX/TAXII Ingestion Performance Benchmarks
 */

import { bench, describe } from 'vitest';
import type { StixObject, Indicator, StixId } from '../../src/types/stix-2.1.js';

// Generate mock indicators for benchmarking
function generateMockIndicators(count: number): Indicator[] {
  const indicators: Indicator[] = [];

  for (let i = 0; i < count; i++) {
    indicators.push({
      type: 'indicator',
      spec_version: '2.1',
      id: `indicator--${crypto.randomUUID()}` as StixId,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      name: `Test Indicator ${i}`,
      description: `This is a test indicator for benchmarking performance. It contains typical metadata and pattern information that would be found in production threat intelligence feeds.`,
      pattern: `[ipv4-addr:value = '192.168.${Math.floor(i / 256)}.${i % 256}']`,
      pattern_type: 'stix',
      valid_from: new Date().toISOString(),
      indicator_types: ['malicious-activity'],
      confidence: Math.floor(Math.random() * 100),
      labels: ['benchmark', 'test', `batch-${Math.floor(i / 100)}`],
    });
  }

  return indicators;
}

// Pattern extraction benchmark
function extractPatternValue(pattern: string): string | null {
  const match = pattern.match(/=\s*'([^']+)'/);
  return match ? match[1] : null;
}

// MITRE mapping benchmark
const MITRE_PATTERNS: Record<string, { id: string; name: string }> = {
  'phishing': { id: 'T1566', name: 'Phishing' },
  'powershell': { id: 'T1059.001', name: 'PowerShell' },
  'credential': { id: 'T1078', name: 'Valid Accounts' },
  'registry': { id: 'T1112', name: 'Modify Registry' },
  'ransomware': { id: 'T1486', name: 'Data Encrypted for Impact' },
};

function mapToMitre(text: string): string[] {
  const mappings: string[] = [];
  const lowerText = text.toLowerCase();

  for (const [pattern, mapping] of Object.entries(MITRE_PATTERNS)) {
    if (lowerText.includes(pattern)) {
      mappings.push(`${mapping.id}:${mapping.name}`);
    }
  }

  return mappings;
}

// Risk score calculation benchmark
function calculateRiskScore(
  confidence: number,
  type: string,
  mitreMappings: number,
  labels: string[]
): number {
  let score = 50;
  score = (score + confidence) / 2;

  const highRiskTypes = ['malware', 'attack-pattern', 'threat-actor'];
  if (highRiskTypes.includes(type)) score += 10;

  score += Math.min(mitreMappings * 5, 20);

  if (labels.some((l) => /critical|severe/i.test(l))) score += 15;
  else if (labels.some((l) => /high/i.test(l))) score += 10;
  else if (labels.some((l) => /medium/i.test(l))) score += 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

// Object to text conversion benchmark
function objectToText(object: StixObject): string {
  const parts: string[] = [];
  const obj = object as Record<string, unknown>;

  if (obj.name) parts.push(`Name: ${obj.name}`);
  if (obj.description) parts.push(`Description: ${obj.description}`);
  if (obj.pattern) parts.push(`Pattern: ${obj.pattern}`);
  if (obj.labels && Array.isArray(obj.labels)) {
    parts.push(`Labels: ${obj.labels.join(', ')}`);
  }
  parts.push(`Type: ${object.type}`);

  return parts.join('\n');
}

describe('Pattern Extraction', () => {
  const patterns = [
    "[ipv4-addr:value = '192.168.1.1']",
    "[domain-name:value = 'malicious.example.com']",
    "[file:hashes.'SHA-256' = 'aec070645fe53ee3b3763059376134f058cc337247c978add178b6ccdfb0019f']",
    "[url:value = 'https://malicious.example.com/payload.exe']",
    "[email-addr:value = 'attacker@malicious.example.com']",
  ];

  bench('extract value from STIX pattern (100 iterations)', () => {
    for (let i = 0; i < 100; i++) {
      extractPatternValue(patterns[i % patterns.length]);
    }
  });
});

describe('MITRE Mapping', () => {
  const descriptions = [
    'This malware uses powershell for execution and registry modifications',
    'The threat actor conducts phishing campaigns targeting credentials',
    'Ransomware that encrypts files and demands payment',
    'Simple indicator with no MITRE mapping',
    'Advanced persistent threat using multiple techniques including credential theft and lateral movement',
  ];

  bench('map text to MITRE techniques (100 iterations)', () => {
    for (let i = 0; i < 100; i++) {
      mapToMitre(descriptions[i % descriptions.length]);
    }
  });
});

describe('Risk Score Calculation', () => {
  const testCases = [
    { confidence: 85, type: 'threat-actor', mitre: 3, labels: ['apt', 'critical'] },
    { confidence: 50, type: 'indicator', mitre: 1, labels: ['medium'] },
    { confidence: 30, type: 'note', mitre: 0, labels: ['info'] },
    { confidence: 95, type: 'malware', mitre: 5, labels: ['ransomware', 'high'] },
    { confidence: 70, type: 'attack-pattern', mitre: 2, labels: ['ttp'] },
  ];

  bench('calculate risk score (1000 iterations)', () => {
    for (let i = 0; i < 1000; i++) {
      const tc = testCases[i % testCases.length];
      calculateRiskScore(tc.confidence, tc.type, tc.mitre, tc.labels);
    }
  });
});

describe('Object Processing', () => {
  const indicators = generateMockIndicators(100);

  bench('convert object to text (100 objects)', () => {
    for (const indicator of indicators) {
      objectToText(indicator);
    }
  });

  bench('full processing pipeline (100 objects)', () => {
    for (const indicator of indicators) {
      // Convert to text
      const text = objectToText(indicator);

      // Extract pattern value
      if (indicator.pattern) {
        extractPatternValue(indicator.pattern);
      }

      // Map to MITRE
      const mitreMappings = mapToMitre(text);

      // Calculate risk score
      calculateRiskScore(
        indicator.confidence || 50,
        indicator.type,
        mitreMappings.length,
        indicator.labels || []
      );
    }
  });
});

describe('Batch Processing', () => {
  bench('generate 1000 mock indicators', () => {
    generateMockIndicators(1000);
  });

  bench('process batch of 1000 indicators', () => {
    const indicators = generateMockIndicators(1000);
    let processed = 0;

    for (const indicator of indicators) {
      const text = objectToText(indicator);
      const value = indicator.pattern ? extractPatternValue(indicator.pattern) : null;
      const mitre = mapToMitre(text);
      const risk = calculateRiskScore(
        indicator.confidence || 50,
        indicator.type,
        mitre.length,
        indicator.labels || []
      );

      if (value && risk > 0) {
        processed++;
      }
    }
  });
});

describe('JSON Serialization', () => {
  const indicators = generateMockIndicators(100);
  const bundle = {
    type: 'bundle',
    id: `bundle--${crypto.randomUUID()}`,
    objects: indicators,
  };

  bench('serialize bundle to JSON', () => {
    JSON.stringify(bundle);
  });

  const jsonString = JSON.stringify(bundle);

  bench('parse bundle from JSON', () => {
    JSON.parse(jsonString);
  });
});

describe('ID Generation and Validation', () => {
  const stixIdRegex = /^[a-z-]+--[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

  bench('generate 1000 STIX IDs', () => {
    for (let i = 0; i < 1000; i++) {
      `indicator--${crypto.randomUUID()}`;
    }
  });

  const ids = Array.from({ length: 1000 }, () => `indicator--${crypto.randomUUID()}`);

  bench('validate 1000 STIX IDs', () => {
    for (const id of ids) {
      stixIdRegex.test(id);
    }
  });
});
