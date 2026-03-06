import type { CogGeoWriteSet } from "../api/types";

export async function writeCogGeoArtifacts(writeSet: CogGeoWriteSet): Promise<void> {
  if (writeSet.writes.length === 0) {
    throw new Error("CogGeo write set must include at least one write.");
  }
}
