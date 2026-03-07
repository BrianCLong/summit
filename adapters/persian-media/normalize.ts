import { Claim } from '../../active-measures-module/narratives/schema';

export type RawPost = {
  source: string;
  externalId: string;
  textNormalized: string;
  channelKey: string;
  evidenceId: string;
};

function stableId(source: string, externalId: string): string {
  return `CLAIM:${source}:${externalId}`;
}

export function normalizePersianPost(raw: RawPost): Claim {
  return {
    id: stableId(raw.source, raw.externalId),
    stance: "neutral", // To be inferred
    emotionalTone: "neutral", // To be inferred
    text: raw.textNormalized,
    evidenceIds: [raw.evidenceId],
  };
}
