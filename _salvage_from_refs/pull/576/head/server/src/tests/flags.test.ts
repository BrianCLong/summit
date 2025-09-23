import { FlagService } from '../featureflags/FlagService';
import { MemoryStore } from '../featureflags/store/memory';

describe('FlagService', () => {
  it('evaluates and sets flags', async () => {
    const svc = new FlagService(MemoryStore);
    await svc.setFlag('t1', 'detector.canary', true);
    const v = await svc.eval('t1', 'detector.canary');
    expect(v).toBe(true);
  });
});
