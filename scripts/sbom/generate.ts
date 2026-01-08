import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const ROOT_DIR = path.resolve(__dirname, "../../");
const OUTPUT_FILE = path.join(ROOT_DIR, "sbom.json");

console.log("Generating SBOM...");

try {
  // Use npx @cyclonedx/cdxgen to generate SBOM
  // We use --fail-on-error to ensure we know if it fails
  // We exclude dev dependencies for the production SBOM usually, but for supply chain we might want all.
  // Using --no-recurse to speed it up if needed, but we want full graph.
  // Note: cdxgen might try to fetch data.
  execSync(`npx @cyclonedx/cdxgen -r . -o ${OUTPUT_FILE} --fail-on-error`, {
    stdio: "inherit",
    cwd: ROOT_DIR,
    env: { ...process.env, CI: "true" }, // Avoid interactive prompts
  });
  console.log(`SBOM generated at ${OUTPUT_FILE}`);
} catch (error) {
  console.error("Failed to generate SBOM:", error);
  process.exit(1);
}
