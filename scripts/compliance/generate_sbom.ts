import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';

// Minimal SBOM generator (CycloneDX format simulation)
// In a real scenario, this would use a tool like @cyclonedx/cdxgen
const generateSBOM = (outputDir?: string) => {
  const sbom = {
    bomFormat: 'CycloneDX',
    specVersion: '1.4',
    serialNumber: `urn:uuid:${randomUUID()}`,
    version: 1,
    metadata: {
      timestamp: new Date().toISOString(),
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

  const dir = outputDir ? outputDir : path.resolve(process.cwd(), '.evidence');
  const outputPath = path.join(dir, 'sbom.json');

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(sbom, null, 2));
  console.log(`SBOM generated at ${outputPath}`);
};

// Check if run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const outDir = args[0];
  generateSBOM(outDir);
}

export { generateSBOM };
