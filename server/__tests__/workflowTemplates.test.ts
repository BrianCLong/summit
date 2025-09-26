import type { Pool } from 'pg';
import { WorkflowTemplateRepo } from '../src/repos/WorkflowTemplateRepo.js';
import { ArgoWorkflowService } from '../src/services/workflows/ArgoWorkflowService.js';

describe('WorkflowTemplateRepo', () => {
  const fixedDate = new Date('2024-01-01T00:00:00.000Z');

  function createMockPool(response: any): Pool {
    return {
      query: jest.fn().mockResolvedValue(response),
    } as unknown as Pool;
  }

  it('creates workflow templates and maps database rows', async () => {
    const mockRow = {
      id: '11111111-2222-3333-4444-555555555555',
      tenant_id: 'tenant-1',
      name: 'Ingest Twitter Feed',
      description: 'Pulls tweets for enrichment',
      argo_template: JSON.stringify({ metadata: { generateName: 'twitter-' }, spec: { entrypoint: 'main' } }),
      variables: JSON.stringify([{ name: 'feedUrl', required: true }]),
      created_by: 'analyst',
      created_at: fixedDate,
      updated_at: fixedDate,
    };

    const pool = createMockPool({ rows: [mockRow] });
    const repo = new WorkflowTemplateRepo(pool);

    const result = await repo.createTemplate(
      {
        tenantId: 'tenant-1',
        name: 'Ingest Twitter Feed',
        description: 'Pulls tweets for enrichment',
        argoTemplate: { metadata: { generateName: 'twitter-' }, spec: { entrypoint: 'main' } },
        variables: [{ name: 'feedUrl', required: true }],
      },
      'analyst',
    );

    expect((pool.query as jest.Mock).mock.calls[0][0]).toContain('INSERT INTO workflow_templates');
    expect(result).toEqual({
      id: mockRow.id,
      tenantId: mockRow.tenant_id,
      name: mockRow.name,
      description: mockRow.description,
      argoTemplate: { metadata: { generateName: 'twitter-' }, spec: { entrypoint: 'main' } },
      variables: [{ name: 'feedUrl', required: true, type: undefined, description: undefined, defaultValue: undefined }],
      createdBy: 'analyst',
      createdAt: fixedDate,
      updatedAt: fixedDate,
    });
  });

  it('lists templates for a tenant', async () => {
    const mockRows = [
      {
        id: 'aaaa1111-2222-3333-4444-555555555555',
        tenant_id: 'tenant-1',
        name: 'Template One',
        description: null,
        argo_template: { spec: { entrypoint: 'main' } },
        variables: [],
        created_by: 'analyst',
        created_at: fixedDate,
        updated_at: fixedDate,
      },
    ];

    const pool = createMockPool({ rows: mockRows });
    const repo = new WorkflowTemplateRepo(pool);

    const results = await repo.listTemplates('tenant-1', 10, 0);

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT * FROM workflow_templates'),
      ['tenant-1', 10, 0],
    );
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Template One');
  });
});

describe('ArgoWorkflowService', () => {
  it('returns a dry-run response when no base URL configured', async () => {
    const service = new ArgoWorkflowService();
    const result = await service.submitWorkflow({ metadata: {}, spec: {} }, {
      variables: { source: 's3://bucket/path' },
    });

    expect(result.status).toBe('DRY_RUN');
    expect(result.workflow).toEqual({
      template: { metadata: {}, spec: {} },
      variables: { source: 's3://bucket/path' },
    });
  });

  it('submits workflows to Argo when configured', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ metadata: { name: 'workflow-abc' } }),
    });

    const service = new ArgoWorkflowService({
      baseUrl: 'https://argo.example.com',
      namespace: 'intel',
      authToken: 'token123',
      fetchImpl: fetchMock as any,
    });

    const template = { metadata: {}, spec: { arguments: { parameters: [{ name: 'existing', value: 'keep' }] } } };
    const result = await service.submitWorkflow(template, {
      runName: 'ingest-twitter',
      variables: { feedUrl: 'https://twitter.com' },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://argo.example.com/api/v1/workflows/intel');
    expect(init.headers.Authorization).toBe('Bearer token123');

    const payload = JSON.parse(init.body);
    expect(payload.workflow.metadata.generateName).toBe('ingest-twitter-');
    expect(payload.workflow.spec.arguments.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'existing', value: 'keep' }),
        expect.objectContaining({ name: 'feedUrl', value: 'https://twitter.com' }),
      ]),
    );

    expect(result).toEqual({
      runId: 'workflow-abc',
      status: 'SUBMITTED',
      submittedAt: expect.any(Date),
      workflow: { metadata: { name: 'workflow-abc' } },
    });
  });
});
