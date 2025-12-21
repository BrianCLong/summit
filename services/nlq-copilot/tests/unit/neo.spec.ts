import { runReadonly } from '../../src/neo';

test('rejects writes', async () => {
  await expect(runReadonly('CREATE (n)')).rejects.toThrow('write_denied');
});
