import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { execSync } from 'child_process';

// Deterministic UUID generation based on content hash
// This ensures SBOM is reproducible across builds
const generateDeterministicUUID = (seed: string): string => {
  const hash = createHash('sha256').update(seed).digest('hex');
  // Format as UUID v5 (namespace-based, deterministic)
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    '5' + hash.slice(13, 16), // version 5
    ((parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80).toString(16) + hash.slice(18, 20),
    hash.slice(20, 32),
  ].join('-');
};

// Get deterministic timestamp from SOURCE_DATE_EPOCH or git
const getDeterministicTimestamp = (): string => {
  // Use SOURCE_DATE_EPOCH if set (for reproducible builds)
  if (process.env.SOURCE_DATE_EPOCH) {
    const epoch = parseInt(process.env.SOURCE_DATE_EPOCH, 10);
    return new Date(epoch * 1000).toISOString();
  }

  // Fallback to git commit timestamp for determinism
  try {
    const gitTimestamp = execSync('git log -1 --pretty=format:%ct', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'] // suppress stderr
    }).trim();
    if (gitTimestamp) {
      const epoch = parseInt(gitTimestamp, 10);
      return new Date(epoch * 1000).toISOString();
    }
  } catch (error) {
    // Git not available or not in a git repo
  }

  // Final fallback: fixed timestamp for determinism in non-git environments
  return '2024-01-01T00:00:00.000Z';
};

// Minimal SBOM generator (CycloneDX format simulation)
// In a real scenario, this would use a tool like @cyclonedx/cdxgen
const generateSBOM = () => {
  // Generate deterministic seed from package name and version
  const seed = 'intelgraph-platform@2.0.0';

  const sbom = {
    bomFormat: 'CycloneDX',
    specVersion: '1.4',
    serialNumber: `urn:uuid:${generateDeterministicUUID(seed)}`,
    version: 1,
    metadata: {
      timestamp: getDeterministicTimestamp(),
      tools: [
        {
          vendor: 'IntelGraph',
          name: 'SBOM Generator',
          version: '1.0.0',
        },
      ],
      component: {
        type: 'application',
        name: 'intelgraph-platform',
        version: '2.0.0',
      },
    },
    components: [], // Populated from package.json in real implementation
  };

  const outputPath = path.resolve(process.cwd(), '.evidence/sbom.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(sbom, null, 2));
  console.log(`SBOM generated at ${outputPath}`);
};

// Execute generation
generateSBOM();
