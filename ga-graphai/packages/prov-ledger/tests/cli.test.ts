import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SimpleProvenanceLedger, createExportManifest } from '../src/index.js';
import { runCli } from '../src/cli.js';

describe('prov-ledger CLI', () => {
  const dir = mkdtempSync(join(tmpdir(), 'prov-ledger-'));

  function writeJson(name: string, data: unknown): string {
    const path = join(dir, name);
    writeFileSync(path, JSON.stringify(data));
    return path;
  }

  it('verifies manifests and inspects nodes', async () => {
    const ledger = new SimpleProvenanceLedger();
    ledger.append({
      id: 'n1',
      category: 'ingest',
      actor: 'alice',
      action: 'create',
      resource: 'file',
      payload: { size: 10 },
    });
    const manifest = createExportManifest({ caseId: 'case-1', ledger: ledger.list() });

    const manifestPath = writeJson('manifest.json', manifest);
    const ledgerPath = writeJson('ledger.json', ledger.list());
    let log = '';
    let error = '';
    const code = await runCli(['verify', manifestPath, ledgerPath], {
      log: (message) => {
        log = message;
      },
      error: (message) => {
        error = message;
      },
      exit: () => {},
    });

    expect(code).toBe(0);
    expect(log).toContain('pass');
    expect(error).toBe('');

    let inspectLog = '';
    const inspectCode = await runCli(['inspect', manifestPath, 'n1'], {
      log: (message) => {
        inspectLog = message;
      },
      error: () => {},
      exit: () => {},
    });

    expect(inspectCode).toBe(0);
    expect(inspectLog).toContain('n1');
  });

  it('returns failure codes for diff mismatches', async () => {
    const emptyPath = writeJson('empty.json', { transforms: [] });
    const missingPath = writeJson('missing.json', { transforms: [{ id: 'n2' }] });
    let message = '';
    const code = await runCli(
      ['diff', '--baseline', missingPath, '--target', emptyPath],
      {
        log: () => {},
        error: (msg) => {
          message = msg;
        },
        exit: () => {},
      },
    );

    expect(code).toBe(1);
    expect(message).toContain('missing nodes');
  });
});
