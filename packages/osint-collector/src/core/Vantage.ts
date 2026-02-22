export interface VantageProfile {
  id: string;
  name: string;
  userAgent: string;
  proxy?: string | null;
  labels: string[];
  authRequired?: boolean;
}

export interface VantageReport {
  vantageId: string;
  servedAt: string;
  statusCode: number;
  latencyMs: number;
  fingerprint: string;
  contentHash: string;
}

export class VantageManager {
  /**
   * Generates a response fingerprint for a given vantage execution.
   */
  public static generateFingerprint(headers: Record<string, string>, body: string): string {
    // Simplified fingerprinting: focus on server headers and body length/structure
    const serverHeader = headers['server'] || 'unknown';
    const contentType = headers['content-type'] || 'unknown';
    const bodyLength = body.length;

    return `srv:${serverHeader}|type:${contentType}|len:${bodyLength}`;
  }

  /**
   * Identifies variance between multiple vantage reports.
   */
  public static detectVariance(reports: VantageReport[]): boolean {
    if (reports.length < 2) return false;

    const firstHash = reports[0].contentHash;
    return reports.some(r => r.contentHash !== firstHash);
  }
}
