import { generateDesign } from '../../src/agents/design/design-mcp-adapter';

describe('generateDesign', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('fails when DESIGN_MCP_API_KEY is missing', async () => {
    process.env.DESIGN_MCP_ENABLED = 'true';
    delete process.env.DESIGN_MCP_API_KEY;

    await expect(generateDesign({ prompt: 'Create a dashboard' })).rejects.toThrow(
      'Missing DESIGN_MCP_API_KEY',
    );
  });

  it('fails when feature flag is disabled', async () => {
    process.env.DESIGN_MCP_ENABLED = 'false';
    process.env.DESIGN_MCP_API_KEY = 'test-key';

    await expect(generateDesign({ prompt: 'Create a dashboard' })).rejects.toThrow(
      'Design MCP is disabled',
    );
  });

  it('returns normalized artifact data on success', async () => {
    process.env.DESIGN_MCP_ENABLED = 'true';
    process.env.DESIGN_MCP_API_KEY = 'test-key';

    const fetcher = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        designId: 'intelgraph-ops-console',
        assetsPath: 'artifacts/ui-design/intelgraph-ops-console',
        screens: [
          { id: 'home', name: 'Home' },
          { id: 'alerts', name: 'Alerts', description: 'Alert triage screen' },
        ],
      }),
    });

    const artifact = await generateDesign(
      { prompt: 'Create an ops console with alert triage and incidents' },
      {
        apiBaseUrl: 'https://example.test',
        fetcher,
      },
    );

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(artifact).toEqual({
      designId: 'intelgraph-ops-console',
      assetsPath: 'artifacts/ui-design/intelgraph-ops-console',
      provider: 'design-mcp',
      screens: [
        { id: 'home', name: 'Home' },
        { id: 'alerts', name: 'Alerts', description: 'Alert triage screen' },
      ],
    });
  });
});
