import fs from 'node:fs';
import path from 'node:path';

const BUDGET_FILES = ['performance-budgets.json', 'integrity-budgets.json'];

function validateBudget(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  if (!data || typeof data !== 'object') {
    throw new Error(`Budget file ${filePath} is not a JSON object.`);
  }
  if (!data.global || typeof data.global !== 'object') {
    throw new Error(`Budget file ${filePath} missing global section.`);
  }
  if (!data.endpoints || typeof data.endpoints !== 'object') {
    throw new Error(`Budget file ${filePath} missing endpoints section.`);
  }
  const endpointKeys = Object.keys(data.endpoints);
  if (endpointKeys.length === 0) {
    throw new Error(`Budget file ${filePath} has no endpoint budgets.`);
  }
}

function main() {
  const existing = BUDGET_FILES.map((file) => path.resolve(process.cwd(), file)).filter((file) =>
    fs.existsSync(file),
  );

  if (existing.length === 0) {
    console.log('No integrity budget files present; skipping integrity budgets gate.');
    return;
  }

  existing.forEach((file) => {
    validateBudget(file);
  });

  console.log(`Integrity budgets verified. Files: ${existing.length}`);
}

main();
