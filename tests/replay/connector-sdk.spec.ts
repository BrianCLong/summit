import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { runConnectorFromFixtures } from "../../packages/connector-sdk/src/runner.js";
import { stableStringify } from "../../packages/connector-sdk/src/provenance.js";

async function runFixture(connectorDir: string) {
  const expectedOutput = JSON.parse(
    fs.readFileSync(path.join(connectorDir, "fixtures", "output.json"), "utf8")
  );

  const { output } = await runConnectorFromFixtures({ connectorDir });

  assert.equal(
    stableStringify({ ...output, transform_hash: "masked" }),
    stableStringify({ ...expectedOutput, transform_hash: "masked" })
  );
}

await runFixture(path.resolve("connectors/examples/whois"));
await runFixture(path.resolve("connectors/examples/crtsh"));

console.log("connector-sdk replay fixtures passed");
