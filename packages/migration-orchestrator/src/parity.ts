import crypto from "node:crypto";

export class ParityEngine {
  computeParity(entity, legacy, target, invariants, sampleSize = 5) {
    const countsMatch = legacy.length === target.length;
    const legacyHash = this.hashRecords(legacy);
    const targetHash = this.hashRecords(target);
    const hashMatch = legacyHash === targetHash;
    const sampleDrift = [];
    const invariantResults = [];

    for (let i = 0; i < Math.min(sampleSize, legacy.length); i++) {
      const record = legacy[i];
      const targetRecord = target.find((t) => t.id === record.id);
      if (!targetRecord) {
        sampleDrift.push({ id: record.id, legacy: record.payload, target: undefined });
        continue;
      }
      invariants.forEach((rule) => {
        const result = rule(record.payload, targetRecord.payload);
        invariantResults.push(result);
        if (!result.passed) {
          sampleDrift.push({ id: record.id, legacy: record.payload, target: targetRecord.payload });
        }
      });
    }

    const invariantPassRate =
      invariantResults.length === 0
        ? 1
        : invariantResults.filter((r) => r.passed).length / invariantResults.length;

    return { entity, countsMatch, hashMatch, invariantPassRate, sampleDrift };
  }

  hashRecords(records) {
    const hash = crypto.createHash("sha256");
    hash.update(JSON.stringify(records.sort((a, b) => a.id.localeCompare(b.id))));
    return hash.digest("hex");
  }
}
