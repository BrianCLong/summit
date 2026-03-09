import path from "node:path";
import { runConnectorFromFixtures } from "../packages/connector-sdk/src/runner.js";
import { stableStringify } from "../packages/connector-sdk/src/provenance.js";

const dirs = [
  path.resolve("connectors/examples/whois"),
  path.resolve("connectors/examples/crtsh")
];

for (const connectorDir of dirs) {
  const a = await runConnectorFromFixtures({ connectorDir });
  const b = await runConnectorFromFixtures({ connectorDir });

  const sa = stableStringify(a.output);
  const sb = stableStringify(b.output);

  if (sa !== sb) {
    console.error(`NON-DETERMINISTIC: ${a.output.connector_id}`);
    process.exit(1);
  }

  console.log(`DETERMINISTIC: ${a.output.connector_id}`);
}
