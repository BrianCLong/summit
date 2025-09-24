import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

export type ConnectorAuthMode = 'none' | 'api-key' | 'oauth' | 'service-account' | 'manual';
export type ConnectorLicenseClass = 'public' | 'commercial' | 'restricted';
export type ConnectorWave = 'wave1' | 'wave2';

export interface ConnectorRateLimit {
  window: 'minute' | 'hour' | 'day';
  limit: number;
  burst?: number;
  notes?: string;
}

export interface ConnectorFixture {
  id: string;
  path: string;
  description: string;
  checksum: string;
}

export interface ConnectorManifest {
  id: string;
  title: string;
  category: string;
  summary: string;
  wave: ConnectorWave;
  ownerTeam: string;
  whatItUnlocks: string[];
  authentication: {
    mode: ConnectorAuthMode;
    bringYourOwn: boolean;
    notes: string;
  };
  license: {
    classification: ConnectorLicenseClass;
    url?: string;
    notes: string;
  };
  ingest: {
    schedule: 'manual' | 'hourly' | 'daily' | 'nightly';
    rateLimits: ConnectorRateLimit[];
  };
  scopes: string[];
  piiFlags: string[];
  fixtures: ConnectorFixture[];
  complianceNotes: string[];
  documentation: string[];
  goLiveDependencies: string[];
  demoNarratives: string[];
}

export interface ConnectorCatalog {
  updatedAt: string;
  connectors: ConnectorManifest[];
  summary: {
    total: number;
    byWave: Record<ConnectorWave, number>;
  };
}

const CONFIG_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../config/connectors'
);

function assertArray(value: unknown, message: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new TypeError(message);
  }
  return value;
}

function assertString(value: unknown, message: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(message);
  }
  return value;
}

function assertWave(value: unknown, message: string): ConnectorWave {
  const candidate = assertString(value, message) as ConnectorWave;
  if (candidate !== 'wave1' && candidate !== 'wave2') {
    throw new TypeError(`${message} Received ${candidate}.`);
  }
  return candidate;
}

function normaliseStringList(value: unknown, label: string): string[] {
  return assertArray(value, `${label} must be an array.`).map((item, index) =>
    assertString(item, `${label} #${index} must be string.`)
  );
}

function normaliseOptionalStringList(value: unknown, label: string): string[] {
  if (value === undefined) {
    return [];
  }
  return normaliseStringList(value, label);
}

function normaliseRateLimits(value: unknown, source: string): ConnectorRateLimit[] {
  const items = assertArray(value, `${source} rateLimits must be an array.`);
  return items.map((item, index) => {
    if (typeof item !== 'object' || item === null) {
      throw new TypeError(`${source} rateLimit #${index} must be an object.`);
    }
    const window = assertString((item as Record<string, unknown>).window, `${source} rateLimit window missing.`);
    const limitValue = (item as Record<string, unknown>).limit;
    if (typeof limitValue !== 'number' || !Number.isFinite(limitValue)) {
      throw new TypeError(`${source} rateLimit #${index} limit must be a number.`);
    }
    const record: ConnectorRateLimit = { window: window as ConnectorRateLimit['window'], limit: limitValue };
    const burst = (item as Record<string, unknown>).burst;
    if (typeof burst === 'number' && Number.isFinite(burst)) {
      record.burst = burst;
    }
    const notes = (item as Record<string, unknown>).notes;
    if (typeof notes === 'string') {
      record.notes = notes;
    }
    return record;
  });
}

function normaliseFixtures(value: unknown, source: string): ConnectorFixture[] {
  const fixtures = assertArray(value, `${source} fixtures must be an array.`);
  return fixtures.map((item, index) => {
    if (typeof item !== 'object' || item === null) {
      throw new TypeError(`${source} fixture #${index} must be an object.`);
    }
    const record = item as Record<string, unknown>;
    return {
      id: assertString(record.id, `${source} fixture #${index} id missing.`),
      path: assertString(record.path, `${source} fixture #${index} path missing.`),
      description: assertString(
        record.description,
        `${source} fixture #${index} description missing.`
      ),
      checksum: assertString(record.checksum, `${source} fixture #${index} checksum missing.`)
    } satisfies ConnectorFixture;
  });
}

function loadManifestFromFile(filePath: string): ConnectorManifest {
  const source = path.basename(filePath);
  const contents = readFileSync(filePath, 'utf8');
  const data = parse(contents) as Record<string, unknown>;

  const manifest: ConnectorManifest = {
    id: assertString(data.id, `${source} missing id.`),
    title: assertString(data.title, `${source} missing title.`),
    category: assertString(data.category, `${source} missing category.`),
    summary: assertString(data.summary, `${source} missing summary.`),
    wave: assertWave(data.wave, `${source} missing wave.`),
    ownerTeam: assertString(data.ownerTeam, `${source} missing ownerTeam.`),
    whatItUnlocks: assertArray(data.whatItUnlocks, `${source} whatItUnlocks must be an array.`).map((item, index) =>
      assertString(item, `${source} whatItUnlocks #${index} must be string.`)
    ),
    authentication: {
      mode: assertString(
        data.authentication && (data.authentication as Record<string, unknown>).mode,
        `${source} missing authentication.mode.`
      ) as ConnectorManifest['authentication']['mode'],
      bringYourOwn: Boolean(
        data.authentication && (data.authentication as Record<string, unknown>).bringYourOwn
      ),
      notes: assertString(
        data.authentication && (data.authentication as Record<string, unknown>).notes,
        `${source} missing authentication.notes.`
      )
    },
    license: {
      classification: assertString(
        data.license && (data.license as Record<string, unknown>).classification,
        `${source} missing license.classification.`
      ) as ConnectorManifest['license']['classification'],
      url:
        typeof data.license === 'object' && data.license !== null
          ? (data.license as Record<string, unknown>).url?.toString()
          : undefined,
      notes: assertString(
        data.license && (data.license as Record<string, unknown>).notes,
        `${source} missing license.notes.`
      )
    },
    ingest: {
      schedule: assertString(
        data.ingest && (data.ingest as Record<string, unknown>).schedule,
        `${source} missing ingest.schedule.`
      ) as ConnectorManifest['ingest']['schedule'],
      rateLimits: normaliseRateLimits(
        data.ingest && (data.ingest as Record<string, unknown>).rateLimits,
        source
      )
    },
    scopes: assertArray(data.scopes, `${source} scopes must be an array.`).map((item, index) =>
      assertString(item, `${source} scope #${index} must be string.`)
    ),
    piiFlags: assertArray(data.piiFlags, `${source} piiFlags must be an array.`).map((item, index) =>
      assertString(item, `${source} piiFlags #${index} must be string.`)
    ),
    fixtures: normaliseFixtures(data.fixtures, source),
    complianceNotes: assertArray(
      data.complianceNotes,
      `${source} complianceNotes must be an array.`
    ).map((item, index) => assertString(item, `${source} complianceNotes #${index} must be string.`)),
    documentation: assertArray(data.documentation, `${source} documentation must be an array.`).map((item, index) =>
      assertString(item, `${source} documentation #${index} must be string.`)
    ),
    goLiveDependencies: normaliseOptionalStringList(
      data.goLiveDependencies,
      `${source} goLiveDependencies`
    ),
    demoNarratives: normaliseStringList(
      data.demoNarratives,
      `${source} demoNarratives`
    )
  };

  return manifest;
}

export function loadConnectorManifests(): ConnectorManifest[] {
  const entries = readdirSync(CONFIG_DIR)
    .filter(file => file.endsWith('.yaml'))
    .map(file => path.join(CONFIG_DIR, file))
    .filter(file => statSync(file).isFile())
    .map(loadManifestFromFile);

  return entries.sort((a, b) => a.id.localeCompare(b.id));
}

export function groupConnectorsByWave(
  manifests: ConnectorManifest[] = loadConnectorManifests()
): Record<ConnectorWave, ConnectorManifest[]> {
  const groups: Record<ConnectorWave, ConnectorManifest[]> = {
    wave1: [],
    wave2: []
  };

  for (const manifest of manifests) {
    groups[manifest.wave].push(manifest);
  }

  for (const wave of Object.keys(groups) as ConnectorWave[]) {
    groups[wave].sort((left, right) => left.id.localeCompare(right.id));
  }

  return groups;
}

export function buildConnectorCatalog(): ConnectorCatalog {
  const connectors = loadConnectorManifests();
  const byWave = groupConnectorsByWave(connectors);

  return {
    updatedAt: new Date().toISOString(),
    connectors,
    summary: {
      total: connectors.length,
      byWave: {
        wave1: byWave.wave1.length,
        wave2: byWave.wave2.length
      }
    }
  };
}

export function findConnectorById(id: string): ConnectorManifest | undefined {
  return loadConnectorManifests().find(connector => connector.id === id);
}
