import fs from 'fs';

const sbomPath = 'artifacts/sbom.json';
const slsaPath = 'artifacts/provenance.json';

if (!fs.existsSync(sbomPath)) {
  console.warn(`Warning: SBOM not found at ${sbomPath}`);
}

if (!fs.existsSync(slsaPath)) {
  console.warn(`Warning: SLSA provenance not found at ${slsaPath}`);
}

console.log('Supply chain verification complete (soft check).');
