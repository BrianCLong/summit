import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const ROOT_DIR = path.resolve(__dirname, "../../");
// Allow overriding SBOM file via env var for testing
let SBOM_FILE = path.join(ROOT_DIR, "sbom.json");

// Policy definition
const BLOCKED_LICENSES = ["GPL-3.0", "AGPL-3.0", "WTFPL"];
const REQUIRED_FIELDS = ["name", "version", "purl"];

interface Component {
  name: string;
  version: string;
  licenses?: Array<{ license: { id?: string; name?: string } }>;
  purl?: string;
  type?: string;
}

interface SBOM {
  components: Component[];
}

export function checkPolicy(exitOnFail = true): boolean {
  if (process.env.SBOM_FILE_PATH) {
    SBOM_FILE = process.env.SBOM_FILE_PATH;
  }

  if (!fs.existsSync(SBOM_FILE)) {
    console.error(`SBOM file not found at ${SBOM_FILE}. Run generation script first.`);
    if (exitOnFail) process.exit(1);
    return false;
  }

  const sbomContent = fs.readFileSync(SBOM_FILE, "utf-8");
  let sbom: SBOM;
  try {
    sbom = JSON.parse(sbomContent);
  } catch (e) {
    console.error("Invalid JSON in SBOM file");
    if (exitOnFail) process.exit(1);
    return false;
  }

  let errors: string[] = [];
  let licenseCounts: Record<string, number> = {};

  // Check Lockfile Consistency
  // Skip this check in test environment if we are running against a fixture SBOM without real repo context
  if (!process.env.SBOM_FILE_PATH) {
    try {
      // Check if pnpm lockfile is consistent
      console.log("Checking lockfile consistency...");
      execSync("pnpm install --frozen-lockfile --ignore-scripts --dry-run", {
        cwd: ROOT_DIR,
        stdio: "ignore",
      });
    } catch (e) {
      errors.push(
        "Lockfile is inconsistent with package.json (pnpm install --frozen-lockfile failed)"
      );
    }
  }

  if (!sbom.components) {
    console.log("No components found in SBOM.");
    return true;
  }

  sbom.components.forEach((component) => {
    // Check Licenses
    if (component.licenses) {
      component.licenses.forEach((l) => {
        const licenseId = l.license.id || l.license.name;
        if (licenseId) {
          licenseCounts[licenseId] = (licenseCounts[licenseId] || 0) + 1;
          if (BLOCKED_LICENSES.includes(licenseId)) {
            errors.push(
              `Blocked license ${licenseId} found in component ${component.name}@${component.version}`
            );
          }
        }
      });
    }

    // Check required fields
    REQUIRED_FIELDS.forEach((field) => {
      if (!(field in component)) {
        if (component.type !== "operating-system") {
          errors.push(`Component ${component.name} missing required field ${field}`);
        }
      }
    });

    // Check Unpinned Versions (Ranges)
    // If version contains typical range characters, flag it.
    // SBOM generators usually resolve versions, so seeing a range here is bad.
    const rangeChars = ["^", "~", ">", "<", "*", "x"];
    if (component.version && rangeChars.some((char) => component.version.includes(char))) {
      errors.push(`Unpinned version '${component.version}' found in component ${component.name}`);
    }
  });

  console.log("License Summary:", licenseCounts);

  if (errors.length > 0) {
    console.error("Policy Violations Found:");
    errors.forEach((err) => console.error(`- ${err}`));
    if (exitOnFail) process.exit(1);
    return false;
  } else {
    console.log("SBOM Policy Check Passed.");
    return true;
  }
}

// Only run if called directly
if (process.argv[1] === __filename || process.argv[1].endsWith("policy.ts")) {
  checkPolicy();
}
