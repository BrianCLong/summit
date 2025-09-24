import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  buildConnectorCatalog,
  groupConnectorsByWave,
  loadConnectorManifests
} from '../src/connectors';

const EXPECTED_WAVE1 = 12;
const EXPECTED_WAVE2 = 6;
const EXPECTED_TOTAL = EXPECTED_WAVE1 + EXPECTED_WAVE2;

describe('connector manifests', () => {
  const configRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../config');

  it('loads the configured connector manifests with ownership details', () => {
    const manifests = loadConnectorManifests();
    expect(manifests).toHaveLength(EXPECTED_TOTAL);
    const ids = manifests.map(item => item.id);
    expect(new Set(ids).size).toBe(EXPECTED_TOTAL);
    for (const manifest of manifests) {
      expect(manifest.ownerTeam.trim()).not.toHaveLength(0);
      expect(manifest.demoNarratives.length).toBeGreaterThan(0);
      expect(manifest.goLiveDependencies.length).toBeGreaterThan(0);
    }
  });

  it('ensures every manifest contains fixtures with golden hashes', () => {
    const manifests = loadConnectorManifests();
    for (const manifest of manifests) {
      expect(manifest.fixtures.length).toBeGreaterThan(0);
      for (const fixture of manifest.fixtures) {
        const absolutePath = path.resolve(configRoot, fixture.path);
        const contents = readFileSync(absolutePath);
        const digest = createHash('sha256').update(contents).digest('hex');
        expect(digest).toBe(fixture.checksum);
      }
    }
  });

  it('provides a catalog snapshot with timestamps', () => {
    const catalog = buildConnectorCatalog();
    expect(typeof catalog.updatedAt).toBe('string');
    expect(new Date(catalog.updatedAt).toString()).not.toBe('Invalid Date');
    expect(catalog.connectors).toHaveLength(EXPECTED_TOTAL);
    expect(catalog.summary.total).toBe(EXPECTED_TOTAL);
    expect(catalog.summary.byWave.wave1).toBe(EXPECTED_WAVE1);
    expect(catalog.summary.byWave.wave2).toBe(EXPECTED_WAVE2);
  });

  it('groups connectors by wave for roadmap planning', () => {
    const byWave = groupConnectorsByWave();
    expect(byWave.wave1).toHaveLength(EXPECTED_WAVE1);
    expect(byWave.wave2).toHaveLength(EXPECTED_WAVE2);
  });
});
