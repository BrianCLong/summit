import { RawItem } from "./connectors/BaseConnector";

export function mapToCanonical(raw: RawItem) {
  return {
    title: raw.title || null,
    summary: raw.body?.slice(0, 500) || null,
    url: raw.url || null,
    publishedAt: raw.publishedAt ? new Date(raw.publishedAt) : null,
    language: raw.language || null,
    hash: raw.id,
    entities: [],
    claims: [],
  };
}

