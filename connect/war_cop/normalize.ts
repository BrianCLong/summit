import { RawIntelRecord } from "./config";

export function normalizeRecord(raw: RawIntelRecord) {
  return {
    id: `EVID:WARCOP:${raw.source}:${raw.external_id}`,
    ...raw,
  };
}
