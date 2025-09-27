import {
  customGraphMetricResolvers,
  resetCustomGraphMetricsService,
  setCustomGraphMetricsService,
} from '../customGraphMetrics.js';
import type CustomGraphMetricsService from '../../../services/customGraphMetricsService.js';

describe('customGraphMetricResolvers', () => {
  const executeMetrics = jest.fn();
  const listTemplates = jest.fn();
  const serviceStub = {
    executeMetrics,
    listTemplates,
  } as unknown as CustomGraphMetricsService;

  beforeEach(() => {
    executeMetrics.mockReset();
    listTemplates.mockReset();
    setCustomGraphMetricsService(serviceStub);
  });

  afterAll(() => {
    resetCustomGraphMetricsService();
  });

  it('requires authentication to execute metrics', async () => {
    await expect(
      customGraphMetricResolvers.Query.customGraphMetrics(
        null,
        {
          input: {
            metrics: [
              {
                key: 'degree',
                cypher: 'RETURN 1 AS degree',
              },
            ],
          },
        },
        {},
      ),
    ).rejects.toThrow('Authentication required');
    expect(executeMetrics).not.toHaveBeenCalled();
  });

  it('passes tenant context and metrics to the service', async () => {
    const results = [
      {
        key: 'degree',
        description: 'test',
        cached: false,
        data: [],
        executedAt: new Date().toISOString(),
      },
    ];
    executeMetrics.mockResolvedValue(results);

    const response = await customGraphMetricResolvers.Query.customGraphMetrics(
      null,
      {
        input: {
          metrics: [
            {
              key: 'degree',
              cypher: 'RETURN 1 AS degree',
            },
          ],
          investigationId: 'investigation-7',
          useCache: false,
        },
      },
      { user: { id: 'user-1', tenantId: 'tenant-5' } },
    );

    expect(executeMetrics).toHaveBeenCalledWith(
      [
        {
          key: 'degree',
          cypher: 'RETURN 1 AS degree',
        },
      ],
      {
        tenantId: 'tenant-5',
        investigationId: 'investigation-7',
        useCache: false,
      },
    );
    expect(response).toEqual(results);
  });

  it('exposes metric templates from the service', () => {
    const templates = [
      { key: 'template', name: 'Template', description: 'desc', cypher: 'RETURN 1', recommendedTtlSeconds: 300 },
    ];
    listTemplates.mockReturnValue(templates);

    const result = customGraphMetricResolvers.Query.customGraphMetricTemplates();

    expect(result).toEqual(templates);
    expect(listTemplates).toHaveBeenCalledTimes(1);
  });
});
