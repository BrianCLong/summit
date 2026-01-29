import { computePosture, PersistenceSignal } from "../src/posture.js";
import assert from "node:assert";

console.log("Testing posture model...");

// Case 1: No signals (baseline)
const baseline = computePosture([]);
assert.strictEqual(baseline.score, 40, "Baseline should be 40 (pessimistic)");

// Case 2: High severity signal
const highSev: PersistenceSignal[] = [{ id: "SIG-EDGE-NO-MONITOR-001", severity: "high", count: 1 }];
const resHigh = computePosture(highSev);
// Logic: if (s.severity === "high") score -= Math.min(20, s.count * 2);
// count=1 -> 2. 40 - 2 = 38.
assert.strictEqual(resHigh.score, 38, "Score should drop by 2 for high sev count 1");

// Case 3: Saturation
const heavy: PersistenceSignal[] = [{ id: "SIG-EDGE-NO-MONITOR-001", severity: "high", count: 50 }];
const resHeavy = computePosture(heavy);
// count=50 -> 100. min(20, 100) = 20. 40 - 20 = 20.
assert.strictEqual(resHeavy.score, 20, "Score should cap drop at 20 per signal type");

console.log("OK: Posture tests passed");
