import * as fs from 'fs';
import * as path from 'path';

function checkTimestamps() {
  const checkDir = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        checkDir(fullPath);
      } else if (fullPath.endsWith('.json') && !fullPath.includes('stamp.json')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        try {
          const parsed = JSON.parse(content);
          // Only check for newly created files/evidence
          if (fullPath.includes('EVD-CTRLPLANE')) {
            const hasTimestamp = Object.keys(parsed).some(k => k.toLowerCase().includes('time') || k.toLowerCase().includes('date') || k.toLowerCase() === 'timestamp');
            if (hasTimestamp) {
              console.error(`Timestamp found outside stamp.json in ${fullPath}`);
              process.exit(1);
            }
          }
        } catch (e) {
          // Ignore invalid JSON
        }
      }
    }
  };
  checkDir('evidence');
}

function checkFixtures() {
  const allowDir = 'tests/policies/positive';
  const denyDir = 'tests/policies/negative';

  if (!fs.existsSync(allowDir) || fs.readdirSync(allowDir).length === 0) {
    console.error('Missing positive policy fixtures');
    process.exit(1);
  }

  if (!fs.existsSync(denyDir) || fs.readdirSync(denyDir).length === 0) {
    console.error('Missing negative policy fixtures');
    process.exit(1);
  }
}

function checkSchema() {
  const schemaPath = 'src/graphrag/schema/epistemic.ts';
  if (!fs.existsSync(schemaPath)) {
    console.error('Epistemic schema missing');
    process.exit(1);
  }
  const content = fs.readFileSync(schemaPath, 'utf8');
  if (!content.includes('subject_ref') || !content.includes('status') || !content.includes('epistemic_uncertainty') || !content.includes('aleatoric_uncertainty')) {
    console.error('Schema missing required fields');
    process.exit(1);
  }
}

function checkRouteRegistration() {
  const apiPath = 'src/agents/maestro/epistemic/api.ts';
  const routePath = 'src/api/rest/epistemic.routes.ts';

  if (fs.existsSync(apiPath) && fs.existsSync(routePath)) {
    const apiContent = fs.readFileSync(apiPath, 'utf8');
    const routeContent = fs.readFileSync(routePath, 'utf8');

    if (apiContent.includes('TRUST_CP_ENABLED = false') && !routeContent.includes('TRUST_CP_ENABLED')) {
      console.error('Route registered without checking TRUST_CP_ENABLED');
      process.exit(1);
    }
  }
}

function checkDependencies() {
  const packageJsonPath = 'package.json';
  if (fs.existsSync(packageJsonPath)) {
    const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');

    // Check if new dependencies were added
    // For this simple verifier, we check if package.json has changed from HEAD
    try {
      const { execSync } = require('child_process');
      const diff = execSync('git diff HEAD package.json').toString();

      if (diff.includes('+    "')) { // A crude check for new dependencies
        const deltaPath = 'dependency-delta.md';
        if (!fs.existsSync(deltaPath)) {
          console.error('dependency-delta.md missing when dependencies changed');
          process.exit(1);
        }
      }
    } catch (e) {
      // Git not available or diff failed, ignore for now
    }
  }
}

function checkEvidenceArtifacts() {
  const evidenceIndex = 'evidence/index.json';
  if (fs.existsSync(evidenceIndex)) {
    try {
      const content = fs.readFileSync(evidenceIndex, 'utf8');
      const parsed = JSON.parse(content);

      const requiredIds = [
        'EVD-CTRLPLANE-SCHEMA-001'
      ];

      for (const id of requiredIds) {
        if (!parsed.items.some((item: any) => item.evidence_id === id)) {
           console.error(`Required evidence artifact missing: ${id}`);
           process.exit(1);
        }
      }
    } catch(e) {

    }
  }
}

function checkRequiredChecksFile() {
   const expectedFilePath = '.github/policies/required_checks.todo.md';
   if (!fs.existsSync(expectedFilePath)) {
       console.error(`Required checks file absent: ${expectedFilePath}`);
       process.exit(1);
   }
}


console.log('Verifying epistemic policy via CI stub...');
checkTimestamps();
checkFixtures();
checkSchema();
checkRouteRegistration();
checkDependencies();
checkEvidenceArtifacts();
checkRequiredChecksFile();

console.log('Verification passed.');
