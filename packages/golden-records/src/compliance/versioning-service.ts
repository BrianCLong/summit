import { createHash } from "crypto";
import type { MasterRecord, RecordVersion } from "@intelgraph/mdm-core";

export class VersioningService {
  private versions: Map<string, RecordVersion[]> = new Map();

  recordVersion(record: MasterRecord, actor: string): RecordVersion {
    const history = this.versions.get(record.id.id) ?? [];
    const previous = history[history.length - 1];
    const checksum = this.computeChecksum(record.data);
    const diff = previous ? this.computeDiff(previous.data, record.data) : undefined;
    const version: RecordVersion = {
      version: history.length + 1,
      recordId: record.id.id,
      recordType: record.metadata.recordType ?? "unknown",
      tenantId: record.metadata.tenantId ?? "unknown",
      data: record.data,
      checksum,
      timestamp: new Date(),
      actor,
      diff,
    };

    this.versions.set(record.id.id, [...history, version]);
    return version;
  }

  getVersions(recordId: string): RecordVersion[] {
    return this.versions.get(recordId) ?? [];
  }

  latestChecksum(recordId: string): string | undefined {
    const versions = this.getVersions(recordId);
    return versions[versions.length - 1]?.checksum;
  }

  verifyCurrentData(recordId: string, data: Record<string, unknown>): boolean {
    const latest = this.latestChecksum(recordId);
    if (!latest) return true;
    return latest === this.computeChecksum(data);
  }

  private computeChecksum(data: Record<string, unknown>): string {
    return createHash("sha256").update(JSON.stringify(data)).digest("hex");
  }

  private computeDiff(
    previous: Record<string, unknown>,
    current: Record<string, unknown>
  ): Record<string, { previous: unknown; current: unknown }> {
    const diff: Record<string, { previous: unknown; current: unknown }> = {};
    const fields = new Set([...Object.keys(previous), ...Object.keys(current)]);

    fields.forEach((field) => {
      const before = previous[field];
      const after = current[field];
      if (JSON.stringify(before) !== JSON.stringify(after)) {
        diff[field] = { previous: before, current: after };
      }
    });

    return diff;
  }
}
