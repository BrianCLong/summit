import { jest } from '@jest/globals';
import type { Mock } from 'jest-mock';
import fs from 'fs/promises';
import { MaestroService } from '../MaestroService';
import { runsRepo } from '../runs/runs-repo';

jest.mock('fs/promises');
jest.mock('../runs/runs-repo', () => ({
  runsRepo: {
    list: jest.fn(),
  },
}));

describe('MaestroService', () => {
  let service: MaestroService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = MaestroService.getInstance();
    // Reset private cache for test isolation
    (service as unknown as { dbCache: null }).dbCache = null;
  });

  it('should calculate health snapshot correctly', async () => {
    (runsRepo.list as unknown as Mock).mockResolvedValue([
        { status: 'succeeded', created_at: new Date() },
        { status: 'succeeded', created_at: new Date() }
    ]);

    const snapshot = await service.getHealthSnapshot('tenant-1');
    expect(snapshot.overallScore).toBe(100);
    expect(snapshot.workstreams[0].status).toBe('healthy');
  });

  it('should degrade health on failures', async () => {
     const failures = Array(10).fill({ status: 'failed', created_at: new Date() });
     (runsRepo.list as unknown as Mock).mockResolvedValue(failures);

     const snapshot = await service.getHealthSnapshot('tenant-1');
     expect(snapshot.overallScore).toBeLessThan(90);
  });

  it('should toggle autonomic loops', async () => {
     (fs.readFile as unknown as Mock).mockResolvedValue(JSON.stringify({
         loops: [{ id: 'loop-1', status: 'active', name: 'Test Loop', type: 'cost' }],
         auditLog: []
     }));

     const result = await service.toggleLoop('loop-1', 'paused', 'user-1');
     expect(result).toBe(true);

     // Verify write
     expect(fs.writeFile).toHaveBeenCalled();
     const writeCall = (fs.writeFile as unknown as Mock).mock.calls[0];
     const writtenData = JSON.parse(writeCall[1] as string);
     expect(writtenData.loops[0].status).toBe('paused');
  });
});
