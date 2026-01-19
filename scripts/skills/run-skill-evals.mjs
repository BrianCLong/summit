import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');
const evalsDir = path.join(rootDir, 'evals/skills');

console.log('Running Skill Evals...');

const skills = fs.readdirSync(evalsDir);
let totalErrors = 0;

for (const skill of skills) {
  const skillDir = path.join(evalsDir, skill);
  if (!fs.statSync(skillDir).isDirectory()) continue;

  const assertionsPath = path.join(skillDir, 'assertions.yaml');
  if (!fs.existsSync(assertionsPath)) continue;

  console.log(`\nTesting skill: ${skill}`);
  const assertions = yaml.load(fs.readFileSync(assertionsPath, 'utf8')).assertions;
  const casesDir = path.join(skillDir, 'cases');

  if (!fs.existsSync(casesDir)) {
      console.log('  No cases found.');
      continue;
  }

  const cases = fs.readdirSync(casesDir);

  for (const caseFile of cases) {
    const casePath = path.join(casesDir, caseFile);
    const content = fs.readFileSync(casePath, 'utf8');

    console.log(`  Case: ${caseFile}`);
    let caught = false;

    for (const assertion of assertions) {
      if (assertion.type === 'forbidden') {
        const regex = new RegExp(assertion.pattern);
        if (regex.test(content)) {
          console.log(`    ✅ Caught by assertion: ${assertion.id}`);
          caught = true;
        }
      }
    }

    if (!caught) {
      console.error(`    ❌ Case ${caseFile} was NOT caught by any assertion!`);
      totalErrors++;
    }
  }
}

if (totalErrors > 0) {
  console.error(`\nFAILED: ${totalErrors} cases were not caught.`);
  process.exit(1);
} else {
  console.log('\nSUCCESS: All bad cases were caught by skill assertions.');
}
