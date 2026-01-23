import { normalizeEntities, sha256Hex, stableSort, stableStringify } from './utils.js';

const detectLanguage = (text) => {
  if (!text) {
    return 'und';
  }
  if (text.includes('¿') || text.includes('¡')) {
    return 'es';
  }
  return 'en';
};

const dedupeRecords = (records) => {
  const seen = new Set();
  const deduped = [];
  for (const record of records) {
    if (seen.has(record.external_id)) {
      continue;
    }
    seen.add(record.external_id);
    deduped.push(record);
  }
  return deduped;
};

export const buildReplayEvents = ({
  records,
  provenance,
  transformName = 'osint.monitor',
  transformVersion = '1.0.0',
}) => {
  const deduped = dedupeRecords(records);
  const events = deduped.map((record) => {
    const language = record.language ?? detectLanguage(record.content);
    const baseEvent = {
      event_time: record.captured_at,
      platform: record.platform,
      content: record.content,
      language,
      entities: normalizeEntities(record.entities ?? []),
      evidence_urls: stableSort(record.evidence_urls ?? []),
      provenance,
      trace_id: sha256Hex(
        `${record.external_id}:${transformName}:${transformVersion}`,
      ),
      transform: {
        name: transformName,
        version: transformVersion,
      },
    };

    if (record.repost_of) {
      baseEvent.repost_of = record.repost_of;
    }

    if (record.lookup) {
      baseEvent.lookup = record.lookup;
      baseEvent.category = record.category;
    }

    const event_id = sha256Hex(stableStringify(baseEvent));
    return { event_id, ...baseEvent };
  });

  return events.sort((left, right) => {
    if (left.event_time === right.event_time) {
      return left.event_id < right.event_id ? -1 : 1;
    }
    return left.event_time < right.event_time ? -1 : 1;
  });
};
