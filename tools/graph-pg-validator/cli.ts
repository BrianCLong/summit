#!/usr/bin/env node
import { runChecks } from "./lib/driver";
import { writeJsonDeterministic } from "./lib/io";
import { closePg } from "./lib/pg";
import { closeNeo4j } from "./lib/neo4j";
import { countsCheck } from "./checks/counts";
import { referentialCheck } from "./checks/referential";
import { propertyChecksumCheck } from "./checks/properties";
import { schemaParityCheck } from "./checks/schema";

(async () => {
  const mappings = [{ table: "customer", label: "Customer" }];

  try {
    const results = await runChecks([
      () => countsCheck(mappings),
      () => referentialCheck(),
      () => propertyChecksumCheck(),
      () => schemaParityCheck(),
    ]);

    writeJsonDeterministic("artifacts/validation/validation-result.json", results);

    await closePg();
    await closeNeo4j();

    process.exit(results.hard_failures > 0 ? 2 : 0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
