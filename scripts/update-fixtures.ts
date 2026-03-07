import fs from "node:fs";
import path from "node:path";
import { runConnectorFromFixtures } from "../packages/connector-sdk/src/runner.ts";

async function update() {
  const dirs = [
    path.resolve("connectors/examples/whois"),
    path.resolve("connectors/examples/crtsh")
  ];

  for (const connectorDir of dirs) {
    const { output, evidence } = await runConnectorFromFixtures({ connectorDir });

    fs.writeFileSync(
      path.join(connectorDir, "fixtures", "output.json"),
      JSON.stringify(output, null, 2) + "\n"
    );

    fs.writeFileSync(
      path.join(connectorDir, "fixtures", "evidence.json"),
      JSON.stringify(evidence, null, 2) + "\n"
    );

    console.log(`Updated fixtures for ${output.connector_id}`);
  }
}

update();
