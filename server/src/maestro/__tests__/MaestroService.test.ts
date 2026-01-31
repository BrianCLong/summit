import { jest } from '@jest/globals';
import fs from 'fs/promises';
import { MaestroService } from '../MaestroService.js';
import { runsRepo } from '../runs/runs-repo.js';

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
    const listMock = runsRepo.list as jest.MockedFunction<typeof runsRepo.list>;
    const now = new Date();
    listMock.mockResolvedValue([
        {
          id: 'run-1',
          pipeline_id: 'pipe-1',
          pipeline: 'pipeline-a',
          status: 'succeeded',
          cost: 0,
          created_at: now,
          updated_at: now,
          tenant_id: 'tenant-1',
        },
        {
          id: 'run-2',
          pipeline_id: 'pipe-1',
          pipeline: 'pipeline-a',
          status: 'succeeded',
          cost: 0,
          created_at: now,
          updated_at: now,
          tenant_id: 'tenant-1',
        }
    ]);

    const snapshot = await service.getHealthSnapshot('tenant-1');
    expect(snapshot.overallScore).toBe(100);
    expect(snapshot.workstreams[0].status).toBe('healthy');
  });

  it('should degrade health on failures', async () => {
     const now = new Date();
     const failures = Array(10).fill({
       id: 'run-fail',
       pipeline_id: 'pipe-1',
       pipeline: 'pipeline-a',
       status: 'failed',
       cost: 0,
       created_at: now,
       updated_at: now,
       tenant_id: 'tenant-1',
     });
     const listMock = runsRepo.list as jest.MockedFunction<typeof runsRepo.list>;
     listMock.mockResolvedValue(failures);

     const snapshot = await service.getHealthSnapshot('tenant-1');
     expect(snapshot.overallScore).toBeLessThan(90);
  });

  it('should toggle autonomic loops', async () => {
     const readFileMock = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
     readFileMock.mockResolvedValue(JSON.stringify({
         loops: [{ id: 'loop-1', status: 'active', name: 'Test Loop', type: 'cost' }],
         auditLog: []
     }));

     const result = await service.toggleLoop('loop-1', 'paused', 'user-1');
     expect(result).toBe(true);

     // Verify write
     expect(fs.writeFile).toHaveBeenCalled();
     const writeFileMock = fs.writeFile as jest.MockedFunction<typeof fs.writeFile>;
     const writeCall = writeFileMock.mock.calls[0];
     const writtenData = JSON.parse(writeCall[1] as string);
     expect(writtenData.loops[0].status).toBe('paused');
  });
});
