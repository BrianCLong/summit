import { SnapshotStamp } from "./schema";

export function buildSnapshot(
  stampId: string,
  utc: string,
  sources: number,
  claims: number
): SnapshotStamp {
  return {
    snapshot_id: stampId,
    as_of_utc: utc,
    source_count: sources,
    claim_count: claims,
    deterministic_build: true,
  };
}
