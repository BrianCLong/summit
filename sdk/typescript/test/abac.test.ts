import { ABACClient } from '../src/abac';

describe('ABACClient', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('sends authorize request and parses decision', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ allow: true, reason: 'allow', obligations: [] }),
    });
    global.fetch = mockFetch as unknown as typeof fetch;
    const client = new ABACClient({ baseUrl: 'https://authz.example.com' });
    const decision = await client.isAllowed({ subjectId: 'alice', action: 'dataset:read' });
    expect(decision.allow).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://authz.example.com/authorize',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('retrieves subject attributes', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { tenantId: 'tenantA' }, schema: {} }),
    });
    global.fetch = mockFetch as unknown as typeof fetch;
    const client = new ABACClient({ baseUrl: 'https://authz.example.com', token: 'abc' });
    const res = await client.getSubjectAttributes('alice', { refresh: true });
    expect(res.data.tenantId).toBe('tenantA');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://authz.example.com/subject/alice/attributes?refresh=true',
      expect.objectContaining({ method: 'GET' }),
    );
  });
});
