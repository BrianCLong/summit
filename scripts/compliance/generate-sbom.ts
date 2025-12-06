#!/usr/bin/env npx tsx
/**
 * P29: Software Bill of Materials (SBOM) Generator
 * Generates CycloneDX and SPDX format SBOMs for compliance
 */

import { execSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '../..');
const OUTPUT_DIR = join(ROOT_DIR, 'sbom');

interface SBOMConfig {
  format: 'cyclonedx' | 'spdx' | 'both';
  includeDevDeps: boolean;
  includeContainers: boolean;
  outputDir: string;
  organizationName: string;
  organizationUrl: string;
}

interface PackageInfo {
  name: string;
  version: string;
  license: string;
  description?: string;
  homepage?: string;
  repository?: string;
  author?: string;
  dependencies?: Record<string, string>;
  purl?: string;
  hashes?: { algorithm: string; content: string }[];
}

interface CycloneDXBOM {
  bomFormat: 'CycloneDX';
  specVersion: string;
  serialNumber: string;
  version: number;
  metadata: {
    timestamp: string;
    tools: { vendor: string; name: string; version: string }[];
    component: { type: string; name: string; version: string };
    manufacture?: { name: string; url?: string[] };
  };
  components: CycloneDXComponent[];
  dependencies: { ref: string; dependsOn: string[] }[];
}

interface CycloneDXComponent {
  type: string;
  'bom-ref': string;
  name: string;
  version: string;
  description?: string;
  licenses?: { license: { id?: string; name?: string } }[];
  purl?: string;
  externalReferences?: { type: string; url: string }[];
  hashes?: { alg: string; content: string }[];
}

const DEFAULT_CONFIG: SBOMConfig = {
  format: 'both',
  includeDevDeps: false,
  includeContainers: true,
  outputDir: OUTPUT_DIR,
  organizationName: 'Summit Platform',
  organizationUrl: 'https://github.com/BrianCLong/summit',
};

function loadConfig(): SBOMConfig {
  const configPath = join(ROOT_DIR, '.sbom-config.json');
  if (existsSync(configPath)) {
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    return { ...DEFAULT_CONFIG, ...config };
  }
  return DEFAULT_CONFIG;
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getProjectInfo(): { name: string; version: string } {
  const pkgPath = join(ROOT_DIR, 'package.json');
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    return {
      name: pkg.name || 'summit',
      version: pkg.version || '0.0.0',
    };
  }
  return { name: 'summit', version: '0.0.0' };
}

function getAllPackages(includeDevDeps: boolean): PackageInfo[] {
  console.log('Collecting package information...');

  const args = ['list', '--json', '--depth=Infinity'];
  if (!includeDevDeps) {
    args.push('--prod');
  }

  const result = spawnSync('pnpm', args, {
    cwd: ROOT_DIR,
    encoding: 'utf-8',
    maxBuffer: 50 * 1024 * 1024,
  });

  const packages: PackageInfo[] = [];
  const seen = new Set<string>();

  try {
    const data = JSON.parse(result.stdout || '[]');

    function extractPackages(deps: Record<string, unknown> | undefined, type: string) {
      if (!deps) return;

      for (const [name, info] of Object.entries(deps)) {
        const pkg = info as { version?: string; from?: string; dependencies?: Record<string, unknown> };
        const version = pkg.version || (typeof pkg.from === 'string' ? pkg.from.split('@').pop() : 'unknown');
        const key = `${name}@${version}`;

        if (!seen.has(key)) {
          seen.add(key);
          packages.push({
            name,
            version: version || 'unknown',
            license: 'UNKNOWN', // Will be enriched later
            purl: `pkg:npm/${name.replace('@', '%40')}@${version}`,
          });
        }

        // Recurse into nested dependencies
        if (pkg.dependencies) {
          extractPackages(pkg.dependencies, 'transitive');
        }
      }
    }

    // Process each workspace
    for (const workspace of Array.isArray(data) ? data : [data]) {
      extractPackages(workspace.dependencies, 'runtime');
      if (includeDevDeps) {
        extractPackages(workspace.devDependencies, 'development');
      }
    }
  } catch (error) {
    console.error('Error parsing pnpm list output:', error);
  }

  return packages;
}

function enrichPackageInfo(packages: PackageInfo[]): PackageInfo[] {
  console.log('Enriching package information with license data...');

  // Get license information
  const licenseResult = spawnSync('npx', ['license-checker', '--json', '--production'], {
    cwd: ROOT_DIR,
    encoding: 'utf-8',
    maxBuffer: 50 * 1024 * 1024,
  });

  const licenseMap = new Map<string, { license: string; repository?: string }>();

  try {
    const licenseData = JSON.parse(licenseResult.stdout || '{}');
    for (const [pkgKey, info] of Object.entries(licenseData as Record<string, unknown>)) {
      const pkgInfo = info as { licenses?: string; repository?: string };
      licenseMap.set(pkgKey, {
        license: pkgInfo.licenses || 'UNKNOWN',
        repository: pkgInfo.repository,
      });
    }
  } catch {
    console.warn('Could not parse license data');
  }

  return packages.map((pkg) => {
    const key = `${pkg.name}@${pkg.version}`;
    const licenseInfo = licenseMap.get(key);

    return {
      ...pkg,
      license: licenseInfo?.license || pkg.license,
      repository: licenseInfo?.repository || pkg.repository,
    };
  });
}

function generateCycloneDX(packages: PackageInfo[], config: SBOMConfig): CycloneDXBOM {
  const projectInfo = getProjectInfo();

  const bom: CycloneDXBOM = {
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    serialNumber: `urn:uuid:${generateUUID()}`,
    version: 1,
    metadata: {
      timestamp: new Date().toISOString(),
      tools: [
        {
          vendor: 'Summit',
          name: 'sbom-generator',
          version: '1.0.0',
        },
      ],
      component: {
        type: 'application',
        name: projectInfo.name,
        version: projectInfo.version,
      },
      manufacture: {
        name: config.organizationName,
        url: [config.organizationUrl],
      },
    },
    components: [],
    dependencies: [],
  };

  // Add components
  for (const pkg of packages) {
    const component: CycloneDXComponent = {
      type: 'library',
      'bom-ref': `pkg:npm/${pkg.name.replace('@', '%40')}@${pkg.version}`,
      name: pkg.name,
      version: pkg.version,
    };

    if (pkg.description) {
      component.description = pkg.description;
    }

    if (pkg.license && pkg.license !== 'UNKNOWN') {
      component.licenses = [
        {
          license: {
            id: pkg.license,
          },
        },
      ];
    }

    if (pkg.purl) {
      component.purl = pkg.purl;
    }

    if (pkg.repository) {
      component.externalReferences = [
        {
          type: 'vcs',
          url: pkg.repository,
        },
      ];
    }

    bom.components.push(component);
  }

  // Add dependencies (simplified - just root deps)
  bom.dependencies.push({
    ref: `pkg:npm/${projectInfo.name}@${projectInfo.version}`,
    dependsOn: packages.slice(0, 100).map((p) => p.purl!).filter(Boolean),
  });

  return bom;
}

function generateSPDX(packages: PackageInfo[], config: SBOMConfig): object {
  const projectInfo = getProjectInfo();

  return {
    spdxVersion: 'SPDX-2.3',
    dataLicense: 'CC0-1.0',
    SPDXID: 'SPDXRef-DOCUMENT',
    name: projectInfo.name,
    documentNamespace: `https://spdx.org/spdxdocs/${projectInfo.name}-${projectInfo.version}-${generateUUID()}`,
    creationInfo: {
      created: new Date().toISOString(),
      creators: [
        `Tool: summit-sbom-generator-1.0.0`,
        `Organization: ${config.organizationName}`,
      ],
    },
    packages: packages.map((pkg, index) => ({
      SPDXID: `SPDXRef-Package-${index}`,
      name: pkg.name,
      versionInfo: pkg.version,
      downloadLocation: pkg.repository || 'NOASSERTION',
      licenseConcluded: pkg.license !== 'UNKNOWN' ? pkg.license : 'NOASSERTION',
      licenseDeclared: pkg.license !== 'UNKNOWN' ? pkg.license : 'NOASSERTION',
      copyrightText: 'NOASSERTION',
      externalRefs: pkg.purl
        ? [
            {
              referenceCategory: 'PACKAGE-MANAGER',
              referenceType: 'purl',
              referenceLocator: pkg.purl,
            },
          ]
        : [],
    })),
    relationships: [
      {
        spdxElementId: 'SPDXRef-DOCUMENT',
        relatedSpdxElement: 'SPDXRef-Package-0',
        relationshipType: 'DESCRIBES',
      },
    ],
  };
}

async function main(): Promise<void> {
  const config = loadConfig();

  // Parse CLI arguments
  const args = process.argv.slice(2);
  if (args.includes('--cyclonedx')) config.format = 'cyclonedx';
  if (args.includes('--spdx')) config.format = 'spdx';
  if (args.includes('--dev')) config.includeDevDeps = true;

  const outputIndex = args.indexOf('--output');
  if (outputIndex !== -1 && args[outputIndex + 1]) {
    config.outputDir = args[outputIndex + 1];
  }

  console.log('========================================');
  console.log('     SBOM GENERATOR');
  console.log('========================================');
  console.log(`Format: ${config.format}`);
  console.log(`Include dev deps: ${config.includeDevDeps}`);
  console.log(`Output directory: ${config.outputDir}`);
  console.log('');

  // Ensure output directory exists
  if (!existsSync(config.outputDir)) {
    mkdirSync(config.outputDir, { recursive: true });
  }

  // Collect packages
  let packages = getAllPackages(config.includeDevDeps);
  console.log(`Found ${packages.length} packages`);

  // Enrich with license info
  packages = enrichPackageInfo(packages);

  const projectInfo = getProjectInfo();
  const timestamp = new Date().toISOString().split('T')[0];

  // Generate CycloneDX
  if (config.format === 'cyclonedx' || config.format === 'both') {
    const cyclonedx = generateCycloneDX(packages, config);
    const cyclonedxPath = join(
      config.outputDir,
      `${projectInfo.name}-${projectInfo.version}-sbom-cyclonedx.json`
    );
    writeFileSync(cyclonedxPath, JSON.stringify(cyclonedx, null, 2));
    console.log(`CycloneDX SBOM written to: ${cyclonedxPath}`);
  }

  // Generate SPDX
  if (config.format === 'spdx' || config.format === 'both') {
    const spdx = generateSPDX(packages, config);
    const spdxPath = join(
      config.outputDir,
      `${projectInfo.name}-${projectInfo.version}-sbom-spdx.json`
    );
    writeFileSync(spdxPath, JSON.stringify(spdx, null, 2));
    console.log(`SPDX SBOM written to: ${spdxPath}`);
  }

  // Generate summary
  const licenseBreakdown = new Map<string, number>();
  for (const pkg of packages) {
    const license = pkg.license || 'UNKNOWN';
    licenseBreakdown.set(license, (licenseBreakdown.get(license) || 0) + 1);
  }

  console.log('\n--- License Breakdown ---');
  const sortedLicenses = [...licenseBreakdown.entries()].sort((a, b) => b[1] - a[1]);
  for (const [license, count] of sortedLicenses.slice(0, 15)) {
    console.log(`  ${license}: ${count}`);
  }

  console.log('\n========================================');
  console.log('✅ SBOM generation complete');
  console.log('========================================');
}

main().catch((error) => {
  console.error('SBOM generation failed:', error);
  process.exit(1);
});
