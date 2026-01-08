import {
  CrossRegionSyncService,
  MockMessageBroker,
} from "../../server/src/lib/state/cross-region-sync.js";
import { GCounter, CRDTFactory } from "../../server/src/lib/state/conflict-resolver.js";

async function main() {
  console.log("--- Starting DR Failover Simulation ---");
  console.log("Scenario: Primary Region (us-east-1) goes down.");

  const broker = new MockMessageBroker();
  const primaryRegion = new CrossRegionSyncService("us-east-1", broker);
  const secondaryRegion = new CrossRegionSyncService("us-west-2", broker);

  const key = "active_sessions";
  const factory: CRDTFactory<GCounter> = {
    create: () => new GCounter("temp"),
    fromJSON: (json) => GCounter.fromJSON(json),
  };

  // 1. Initial State
  primaryRegion.registerCRDT(key, new GCounter("us-east-1"), factory);
  secondaryRegion.registerCRDT(key, new GCounter("us-west-2"), factory);

  const pCounter = primaryRegion.getCRDT(key) as GCounter;
  pCounter.increment(100);
  await primaryRegion.sync(key);

  // Simulate propagation
  await new Promise((r) => setTimeout(r, 100));

  const sCounter = secondaryRegion.getCRDT(key) as GCounter;
  console.log(`Initial State: Primary=${pCounter.value}, Secondary=${sCounter.value}`);
  if (sCounter.value !== 100) throw new Error("Initial sync failed");

  // 2. Simulate Failure
  console.log("!!! SIMULATING OUTAGE in us-east-1 !!!");
  // In a real scenario, we'd stop the primary process or block network
  // Here we just stop using it

  // 3. Failover Trigger
  console.log("Detected health check failure (simulated). Triggering DNS update...");
  console.log("Redirecting traffic to us-west-2...");

  // 4. Operations in Secondary Region
  console.log("Traffic now hitting us-west-2. Incrementing sessions...");
  sCounter.increment(50);
  await secondaryRegion.sync(key); // Attempt sync (might fail if primary down, but secondary keeps working)

  console.log(`Secondary State during outage: ${sCounter.value}`);
  if (sCounter.value !== 150) throw new Error("Secondary region failed to operate independently");

  // 5. Recovery
  console.log("!!! SIMULATING RECOVERY of us-east-1 !!!");
  console.log("Primary region back online. Resuming sync...");

  // Primary comes back and receives the update from secondary (eventually)
  // We simulate this by having primary "catch up"
  await primaryRegion.sync(key); // Force sync to ensure subscription is active/processed
  await secondaryRegion.sync(key); // Secondary broadcasts its state

  await new Promise((r) => setTimeout(r, 100));

  const pRecovered = primaryRegion.getCRDT(key) as GCounter;
  console.log(`Primary State after recovery: ${pRecovered.value}`);

  if (pRecovered.value !== 150) throw new Error("Primary failed to catch up after recovery");

  console.log("--- DR Simulation PASSED ---");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
