import * as fs from 'fs';
import * as path from 'path';

function verifyFileExists(filePath: string) {
  if (!fs.existsSync(filePath)) {
    console.error(`Missing expected artifact: ${filePath}`);
    process.exit(1);
  }
  console.log(`Found ${filePath}`);
}

verifyFileExists(path.resolve(__dirname, '../../artifacts/schemas/agent-report.schema.json'));
verifyFileExists(path.resolve(__dirname, '../../artifacts/schemas/agent-metrics.schema.json'));
verifyFileExists(path.resolve(__dirname, '../../artifacts/schemas/agent-stamp.schema.json'));
console.log('Artifact schemas verified.');
