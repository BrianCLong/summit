import * as fs from 'fs';
import * as path from 'path';

const FORBIDDEN_FIELDS = [
  'vendor_employee_ssn',
  'vendor_employee_passport',
  'vendor_employee_home_address',
  'vendor_employee_personal_email',
  'vendor_employee_dob',
  // Add other PII fields related to vendor employees
];

const TARGET_DIRS = [
  'src/graphrag/scel',
  'fixtures/scel', // Assuming fixtures might be here or in evidence/fixtures
];

function walkDir(dir: string, callback: (filePath: string) => void) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

let hasErrors = false;

TARGET_DIRS.forEach(dir => {
  if (!fs.existsSync(dir)) {
    console.log(`Directory ${dir} does not exist, skipping.`);
    return;
  }

  console.log(`Scanning ${dir}...`);
  walkDir(dir, (filePath) => {
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.json')) return;

    const content = fs.readFileSync(filePath, 'utf-8');
    FORBIDDEN_FIELDS.forEach(field => {
      if (content.includes(field)) {
        console.error(`ERROR: Found forbidden field '${field}' in ${filePath}`);
        hasErrors = true;
      }
    });
  });
});

if (hasErrors) {
  process.exit(1);
} else {
  console.log('Data minimization verification passed.');
}
