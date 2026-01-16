import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ONBOARDING_DIR = path.join(__dirname, '../../docs/enterprise/onboarding');

function lintDocs() {
  const requiredFiles = [
    'day-0-planning.md',
    'day-1-deploy.md',
    'day-30-operate.md',
    'operator-checklist.md'
  ];

  let hasError = false;

  // 1. Check file existence
  requiredFiles.forEach(file => {
    const filePath = path.join(ONBOARDING_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Missing required file: ${file}`);
      hasError = true;
    } else {
      console.log(`✅ Found ${file}`);

      // 2. Simple content check
      const content = fs.readFileSync(filePath, 'utf8');

      if (content.trim().length === 0) {
        console.error(`❌ File is empty: ${file}`);
        hasError = true;
      }

      // Check for required sections (basic heuristic)
      if (file.includes('day-')) {
        if (!content.includes('# Day')) {
           console.error(`❌ ${file} missing title '# Day ...'`);
           hasError = true;
        }
      }
    }
  });

  if (hasError) {
    process.exit(1);
  }
  console.log('✅ All onboarding docs passed linting.');
}

lintDocs();
