import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

describe('GSV CLI', () => {
  it('should show help', () => {
    const output = execSync('npx tsx src/index.ts --help', { cwd: path.resolve(__dirname, '..') }).toString();
    expect(output).toContain('gsv');
    expect(output).toContain('attest-verify');
  });

  it('should generate a policy', () => {
    const provPath = path.resolve(__dirname, '../test-fixtures/provenance.json');
    const outPath = path.resolve(__dirname, '../test-fixtures/generated-policy.json');

    mkdirSync(path.dirname(provPath), { recursive: true });
    fs.writeFileSync(provPath, JSON.stringify({
      subject: [{ name: "artifact", digest: { sha256: "123" } }],
      predicate: { builder: { id: "test-builder" } }
    }));

    execSync(`npx tsx src/index.ts attest-policy-gen -p ${provPath} -o ${outPath}`, { cwd: path.resolve(__dirname, '..') });

    expect(fs.existsSync(outPath)).toBe(true);
    const policy = JSON.parse(fs.readFileSync(outPath, 'utf8'));
    expect(policy.builderId).toBe('test-builder');
  });
});

function mkdirSync(dir: string, options: any) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, options);
}
