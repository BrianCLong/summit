import { sha256Hex, stableStringify } from './utils.js';

export const toJsonLines = (events) =>
  `${events.map((event) => stableStringify(event)).join('\n')}\n`;

export const parseJsonLines = (input) =>
  input
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));

export const filterReplayEvents = (
  events,
  { from, to, platform, entity, language },
) => {
  const fromTime = from ? Date.parse(from) : null;
  const toTime = to ? Date.parse(to) : null;

  return events.filter((event) => {
    const eventTime = Date.parse(event.event_time);
    if (Number.isNaN(eventTime)) {
      return false;
    }
    if (fromTime !== null && eventTime < fromTime) {
      return false;
    }
    if (toTime !== null && eventTime > toTime) {
      return false;
    }
    if (platform && event.platform !== platform) {
      return false;
    }
    if (language && event.language !== language) {
      return false;
    }
    if (entity && !event.entities?.includes(entity)) {
      return false;
    }
    return true;
  });
};

export const buildReplayBundle = ({ events, schemaVersion = '1.0' }) => {
  const jsonl = toJsonLines(events);
  return {
    manifest: {
      schema_version: schemaVersion,
      event_count: events.length,
      content_hash: sha256Hex(jsonl),
    },
    jsonl,
  };
};

export const renderReplaySummary = (events) => {
  const platformCounts = new Map();
  for (const event of events) {
    platformCounts.set(
      event.platform,
      (platformCounts.get(event.platform) ?? 0) + 1,
    );
  }
  const lines = ['Replay Summary', `Total events: ${events.length}`];
  for (const [platform, count] of platformCounts.entries()) {
    lines.push(`- ${platform}: ${count}`);
  }
  return lines.join('\n');
};
