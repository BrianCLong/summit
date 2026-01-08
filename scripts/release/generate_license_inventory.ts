import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');
const LICENSE_CONFIG_PATH = path.join(rootDir, 'policy/license-inventory.json');

interface SpdxPackage {
  name: string;
  versionInfo: string;
}

interface SpdxDocument {
  packages: SpdxPackage[];
}

interface LicenseEntry {
  package: string;
  version: string;
  license: string;
  source: string;
}

function main() {
  const sbomPath = path.join(rootDir, 'dist/evidence/sbom/sbom.normalized.json');

  if (!fs.existsSync(sbomPath)) {
    console.error(`Error: SBOM not found at ${sbomPath}`);
    process.exit(1);
  }

  // Load manual overrides
  let knownLicenses: Record<string, string> = {};
  if (fs.existsSync(LICENSE_CONFIG_PATH)) {
    try {
        const content = fs.readFileSync(LICENSE_CONFIG_PATH, 'utf-8');
        const entries: {package: string, license: string}[] = JSON.parse(content);
        entries.forEach(e => knownLicenses[e.package] = e.license);
        console.log(`Loaded ${entries.length} license overrides from ${LICENSE_CONFIG_PATH}`);
    } catch (e) {
        console.error(`Error reading license config: ${e}`);
    }
  } else {
    console.warn(`Warning: License config not found at ${LICENSE_CONFIG_PATH}`);
  }

  const sbomContent = fs.readFileSync(sbomPath, 'utf-8');
  const sbom: SpdxDocument = JSON.parse(sbomContent);

  const inventory: LicenseEntry[] = sbom.packages.map(pkg => {
    let license = "UNKNOWN";
    let source = "Inferred (Missing node_modules)";

    if (knownLicenses[pkg.name]) {
      license = knownLicenses[pkg.name];
      source = "Static Allowlist (policy/license-inventory.json)";
    }

    return {
      package: pkg.name,
      version: pkg.versionInfo,
      license: license,
      source: source
    };
  });

  // Sort
  inventory.sort((a, b) => a.license.localeCompare(b.license) || a.package.localeCompare(b.package));

  const outDir = path.join(rootDir, 'dist/evidence/licenses');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const licPath = path.join(outDir, 'license-inventory.json');
  fs.writeFileSync(licPath, JSON.stringify(inventory, null, 2));
  console.log(`License inventory written to ${licPath}`);
}

main();
