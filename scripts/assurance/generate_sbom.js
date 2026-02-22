import fs from 'fs';
import path from 'path';

const packageJsonPath = path.resolve(process.cwd(), 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

const generateSPDX = () => {
  const date = '2026-01-23T00:00:00Z';
  const name = packageJson.name || 'summit';
  const version = packageJson.version || '0.0.0';

  const spdx = {
    spdxVersion: 'SPDX-2.3',
    dataLicense: 'CC0-1.0',
    SPDXID: 'SPDXRef-DOCUMENT',
    name: name,
    documentNamespace: `https://intelgraph.io/spdx/${name}-${version}`,
    creationInfo: {
      creators: ['Organization: IntelGraph', 'Tool: Summit-SBOM-Generator-v1.0.0'],
      created: date,
    },
    packages: [
      {
        name: name,
        SPDXID: 'SPDXRef-RootPackage',
        versionInfo: version,
        downloadLocation: 'NOASSERTION',
        filesAnalyzed: false,
        licenseConcluded: 'MIT',
        licenseDeclared: 'MIT',
        copyrightText: 'NOASSERTION',
        externalRefs: [
          {
            referenceCategory: 'PACKAGE-MANAGER',
            referenceType: 'purl',
            referenceLocator: `pkg:npm/${name}@${version}`,
          },
        ],
      },
    ],
  };

  // Add dependencies from package.json
  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  Object.entries(dependencies)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([depName, depVersion], index) => {
      spdx.packages.push({
        name: depName,
        SPDXID: `SPDXRef-Package-${index}`,
        versionInfo: depVersion.replace(/^\^|~/, ''),
        downloadLocation: 'NOASSERTION',
        filesAnalyzed: false,
        licenseConcluded: 'NOASSERTION',
        licenseDeclared: 'NOASSERTION',
        copyrightText: 'NOASSERTION',
        externalRefs: [
          {
            referenceCategory: 'PACKAGE-MANAGER',
            referenceType: 'purl',
            referenceLocator: `pkg:npm/${depName}@${depVersion.replace(/^\^|~/, '')}`,
          },
        ],
      });
    });

  return spdx;
};

const outputPath = process.argv[2] || 'dist/assurance/sbom/summit.spdx.json';
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(generateSPDX(), null, 2));
console.log(`Deterministic SBOM generated at ${outputPath}`);
