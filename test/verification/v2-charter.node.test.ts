
import { describe, it } from 'node:test';
import * as fs from 'fs';
import * as path from 'path';
import * as assert from 'assert';

const REPO_ROOT = process.cwd();

describe('V2 Charter Verification', () => {

  it('1. V2 Code Paths are Isolated (Sandbox exists and is distinct)', () => {
    const sandboxPath = path.join(REPO_ROOT, 'packages', 'v2-sandbox');
    assert.ok(fs.existsSync(sandboxPath), 'packages/v2-sandbox must exist');

    const readmePath = path.join(sandboxPath, 'README.md');
    assert.ok(fs.existsSync(readmePath), 'Sandbox must have a README defining isolation');

    const readmeContent = fs.readFileSync(readmePath, 'utf-8');
    assert.ok(readmeContent.includes('Isolation Rules'), 'Sandbox README must define Isolation Rules');
  });

  it('2. Inherited Contracts are Enforced (List exists)', () => {
    const contractsPath = path.join(REPO_ROOT, 'docs', 'v2', 'INHERITED_CONTRACTS.md');
    assert.ok(fs.existsSync(contractsPath), 'INHERITED_CONTRACTS.md must exist');

    const content = fs.readFileSync(contractsPath, 'utf-8');
    assert.ok(content.includes('docs/GOVERNANCE.md'), 'Must reference GOVERNANCE.md');
    assert.ok(content.includes('SECURITY.md'), 'Must reference SECURITY.md');
  });

  it('3. Change Class Declaration is Documented', () => {
    const classesPath = path.join(REPO_ROOT, 'docs', 'v2', 'CHANGE_CLASSES.md');
    assert.ok(fs.existsSync(classesPath), 'CHANGE_CLASSES.md must exist');

    const content = fs.readFileSync(classesPath, 'utf-8');
    assert.ok(content.includes('Class A'), 'Must define Class A');
    assert.ok(content.includes('Class B'), 'Must define Class B');
    assert.ok(content.includes('Class C'), 'Must define Class C');
  });

  it('4. Charter Exists and Defines Mission', () => {
    const charterPath = path.join(REPO_ROOT, 'docs', 'v2', 'CHARTER.md');
    assert.ok(fs.existsSync(charterPath), 'CHARTER.md must exist');

    const content = fs.readFileSync(charterPath, 'utf-8');
    assert.ok(content.includes('Mission Statement'), 'Charter must have a Mission Statement');
    assert.ok(content.includes('Non-Goals'), 'Charter must have Non-Goals');
  });

  it('5. Governance Extensions Exist', () => {
     const govPath = path.join(REPO_ROOT, 'docs', 'v2', 'GOVERNANCE_EXTENSIONS.md');
     assert.ok(fs.existsSync(govPath), 'GOVERNANCE_EXTENSIONS.md must exist');
  });

});
