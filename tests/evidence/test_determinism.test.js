"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_os_1 = require("node:os");
const vitest_1 = require("vitest");
const runner_1 = require("../../src/workflows/runner");
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
        network: 'deny',
        connectors: { allowlist: [] },
    },
    steps: [
        { id: 'frame_extract', type: 'reverse_image', mode: 'offline_fixture', fixture: 'fixtures/mws_case1/input/reverse_image_results.json' },
        { id: 'archive_intent', type: 'archive', mode: 'offline_fixture', fixture: 'fixtures/mws_case1/input/archive_results.json' },
        { id: 'geo_hints', type: 'geolocate_hint', mode: 'offline_fixture', fixture: 'fixtures/mws_case1/input/geolocate_matches.json' },
        { id: 'chrono_shadow', type: 'chronolocate_shadow', mode: 'offline_fixture', fixture: 'fixtures/mws_case1/input/chronolocate_candidates.json' },
    ],
};
(0, vitest_1.describe)('evidence determinism', () => {
    (0, vitest_1.test)('writes stable report/provenance/metrics/stamp across runs', () => {
        const outRoot = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), 'mws-evidence-'));
        const workflow = { ...baseWorkflow, evidence: { ...baseWorkflow.evidence, out_dir: outRoot } };
        const bundle1 = (0, runner_1.runWorkflowSpec)(workflow, '20260226');
        const bundle2 = (0, runner_1.runWorkflowSpec)(workflow, '20260226');
        const files = ['report.json', 'provenance.json', 'metrics.json', 'stamp.json'];
        for (const file of files) {
            const a = (0, node_fs_1.readFileSync)((0, node_path_1.join)(outRoot, bundle1.evid, file), 'utf8');
            const b = (0, node_fs_1.readFileSync)((0, node_path_1.join)(outRoot, bundle2.evid, file), 'utf8');
            (0, vitest_1.expect)(a).toEqual(b);
            (0, vitest_1.expect)(a.includes('generated_at')).toBe(false);
        }
        (0, node_fs_1.rmSync)(outRoot, { recursive: true, force: true });
    });
});
