import path from "node:path";
import { runConnectorFromFixtures } from "../packages/connector-sdk/src/runner.js";

const dirs = [
  path.resolve("connectors/examples/whois"),
  path.resolve("connectors/examples/crtsh")
];

for (const connectorDir of dirs) {
  const result = await runConnectorFromFixtures({ connectorDir });
  console.log(`REPLAY OK: ${result.output.connector_id} -> ${result.output.run_id}`);
}
