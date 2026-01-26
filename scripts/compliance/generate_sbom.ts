import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

/**
 * generate_sbom.ts
 * Minimal implementation of SBOM (CycloneDX v1.4) for GA compliance.
 * In a production environment, this should ideally be replaced by `cdxgen` or similar tool.
 * This script ensures a valid SBOM artifact is present for the release process.
 */

interface Component {
    type: string;
    name: string;
    version: string;
    purl?: string;
    scope?: string;
}

function getPackageJson() {
    try {
        const pkgPath = path.resolve('package.json');
        if (fs.existsSync(pkgPath)) {
            return JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        }
    } catch (e) {
        console.warn("Could not read package.json", e);
    }
    return { name: "intelgraph-platform", version: "0.0.0", dependencies: {} };
}

function generateSBOM() {
    const pkg = getPackageJson();
    const timestamp = new Date().toISOString();

    // Convert dependencies to components
    const components: Component[] = [];
    if (pkg.dependencies) {
        for (const [name, version] of Object.entries(pkg.dependencies)) {
            components.push({
                type: 'library',
                name: name,
                version: String(version).replace('^', '').replace('~', ''),
                purl: `pkg:npm/${name}@${String(version).replace('^', '').replace('~', '')}`,
                scope: 'required'
            });
        }
    }

    const sbom = {
        bomFormat: 'CycloneDX',
        specVersion: '1.4',
        serialNumber: `urn:uuid:${randomUUID()}`,
        version: 1,
        metadata: {
            timestamp: timestamp,
            tools: [
                {
                    vendor: 'IntelGraph',
                    name: 'Summit SBOM Generator',
                    version: '1.0.0',
                },
            ],
            component: {
                type: 'application',
                name: pkg.name || 'intelgraph-platform',
                version: pkg.version || '0.0.0',
                purl: `pkg:npm/${pkg.name}@${pkg.version}`
            },
        },
        components: components,
    };

    const outputDir = path.resolve('.evidence');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, 'sbom.json');
    fs.writeFileSync(outputPath, JSON.stringify(sbom, null, 2));
    console.log(`SBOM generated at ${outputPath}`);
}

// Execute generation
generateSBOM();
