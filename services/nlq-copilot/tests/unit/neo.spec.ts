import { runReadonly } from '../../src/neo';

const mockRecord = (payload: Record<string, unknown>) => ({
  toObject: () => payload,
});

const mockDriver = {
  session: jest.fn(() => ({
    run: jest.fn(async () => ({ records: [mockRecord({ n: 1 })] })),
    close: jest.fn(async () => undefined),
  })),
};

test('rejects writes', async () => {
  await expect(runReadonly('CREATE (n)')).rejects.toThrow('write_denied');
});

test('runs read query against provided driver', async () => {
  const results = await runReadonly('MATCH (n) RETURN n', {}, { driverInstance: mockDriver as any });
  expect(results).toEqual([{ n: 1 }]);
  expect((mockDriver.session as jest.Mock).mock.calls.length).toBe(1);
});
