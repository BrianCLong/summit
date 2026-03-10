import fs from 'fs';
import path from 'path';

const EVIDENCE_DIR = path.resolve(process.cwd(), '.evidence');

const generateSbom = () => {
  if (!fs.existsSync(EVIDENCE_DIR)) {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  }

  const sbomContent = JSON.stringify({
    bomFormat: "CycloneDX",
    specVersion: "1.4",
    serialNumber: "urn:uuid:mock-sbom-id",
    version: 1,
    metadata: {
      timestamp: new Date().toISOString(),
      tools: [
        {
          vendor: "Intelgraph",
          name: "SBOM Generator",
          version: "1.0.0"
        }
      ]
    },
    components: []
  }, null, 2);

  fs.writeFileSync(path.join(EVIDENCE_DIR, 'sbom.json'), sbomContent);
  console.log('✅ Mock SBOM generated.');
};

generateSbom();
