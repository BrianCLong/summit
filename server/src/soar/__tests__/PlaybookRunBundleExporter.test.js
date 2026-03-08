"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const PlaybookRunBundleExporter_js_1 = require("../PlaybookRunBundleExporter.js");
const playbookRunManifest_js_1 = require("../../provenance/playbookRunManifest.js");
(0, globals_1.describe)('PlaybookRunBundleExporter', () => {
    (0, globals_1.it)('builds bundle entries with run logs, outputs, and provenance manifest', async () => {
        const query = globals_1.jest
            .fn()
            .mockResolvedValueOnce({
            rows: [
                {
                    id: 'run-1',
                    tenant_id: 'tenant-1',
                    playbook_id: 'playbook-1',
                    status: 'completed',
                    context: { caseId: 'case-22' },
                    steps_state: [
                        {
                            stepId: 'step-1',
                            status: 'completed',
                            startedAt: new Date('2026-01-01T00:00:00Z'),
                            completedAt: new Date('2026-01-01T00:01:00Z'),
                            output: { message: 'done' },
                        },
                        {
                            stepId: 'step-2',
                            status: 'completed',
                            startedAt: new Date('2026-01-01T00:02:00Z'),
                            completedAt: new Date('2026-01-01T00:03:00Z'),
                            output: { summary: 'ok' },
                        },
                    ],
                    result: { outcome: 'success' },
                    started_at: new Date('2026-01-01T00:00:00Z'),
                    completed_at: new Date('2026-01-01T00:03:00Z'),
                    error: null,
                    triggered_by: 'analyst-1',
                    case_id: 'case-22',
                },
            ],
        })
            .mockResolvedValueOnce({
            rows: [
                {
                    id: 'playbook-1',
                    tenant_id: 'tenant-1',
                    name: 'Containment Playbook',
                    description: 'Contain incident',
                    workflow: {
                        startStepId: 'step-1',
                        steps: [
                            {
                                id: 'step-1',
                                name: 'Collect logs',
                                type: 'action',
                                params: {},
                                nextStepId: 'step-2',
                            },
                            {
                                id: 'step-2',
                                name: 'Notify team',
                                type: 'action',
                                params: {},
                            },
                        ],
                    },
                    triggers: [],
                    is_active: true,
                    created_at: new Date('2025-12-31T00:00:00Z'),
                    updated_at: new Date('2025-12-31T00:00:00Z'),
                    created_by: 'analyst-1',
                    metadata: {},
                },
            ],
        });
        const exporter = new PlaybookRunBundleExporter_js_1.PlaybookRunBundleExporter({ query });
        const { entries, manifest } = await exporter.buildBundleEntries('tenant-1', 'run-1');
        (0, globals_1.expect)(entries.map((entry) => entry.name)).toEqual(globals_1.expect.arrayContaining([
            'run-log.json',
            'outputs.json',
            'provenance-manifest.json',
        ]));
        playbookRunManifest_js_1.playbookRunManifestSchema.parse(manifest);
        const lineageEdges = manifest.provenance.edges.filter((edge) => edge.relation === 'DERIVED_FROM');
        (0, globals_1.expect)(lineageEdges).toHaveLength(1);
        (0, globals_1.expect)(lineageEdges[0]).toMatchObject({
            sourceId: 'playbook-step:step-1',
            targetId: 'playbook-step:step-2',
        });
    });
});
