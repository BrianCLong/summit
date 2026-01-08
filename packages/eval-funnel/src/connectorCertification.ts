import { ConnectorCertificationResult, ConnectorContract } from "./types";

export class ConnectorCertificationHarness {
  constructor(private readonly schemaVersion: string) {}

  async certify(connectors: ConnectorContract[]): Promise<ConnectorCertificationResult[]> {
    const results: ConnectorCertificationResult[] = [];
    for (const connector of connectors) {
      const execution = await connector.run();
      results.push({
        name: connector.name,
        passed: execution.passed,
        schemaVersion: connector.schemaVersion || this.schemaVersion,
        details: execution.details,
      });
    }
    this.assertCompatibility(results);
    return results;
  }

  private assertCompatibility(results: ConnectorCertificationResult[]): void {
    const mismatches = results.filter((result) => result.schemaVersion !== this.schemaVersion);
    if (mismatches.length) {
      const names = mismatches.map((m) => `${m.name}@${m.schemaVersion}`).join(", ");
      throw new Error(`Connector schema mismatch: expected ${this.schemaVersion}, found ${names}`);
    }
  }
}
