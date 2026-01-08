import path from "node:path";
import { fileURLToPath } from "node:url";
import { runContractTests } from "./harness.js";

async function main(): Promise<void> {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const fixtureAdapter = path.resolve(currentDir, "fixtures/sample-adapter.js");
  const result = await runContractTests(fixtureAdapter);

  if (!result.passed) {
    result.issues.forEach((issue) => {
      // eslint-disable-next-line no-console
      console.error(`✖ ${issue}`);
    });
    process.exit(1);
  }

  // eslint-disable-next-line no-console
  console.log("✔ Contract harness passed using fixture adapter");
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(result.response, null, 2));
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
