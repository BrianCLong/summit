import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { strict as assert } from 'assert';

const TEST_PROFILE = 'cloud_standard';
const ARTIFACTS_DIR = 'artifacts/deploy';

try {
  // Run the script
  const output = execSync(`node scripts/deploy/plan_deploy.mjs --profile ${TEST_PROFILE} --mode dry-run`, { encoding: 'utf8' });
  console.log(output);

  // Find the generated file
  const files = fs.readdirSync(ARTIFACTS_DIR);
  const planFile = files.find(f => f.startsWith(`PLAN_${TEST_PROFILE}`) && f.endsWith('.json'));
  assert(planFile, 'Plan file was not created');

  const planPath = path.join(ARTIFACTS_DIR, planFile);
  const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));

  // Assertions
  assert.equal(plan.profile.name, TEST_PROFILE, 'Profile name is incorrect');
  assert.equal(plan.mode, 'dry-run', 'Mode is incorrect');
  assert.equal(plan.steps.length, 3, 'Incorrect number of steps');
  assert.equal(plan.steps[1].name, 'Deploy with Docker Compose', 'Incorrect deployment step');
  assert(plan.steps[1].commands[0].includes('docker-compose'), 'Incorrect command');

  console.log('Test passed!');
} catch (error) {
  console.error('Test failed:', error);
  process.exit(1);
} finally {
    // Cleanup
    const files = fs.readdirSync(ARTIFACTS_DIR);
    files.forEach(file => {
        if(file.startsWith('PLAN_') || file.startsWith('RUN_')) {
            fs.unlinkSync(path.join(ARTIFACTS_DIR, file));
        }
    });
}
