export interface SnapshotStamp {
  snapshot_id: string; // SNAP:WARCOP:YYYYMMDDHHmm
  as_of_utc: string;
  source_count: number;
  claim_count: number;
  deterministic_build: true;
}
