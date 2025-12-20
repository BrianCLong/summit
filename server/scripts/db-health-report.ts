import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  formatDbHealthReport,
  generateDbHealthReport,
} from '../src/db/dbHealth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : undefined;

  const report = await generateDbHealthReport({ limit });
  const output = formatDbHealthReport(report);

  console.log(output);
}

main().catch((error) => {
  console.error('Failed to generate DB health report:', error);
  process.exitCode = 1;
});
