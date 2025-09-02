import { getContext } from '../src/lib/auth.js';

describe('trace context', () => {
  it('attaches unique requestId to context', async () => {
    const ctx1 = await getContext({ req: { headers: {} } });
    const ctx2 = await getContext({ req: { headers: {} } });
    expect(ctx1.requestId).toBeDefined();
    expect(ctx2.requestId).toBeDefined();
    expect(ctx1.requestId).not.toBe(ctx2.requestId);
  });
});
