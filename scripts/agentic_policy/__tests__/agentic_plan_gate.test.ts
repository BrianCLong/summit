import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const SCRIPT_PATH = path.resolve(__dirname, '../agentic_plan_gate.ts');
const TEMP_DIR = path.resolve(__dirname, 'temp_test_env');

describe('Agentic Plan Gate', () => {
  beforeAll(() => {
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR);
    }
    // Copy config and script to temp dir or just run from original location but cwd in temp dir
    // We need config.json to be loadable. The script looks in __dirname/config.json.
    // So we should run the script from its original location, but set cwd to TEMP_DIR.
  });

  afterAll(() => {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  });

  beforeEach(() => {
    // clean temp dir
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    fs.mkdirSync(TEMP_DIR);
  });

  test('fails/warns when PLAN.md is missing', () => {
    try {
      execSync(`npx tsx ${SCRIPT_PATH}`, { cwd: TEMP_DIR, encoding: 'utf-8' });
    } catch (e: any) {
      // It might exit 0 or 1 depending on config.json mode.
      // Default is 'warn', so it should exit 0 but print violation.
      // Wait, the script loads config from ITS OWN directory.
      // scripts/agentic_policy/config.json says "warn". So exit 0.
    }

    // Check artifacts
    const reportPath = path.join(TEMP_DIR, 'artifacts/agentic_policy/report.json');
    expect(fs.existsSync(reportPath)).toBe(true);
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
    expect(report.violations).toEqual(expect.arrayContaining([
      expect.objectContaining({ rule: 'MISSING_PLAN' })
    ]));
  });

  test('passes when PLAN.md exists and is valid', () => {
    const planContent = `
# Goal
Do stuff
# Constraints
None
# Verification
Check it
    `;
    fs.writeFileSync(path.join(TEMP_DIR, 'PLAN.md'), planContent);

    const output = execSync(`npx tsx ${SCRIPT_PATH}`, { cwd: TEMP_DIR, encoding: 'utf-8' });

    const reportPath = path.join(TEMP_DIR, 'artifacts/agentic_policy/report.json');
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
    expect(report.status).toBe('pass');
    expect(report.violations).toHaveLength(0);
  });

  test('detects TODOs in changed files', () => {
    const planContent = `
# Goal
Do stuff
# Constraints
None
# Verification
Check it
    `;
    fs.writeFileSync(path.join(TEMP_DIR, 'PLAN.md'), planContent);
    fs.writeFileSync(path.join(TEMP_DIR, 'test_code.ts'), 'console.log("foo"); // TODO: fix this');

    // We pass the filename as arg
    execSync(`npx tsx ${SCRIPT_PATH} test_code.ts`, { cwd: TEMP_DIR, encoding: 'utf-8' });

    const reportPath = path.join(TEMP_DIR, 'artifacts/agentic_policy/report.json');
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));

    // Should warn about TODO
    expect(report.violations).toEqual(expect.arrayContaining([
      expect.objectContaining({ rule: 'LEFTOVER_TODO', file: 'test_code.ts' })
    ]));
  });
});
