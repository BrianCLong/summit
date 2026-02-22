import { SdgBuilder } from "../sdg/builder.js";
import path from "path";
import { fileURLToPath } from "url";
import assert from "assert";

// ESM dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fixturePath = path.join(__dirname, "../fixtures/sdg.json");

async function testBuilder() {
  console.log("Testing SdgBuilder...");
  const snapshot = SdgBuilder.fromFixture(fixturePath);

  assert.strictEqual(snapshot.version, "v0-fixture");
  assert.strictEqual(snapshot.nodes.length, 3);
  assert.strictEqual(snapshot.edges.length, 1);

  console.log("SdgBuilder test passed!");
}

testBuilder().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
