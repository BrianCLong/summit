import { AlertSink, DataQualityOptions, DataQualityRecord, QualityAlert } from "./types.js";

export interface DataQualityReport {
  table: string;
  freshnessViolation?: string;
  nullViolations: string[];
  duplicateViolations: string[];
  quarantined: DataQualityRecord[];
}

export class DataQualityGate {
  private readonly sink?: AlertSink;

  constructor(sink?: AlertSink) {
    this.sink = sink;
  }

  evaluate(
    table: string,
    records: DataQualityRecord[],
    options: DataQualityOptions
  ): DataQualityReport {
    const report: DataQualityReport = {
      table,
      nullViolations: [],
      duplicateViolations: [],
      quarantined: [],
    };

    if (options.freshnessMinutes) {
      const newest = this.findNewest(records);
      if (!newest || this.isStale(newest, options.freshnessMinutes)) {
        report.freshnessViolation = `Freshness breached: newest record older than ${options.freshnessMinutes} minutes`;
        this.notify({
          table,
          reason: report.freshnessViolation,
          severity: "critical",
          records,
        });
      }
    }

    if (options.requiredFields?.length) {
      for (const field of options.requiredFields) {
        const missing = records.filter(
          (record) => record[field] === null || record[field] === undefined
        );
        if (missing.length) {
          report.nullViolations.push(`Field ${field} has ${missing.length} nulls`);
          report.quarantined.push(...missing);
          this.notify({
            table,
            reason: `Field ${field} missing on ${missing.length} records`,
            severity: "warning",
            records: missing,
          });
        }
      }
    }

    if (options.dedupeKey) {
      const duplicates = this.findDuplicates(records, options.dedupeKey);
      if (duplicates.length) {
        report.duplicateViolations.push(
          `Duplicate ${options.dedupeKey} values: ${duplicates.join(", ")}`
        );
        report.quarantined.push(
          ...records.filter((record) => duplicates.includes(String(record[options.dedupeKey!])))
        );
        this.notify({
          table,
          reason: `Duplicate ${options.dedupeKey} detected`,
          severity: "warning",
          records: report.quarantined,
        });
      }
    }

    return report;
  }

  private findNewest(records: DataQualityRecord[]): DataQualityRecord | undefined {
    return records
      .filter((record) => record.updatedAt)
      .sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime())
      .at(0);
  }

  private isStale(record: DataQualityRecord, thresholdMinutes: number): boolean {
    if (!record.updatedAt) return true;
    const ageMinutes = (Date.now() - new Date(record.updatedAt).getTime()) / (1000 * 60);
    return ageMinutes > thresholdMinutes;
  }

  private findDuplicates(records: DataQualityRecord[], key: string): string[] {
    const counts = new Map<string, number>();
    records.forEach((record) => {
      const value = record[key];
      if (value !== undefined) {
        counts.set(String(value), (counts.get(String(value)) ?? 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .filter(([, count]) => count > 1)
      .map(([value]) => value);
  }

  private notify(alert: QualityAlert): void {
    this.sink?.sendAlert(alert);
  }
}
