import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, test } from 'vitest';
import { runWorkflowSpec } from '../../src/workflows/runner';

const baseWorkflow = {
  inputs: {
    case_id: 'mws_case1',
    media_path: 'fixtures/mws_case1/input/media/example.jpg',
    hints: {
      suspected_location_text: 'Kyiv, Ukraine',
      suspected_date_range: ['2024-02-01', '2024-02-10'],
    },
  },
  evidence: { evid_prefix: 'EVID', out_dir: '' },
  policy: {
    network: 'deny' as const,
    connectors: { allowlist: [] as string[] },
  },
  steps: [
    { id: 'frame_extract', type: 'reverse_image', mode: 'offline_fixture' as const, fixture: 'fixtures/mws_case1/input/reverse_image_results.json' },
    { id: 'archive_intent', type: 'archive', mode: 'offline_fixture' as const, fixture: 'fixtures/mws_case1/input/archive_results.json' },
    { id: 'geo_hints', type: 'geolocate_hint', mode: 'offline_fixture' as const, fixture: 'fixtures/mws_case1/input/geolocate_matches.json' },
    { id: 'chrono_shadow', type: 'chronolocate_shadow', mode: 'offline_fixture' as const, fixture: 'fixtures/mws_case1/input/chronolocate_candidates.json' },
  ],
};

describe('evidence determinism', () => {
  test('writes stable report/provenance/metrics/stamp across runs', () => {
    const outRoot = mkdtempSync(join(tmpdir(), 'mws-evidence-'));

    const workflow = { ...baseWorkflow, evidence: { ...baseWorkflow.evidence, out_dir: outRoot } };
    const bundle1 = runWorkflowSpec(workflow, '20260226');
    const bundle2 = runWorkflowSpec(workflow, '20260226');

    const files = ['report.json', 'provenance.json', 'metrics.json', 'stamp.json'];
    for (const file of files) {
      const a = readFileSync(join(outRoot, bundle1.evid, file), 'utf8');
      const b = readFileSync(join(outRoot, bundle2.evid, file), 'utf8');
      expect(a).toEqual(b);
      expect(a.includes('generated_at')).toBe(false);
    }

    rmSync(outRoot, { recursive: true, force: true });
  });
});
