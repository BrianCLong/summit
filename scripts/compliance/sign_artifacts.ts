import fs from 'fs';
import path from 'path';
import { randomBytes, createHmac } from 'crypto';

const ARTIFACT_DIR = path.resolve(process.cwd(), '.evidence/signature');
const INPUT_DIR = path.resolve(process.cwd(), '.evidence');

// Mock private key for simulation
const PRIVATE_KEY_MOCK = process.env.SIGNING_KEY || 'mock-private-key-12345';

const signArtifacts = () => {
  // Ensure artifact directory exists
  if (!fs.existsSync(ARTIFACT_DIR)) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  }

  // Files to sign (simulate signing the SBOM)
  const filesToSign = ['sbom.json'];

  filesToSign.forEach(file => {
    const filePath = path.join(INPUT_DIR, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath);
      const signature = createHmac('sha256', PRIVATE_KEY_MOCK).update(content).digest('hex');

      const sigPath = path.join(ARTIFACT_DIR, `${file}.sig`);
      fs.writeFileSync(sigPath, signature);
      console.log(`Signed ${file}: ${sigPath}`);
    } else {
      console.warn(`File to sign not found: ${filePath}`);
    }
  });
};

signArtifacts();
