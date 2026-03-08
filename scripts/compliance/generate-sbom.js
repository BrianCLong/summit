#!/usr/bin/env npx tsx
"use strict";
/**
 * P29: Software Bill of Materials (SBOM) Generator
 * Generates CycloneDX and SPDX format SBOMs for compliance
 */
Object.defineProperty(exports, "__esModule", { value: true });
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_url_1 = require("node:url");
const __dirname = (0, node_path_1.dirname)((0, node_url_1.fileURLToPath)(import.meta.url));
const ROOT_DIR = (0, node_path_1.join)(__dirname, '../..');
const OUTPUT_DIR = (0, node_path_1.join)(ROOT_DIR, 'sbom');
const DEFAULT_CONFIG = {
    format: 'both',
    includeDevDeps: false,
    includeContainers: true,
    outputDir: OUTPUT_DIR,
    organizationName: 'Summit Platform',
    organizationUrl: 'https://github.com/BrianCLong/summit',
};
function loadConfig() {
    const configPath = (0, node_path_1.join)(ROOT_DIR, '.sbom-config.json');
    if ((0, node_fs_1.existsSync)(configPath)) {
        const config = JSON.parse((0, node_fs_1.readFileSync)(configPath, 'utf-8'));
        return { ...DEFAULT_CONFIG, ...config };
    }
    return DEFAULT_CONFIG;
}
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
function getProjectInfo() {
    const pkgPath = (0, node_path_1.join)(ROOT_DIR, 'package.json');
    if ((0, node_fs_1.existsSync)(pkgPath)) {
        const pkg = JSON.parse((0, node_fs_1.readFileSync)(pkgPath, 'utf-8'));
        return {
            name: pkg.name || 'summit',
            version: pkg.version || '0.0.0',
        };
    }
    return { name: 'summit', version: '0.0.0' };
}
function getAllPackages(includeDevDeps) {
    console.log('Collecting package information...');
    const args = ['list', '--json', '--depth=Infinity'];
    if (!includeDevDeps) {
        args.push('--prod');
    }
    const result = (0, node_child_process_1.spawnSync)('pnpm', args, {
        cwd: ROOT_DIR,
        encoding: 'utf-8',
        maxBuffer: 50 * 1024 * 1024,
    });
    const packages = [];
    const seen = new Set();
    try {
        const data = JSON.parse(result.stdout || '[]');
        function extractPackages(deps, type) {
            if (!deps)
                return;
            for (const [name, info] of Object.entries(deps)) {
                const pkg = info;
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
    }
    catch (error) {
        console.error('Error parsing pnpm list output:', error);
    }
    return packages;
}
function enrichPackageInfo(packages) {
    console.log('Enriching package information with license data...');
    // Get license information
    const licenseResult = (0, node_child_process_1.spawnSync)('npx', ['license-checker', '--json', '--production'], {
        cwd: ROOT_DIR,
        encoding: 'utf-8',
        maxBuffer: 50 * 1024 * 1024,
    });
    const licenseMap = new Map();
    try {
        const licenseData = JSON.parse(licenseResult.stdout || '{}');
        for (const [pkgKey, info] of Object.entries(licenseData)) {
            const pkgInfo = info;
            licenseMap.set(pkgKey, {
                license: pkgInfo.licenses || 'UNKNOWN',
                repository: pkgInfo.repository,
            });
        }
    }
    catch {
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
function generateCycloneDX(packages, config) {
    const projectInfo = getProjectInfo();
    const bom = {
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
        const component = {
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
        dependsOn: packages.slice(0, 100).map((p) => p.purl).filter(Boolean),
    });
    return bom;
}
function generateSPDX(packages, config) {
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
async function main() {
    const config = loadConfig();
    // Parse CLI arguments
    const args = process.argv.slice(2);
    if (args.includes('--cyclonedx'))
        config.format = 'cyclonedx';
    if (args.includes('--spdx'))
        config.format = 'spdx';
    if (args.includes('--dev'))
        config.includeDevDeps = true;
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
    if (!(0, node_fs_1.existsSync)(config.outputDir)) {
        (0, node_fs_1.mkdirSync)(config.outputDir, { recursive: true });
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
        const cyclonedxPath = (0, node_path_1.join)(config.outputDir, `${projectInfo.name}-${projectInfo.version}-sbom-cyclonedx.json`);
        (0, node_fs_1.writeFileSync)(cyclonedxPath, JSON.stringify(cyclonedx, null, 2));
        console.log(`CycloneDX SBOM written to: ${cyclonedxPath}`);
    }
    // Generate SPDX
    if (config.format === 'spdx' || config.format === 'both') {
        const spdx = generateSPDX(packages, config);
        const spdxPath = (0, node_path_1.join)(config.outputDir, `${projectInfo.name}-${projectInfo.version}-sbom-spdx.json`);
        (0, node_fs_1.writeFileSync)(spdxPath, JSON.stringify(spdx, null, 2));
        console.log(`SPDX SBOM written to: ${spdxPath}`);
    }
    // Generate summary
    const licenseBreakdown = new Map();
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
