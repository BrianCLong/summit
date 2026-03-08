"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectorCertificationHarness = void 0;
class ConnectorCertificationHarness {
    schemaVersion;
    constructor(schemaVersion) {
        this.schemaVersion = schemaVersion;
    }
    async certify(connectors) {
        const results = [];
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
    assertCompatibility(results) {
        const mismatches = results.filter((result) => result.schemaVersion !== this.schemaVersion);
        if (mismatches.length) {
            const names = mismatches.map((m) => `${m.name}@${m.schemaVersion}`).join(', ');
            throw new Error(`Connector schema mismatch: expected ${this.schemaVersion}, found ${names}`);
        }
    }
}
exports.ConnectorCertificationHarness = ConnectorCertificationHarness;
