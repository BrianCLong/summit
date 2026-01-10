import { WorkflowEngine, type WorkflowDefinition } from '../WorkflowEngine.js';
import { quotaService } from '../../../quota/service.js';
import { resetTenantQuotaCache } from '../../../quota/config.js';

const buildWorkflow = (): WorkflowDefinition => ({
  id: 'wf-1',
  steps: [
    { id: 'step-1', tool: 'utils.echo', params: { value: 'one' } },
    { id: 'step-2', tool: 'utils.echo', params: { value: 'two' } },
  ],
});

describe('WorkflowEngine quota enforcement', () => {
  const quotaJson = JSON.stringify({
    tenantA: {
      stepThroughputPerMinute: 1,
    },
  });

  beforeEach(() => {
    process.env.TENANT_QUOTAS = quotaJson;
    resetTenantQuotaCache();
    quotaService.reset();
  });

  afterEach(() => {
    quotaService.reset();
    delete process.env.TENANT_QUOTAS;
  });

  it('denies steps that exceed throughput quota', async () => {
    const engine = new WorkflowEngine();
    await expect(
      engine.execute(buildWorkflow(), {}, 'tenantA'),
    ).rejects.toMatchObject({ name: 'QuotaPolicyError' });
  });
});
