import { PlaybookRunBundleExporter } from '../PlaybookRunBundleExporter';
import { playbookRunManifestSchema } from '../../provenance/playbookRunManifest';

describe('PlaybookRunBundleExporter', () => {
  it('builds bundle entries with run logs, outputs, and provenance manifest', async () => {
    const query = jest
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

    const exporter = new PlaybookRunBundleExporter({ query } as any);
    const { entries, manifest } = await exporter.buildBundleEntries(
      'tenant-1',
      'run-1',
    );

    expect(entries.map((entry) => entry.name)).toEqual(
      expect.arrayContaining([
        'run-log.json',
        'outputs.json',
        'provenance-manifest.json',
      ]),
    );

    const manifestEntry = entries.find(
      (entry) => entry.name === 'provenance-manifest.json',
    );
    const logEntry = entries.find((entry) => entry.name === 'run-log.json');
    const outputEntry = entries.find((entry) => entry.name === 'outputs.json');

    expect(manifestEntry).toBeDefined();
    expect(logEntry).toBeDefined();
    expect(outputEntry).toBeDefined();

    const logPayload = JSON.parse(logEntry!.data);
    expect(logPayload).toMatchObject({
      runId: 'run-1',
      playbookId: 'playbook-1',
      caseId: 'case-22',
      triggeredBy: 'analyst-1',
      status: 'completed',
    });
    expect(logPayload.steps).toHaveLength(2);

    const outputsPayload = JSON.parse(outputEntry!.data);
    expect(outputsPayload).toMatchObject({
      context: { caseId: 'case-22' },
      result: { outcome: 'success' },
    });
    expect(outputsPayload.steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          stepId: 'step-1',
          status: 'completed',
          output: { message: 'done' },
        }),
        expect.objectContaining({
          stepId: 'step-2',
          status: 'completed',
          output: { summary: 'ok' },
        }),
      ]),
    );

    playbookRunManifestSchema.parse(manifest);
    const lineageEdges = manifest.provenance.edges.filter(
      (edge: { relation?: string }) => edge.relation === 'DERIVED_FROM',
    );
    expect(lineageEdges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceId: 'playbook-step:step-1',
          targetId: 'playbook-step:step-2',
          properties: expect.objectContaining({ lineage: 'step-order' }),
        }),
        expect.objectContaining({
          sourceId: 'playbook-step:step-1',
          targetId: 'playbook-step:step-2',
          properties: expect.objectContaining({ lineage: 'workflow' }),
        }),
      ]),
    );
  });
});
