import { LocalLmStudioProvider } from '../../../src/agents/providers/localLmStudioProvider.js';

describe('LocalLmStudioProvider', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('returns content from the first choice message', async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'hello' } }],
      }),
    });

    const provider = new LocalLmStudioProvider({ baseUrl: 'http://localhost:1234/v1' });
    const result = await provider.chat({
      model: 'qwen3-coder-next',
      messages: [{ role: 'user', content: 'ping' }],
    });

    expect(result.text).toBe('hello');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws on non-200 responses', async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'server error',
    });

    const provider = new LocalLmStudioProvider({ baseUrl: 'http://localhost:1234/v1' });

    await expect(
      provider.chat({
        model: 'qwen3-coder-next',
        messages: [{ role: 'user', content: 'ping' }],
      }),
    ).rejects.toThrow('LMStudio provider error');
  });
});
