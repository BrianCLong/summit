import fs from 'fs';
import path from 'path';

const RESULTS_DIR = path.resolve(process.cwd(), '.evidence/results');
const SBOM_PATH = path.resolve(process.cwd(), '.evidence/sbom.json');
const SIG_PATH = path.resolve(process.cwd(), '.evidence/signature/sbom.json.sig');

const mockScan = () => {
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }

  // Verify artifacts exist
  const sbomPresent = fs.existsSync(SBOM_PATH);
  const sigPresent = fs.existsSync(SIG_PATH);

  const scanResult = {
    sbom_present: sbomPresent,
    signature_present: sigPresent,
    vulnerabilities_critical: false,
    scan_timestamp: new Date().toISOString(),
    details: { high: 0, critical: 0, medium: 0, low: 0 }
  };

  const outputPath = path.join(RESULTS_DIR, 'input.json');
  fs.writeFileSync(outputPath, JSON.stringify(scanResult, null, 2));
  console.log(`Scan result generated: ${outputPath}`);
};

mockScan();
