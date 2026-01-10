import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

// Minimal SBOM generator (CycloneDX format simulation)
// In a real scenario, this would use a tool like @cyclonedx/cdxgen
const generateSBOM = () => {
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

  const outputPath = path.resolve(process.cwd(), '.evidence/sbom.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(sbom, null, 2));
  console.log(`SBOM generated at ${outputPath}`);
};

// Execute generation
generateSBOM();
