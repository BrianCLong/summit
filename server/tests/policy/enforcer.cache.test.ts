import { PolicyEnforcer } from '../../src/policy/enforcer';

type RedisMock = {
  store: Map<string, string>;
  get: jest.MockedFunction<(key: string) => Promise<string | null>>;
  setWithTTL: jest.MockedFunction<
    (key: string, value: string, ttl?: number) => Promise<boolean>
  >;
};

const redisMock: RedisMock = {
  store: new Map(),
  get: jest.fn(async (key: string) => redisMock.store.get(key) ?? null),
  setWithTTL: jest.fn(async (key: string, value: string) => {
    redisMock.store.set(key, value);
    return true;
  }),
};

describe('PolicyEnforcer caching + debug logs', () => {
  beforeAll(() => {
    jest.resetModules();
  });

  beforeEach(() => {
    redisMock.store.clear();
    redisMock.get.mockClear();
    redisMock.setWithTTL.mockClear();
    jest.doMock('../../src/subscriptions/pubsub', () => ({
      redis: redisMock,
    }));
  });

  afterEach(() => {
    jest.resetModules();
  });

  const context = {
    tenantId: 'tenant-a',
    userId: 'user-1',
    action: 'read' as const,
    resource: 'case/123',
    purpose: 'investigation' as const,
  };

  it('caches decisions by tenant/subject/action/resource hash', async () => {
    const { PolicyEnforcer: Enforcer } = await import('../../src/policy/enforcer');
    const auditLogger = { logSecurityEvent: jest.fn(async () => undefined) } as any;
    const enforcer = new Enforcer(auditLogger);
    const evaluateSpy = jest.spyOn<any, any>(enforcer as any, 'evaluatePolicy');

    const first = await enforcer.enforce(context);
    const second = await enforcer.enforce(context);

    expect(first.allow).toBe(true);
    expect(second.allow).toBe(true);
    expect(evaluateSpy).toHaveBeenCalledTimes(1);
    expect(redisMock.setWithTTL).toHaveBeenCalled();
    expect(redisMock.get).toHaveBeenCalled();
  });

  it('emits structured debug logs when POLICY_DEBUG is on', async () => {
    process.env.POLICY_DEBUG = '1';
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    const { PolicyEnforcer: Enforcer } = await import('../../src/policy/enforcer');
    const enforcer = new Enforcer({
      logSecurityEvent: jest.fn(async () => undefined),
    } as any);

    await enforcer.enforce({ ...context, resource: 'sensitive/object' });

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('[policy-decision]'),
      expect.stringContaining('decision'),
    );

    logSpy.mockRestore();
    delete process.env.POLICY_DEBUG;
  });
});
