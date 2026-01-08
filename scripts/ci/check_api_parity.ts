import fs from "fs";
import yaml from "js-yaml";
import path from "path";

const SPEC_PATH = "docs/api-spec.yaml";

async function checkApiParity() {
  console.log("Checking API Parity...");

  if (!fs.existsSync(SPEC_PATH)) {
    console.error(`❌ FAIL: Spec file not found at ${SPEC_PATH}`);
    process.exit(1);
  }

  const specContent = fs.readFileSync(SPEC_PATH, "utf8");
  const spec = yaml.load(specContent) as any;
  const specPaths = Object.keys(spec.paths || {});

  // List of expected paths (in a real scenario, we would parse the route files)
  // For this sprint, we enforce that our *new* endpoints are present.
  const requiredPaths = [
    "/analytics/forecast",
    "/reports/generate",
    "/auth/login",
    "/maestro/runs",
  ];

  const missingPaths = requiredPaths.filter((p) => !specPaths.includes(p));

  if (missingPaths.length > 0) {
    console.error(
      "❌ FAIL: The following required paths are missing from OpenAPI spec:",
      missingPaths
    );
    process.exit(1);
  }

  // Check for versioning info
  if (!spec.info.version) {
    console.error("❌ FAIL: API version is missing from spec.");
    process.exit(1);
  }

  console.log("✅ PASS: API Spec parity check passed for critical paths.");
}

checkApiParity();
