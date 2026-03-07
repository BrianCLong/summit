import { ConcernRegistry } from '../../packages/concern-registry/src/registry';
import { normalizeConcern } from '../../packages/concern-registry/src/normalize';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Concern Registry Integration', () => {
  let tmpDir: string;
  let registry: ConcernRegistry;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'concern-registry-'));
    registry = new ConcernRegistry(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('normalizes concerns deterministically', () => {
    const c1 = normalizeConcern({ title: 'A', domain: 'D', type: 'T', source_signals: ['S2', 'S1'], evidence_refs: [], owner: 'O' });
    const c2 = normalizeConcern({ title: 'A', domain: 'D', type: 'T', source_signals: ['S1', 'S2'], evidence_refs: [], owner: 'O' });
    expect(c1.concern_id).toEqual(c2.concern_id);
    expect(c1.source_signals).toEqual(['S1', 'S2']);
  });

  it('registers concerns and updates index deterministically', () => {
    registry.register({ title: 'A', domain: 'D', type: 'T', source_signals: ['S1'], evidence_refs: [], owner: 'O' });
    registry.register({ title: 'B', domain: 'D', type: 'T', source_signals: ['S2'], evidence_refs: [], owner: 'O' });

    const indexStr = fs.readFileSync(path.join(tmpDir, 'index.json'), 'utf-8');
    const index = JSON.parse(indexStr);
    expect(index.concerns.length).toBe(2);
    expect(index.concerns[0].concern_id.localeCompare(index.concerns[1].concern_id)).toBeLessThanOrEqual(0);
  });
});
