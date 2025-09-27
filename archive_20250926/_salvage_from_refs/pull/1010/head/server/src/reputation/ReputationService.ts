import { scorePublisher, RepInputs } from './PublisherScore';

export type ReputationRecord = RepInputs & { publisher: string };

const records: Record<string, ReputationRecord> = {};

export function updateReputation(pub: string, data: Partial<RepInputs>) {
  const rec = records[pub] || { publisher: pub, proofsOk: 0, proofsTotal: 0, violations30d: 0, refunds30d: 0, ageDays: 0 };
  records[pub] = { ...rec, ...data };
  return records[pub];
}

export function getReputation(pub: string) {
  const rec = records[pub];
  if (!rec) throw new Error('not_found');
  return { ...rec, score: scorePublisher(rec) };
}

export function topPublishers(limit = 20) {
  return Object.values(records)
    .map(r => ({ ...r, score: scorePublisher(r) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
