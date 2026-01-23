import { readFile } from 'node:fs/promises';
import { normalizeEntities, normalizeUrls, sha256Hex, stableSort } from './utils.js';

/**
 * @typedef {Object} ConnectorProvenance
 * @property {string} source
 * @property {string} query
 * @property {string} auth_mode
 * @property {string[]} licensing_tags
 * @property {string} raw_payload_hash
 */

/**
 * @typedef {Object} ConnectorDeterministicPayload
 * @property {ConnectorProvenance} provenance
 * @property {Array<Record<string, unknown>>} records
 */

const buildProvenance = ({
  source,
  query,
  authMode,
  licensingTags,
  rawPayloadHash,
}) => ({
  source,
  query,
  auth_mode: authMode,
  licensing_tags: stableSort(licensingTags),
  raw_payload_hash: rawPayloadHash,
});

const sortRecords = (records) => {
  const recordMap = new Map(
    records.map((record) => [record.external_id, record]),
  );
  return stableSort(records.map((record) => record.external_id)).map((id) =>
    recordMap.get(id),
  );
};

const normalizeSocialRecord = (record) => ({
  external_id: record.id,
  platform: record.platform,
  captured_at: record.captured_at,
  content: record.text,
  language: record.language,
  entities: normalizeEntities(record.entities ?? []),
  repost_of: record.repost_of ?? null,
  evidence_urls: normalizeUrls(record.urls ?? []),
});

const normalizeEnrichmentRecord = (record) => ({
  external_id: record.id,
  platform: 'enrichment',
  captured_at: record.captured_at,
  content: record.summary,
  language: record.language,
  entities: normalizeEntities(record.entities ?? []),
  lookup: record.lookup,
  category: record.category,
  evidence_urls: normalizeUrls(record.urls ?? []),
});

export const runSocialFixtureConnector = async ({
  fixturePath,
  source,
  query,
  authMode = 'fixture',
  licensingTags = [],
  retrievalTime = new Date().toISOString(),
}) => {
  const rawPayload = await readFile(fixturePath, 'utf8');
  const data = JSON.parse(rawPayload);
  const rawPayloadHash = sha256Hex(rawPayload);
  const records = sortRecords(data.posts.map(normalizeSocialRecord));

  return {
    connector_id: 'social-fixture',
    deterministic: {
      provenance: buildProvenance({
        source,
        query,
        authMode,
        licensingTags,
        rawPayloadHash,
      }),
      records,
    },
    nondeterministic: {
      retrieval_time: retrievalTime,
    },
  };
};

export const runEnrichmentFixtureConnector = async ({
  fixturePath,
  source,
  query,
  authMode = 'fixture',
  licensingTags = [],
  retrievalTime = new Date().toISOString(),
}) => {
  const rawPayload = await readFile(fixturePath, 'utf8');
  const data = JSON.parse(rawPayload);
  const rawPayloadHash = sha256Hex(rawPayload);
  const records = sortRecords(data.records.map(normalizeEnrichmentRecord));

  return {
    connector_id: 'enrichment-fixture',
    deterministic: {
      provenance: buildProvenance({
        source,
        query,
        authMode,
        licensingTags,
        rawPayloadHash,
      }),
      records,
    },
    nondeterministic: {
      retrieval_time: retrievalTime,
    },
  };
};
