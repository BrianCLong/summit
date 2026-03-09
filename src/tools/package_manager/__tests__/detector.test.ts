import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { detectPackageManager } from '../detector';

describe('detectPackageManager', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'summit-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should detect from env var', () => {
    const result = detectPackageManager({
      env: { SUMMIT_PACKAGE_MANAGER: 'pnpm' },
    });
    expect(result).toBe('pnpm');
  });

  it('should detect from .claude/package-manager.json', () => {
    fs.mkdirSync(path.join(tmpDir, '.claude'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, '.claude', 'package-manager.json'),
      JSON.stringify({ packageManager: 'yarn' })
    );
    const result = detectPackageManager({ cwd: tmpDir });
    expect(result).toBe('yarn');
  });

  it('should detect from package.json', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ packageManager: 'pnpm@9.0.0' })
    );
    const result = detectPackageManager({ cwd: tmpDir });
    expect(result).toBe('pnpm');
  });

  it('should detect from lockfiles', () => {
    fs.writeFileSync(path.join(tmpDir, 'pnpm-lock.yaml'), '');
    const result = detectPackageManager({ cwd: tmpDir });
    expect(result).toBe('pnpm');
  });

  it('should fallback to npm', () => {
    const result = detectPackageManager({ cwd: tmpDir });
    expect(result).toBe('npm');
  });
});
