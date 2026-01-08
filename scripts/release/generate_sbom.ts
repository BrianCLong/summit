import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

interface SpdxPackage {
  name: string;
  versionInfo: string;
  SPDXID: string;
  downloadLocation: string;
  licenseConcluded: string;
}

interface SpdxDocument {
  spdxVersion: string;
  dataLicense: string;
  SPDXID: string;
  name: string;
  documentNamespace: string;
  creationInfo: {
    created: string;
    creators: string[];
  };
  packages: SpdxPackage[];
}

function cleanVersion(version: string): string {
  return version.replace(/^[\^~]/, '');
}

function generateSpdxId(name: string, version: string): string {
  const cleanName = name.replace(/[^a-zA-Z0-9.-]/g, '-');
  const cleanVer = version.replace(/[^a-zA-Z0-9.-]/g, '-');
  return `SPDXRef-Package-${cleanName}-${cleanVer}`;
}

function parseLockfile(lockPath: string): SpdxPackage[] {
  if (!fs.existsSync(lockPath)) {
    console.error(`Lockfile not found at ${lockPath}`);
    return [];
  }
  const content = fs.readFileSync(lockPath, 'utf-8');
  const lock = JSON.parse(content);
  const packagesMap = new Map<string, SpdxPackage>();

  // Helper to add pkg
  const addPkg = (name: string, version: string) => {
    // pnpm lockfile v9 keys are like "/package@version" or "package@version"
    // We need to parse name and version carefully
    let pkgName = name;
    let pkgVer = version;

    // Clean up pnpm specific version strings if needed
    // In "packages" object of lockfile v9, keys are often full paths like "/@babel/core@7.23.0"

    const key = `${pkgName}@${pkgVer}`;
    if (packagesMap.has(key)) return;

    const spdxId = generateSpdxId(pkgName, pkgVer);
    packagesMap.set(key, {
      name: pkgName,
      versionInfo: pkgVer,
      SPDXID: spdxId,
      downloadLocation: "NOASSERTION",
      licenseConcluded: "NOASSERTION"
    });
  };

  // Iterate over 'packages' (the store)
  if (lock.packages) {
    for (const [key, _val] of Object.entries(lock.packages)) {
      // Key format varies. Usually "/name@version" or "registry.npmjs.org/name/version"
      // Simple parser: try to extract name and version from key
      // Example: "/@babel/code-frame@7.24.7" -> name: @babel/code-frame, version: 7.24.7

      let name = '';
      let version = '';

      if (key.startsWith('/')) {
        const parts = key.slice(1).split('@');
        // last part is version, rest is name (handle scoped packages like @foo/bar)
        version = parts.pop()!;
        name = parts.join('@');
      } else {
         // Fallback or complex cases
         // Attempt to find version at the end
         const match = key.match(/(.*)@(.*)$/);
         if (match) {
            name = match[1];
            version = match[2];
         }
      }

      if (name && version) {
        addPkg(name, version);
      }
    }
  }

  // Also check importers (root deps) just in case
  if (lock.importers) {
     for (const importer of Object.values(lock.importers) as any[]) {
        if (importer.dependencies) {
           for (const [name, spec] of Object.entries(importer.dependencies)) {
              // spec might be object or string
              let version = typeof spec === 'string' ? spec : (spec as any).version;
               if (version) addPkg(name, version);
           }
        }
        if (importer.devDependencies) {
            for (const [name, spec] of Object.entries(importer.devDependencies)) {
              let version = typeof spec === 'string' ? spec : (spec as any).version;
               if (version) addPkg(name, version);
           }
        }
     }
  }

  return Array.from(packagesMap.values());
}

function main() {
  const lockJsonPath = process.argv[2] || path.join(rootDir, 'temp-lock.json');
  console.log(`Generating SBOM from ${lockJsonPath}...`);

  const packages = parseLockfile(lockJsonPath);

  // Normalize by sorting
  packages.sort((a, b) =>
    a.name.localeCompare(b.name) || a.versionInfo.localeCompare(b.versionInfo)
  );

  const spdxDoc: SpdxDocument = {
    spdxVersion: "SPDX-2.3",
    dataLicense: "CC0-1.0",
    SPDXID: "SPDXRef-DOCUMENT",
    name: "intelgraph-platform",
    documentNamespace: `http://spdx.org/spdxdocs/intelgraph-platform-${new Date().toISOString()}`,
    creationInfo: {
      created: new Date().toISOString(),
      creators: ["Tool: IntelGraph SBOM Generator (Lockfile)"]
    },
    packages: packages
  };

  const outDir = path.join(rootDir, 'dist/evidence/sbom');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const sbomPath = path.join(outDir, 'sbom.spdx.json');
  fs.writeFileSync(sbomPath, JSON.stringify(spdxDoc, null, 2));
  console.log(`SBOM written to ${sbomPath} (${packages.length} packages)`);

  // Normalized
  const normalizedDoc = { ...spdxDoc };
  normalizedDoc.creationInfo = {
    ...normalizedDoc.creationInfo,
    created: "1970-01-01T00:00:00.000Z"
  };
  normalizedDoc.documentNamespace = "http://spdx.org/spdxdocs/intelgraph-platform-baseline";

  const normPath = path.join(outDir, 'sbom.normalized.json');
  fs.writeFileSync(normPath, JSON.stringify(normalizedDoc, null, 2));
}

main();
