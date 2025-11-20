import { BatchJobService } from '../src/services/BatchJobService.js';
import { PgBoss } from 'pg-boss';

// Mock PgBoss using a class
jest.mock('pg-boss', () => {
  return {
    PgBoss: class MockPgBoss {
      constructor(connectionString: string) {}
      on(event: string, handler: Function) { return this; }
      start() { return Promise.resolve(); }
      stop() { return Promise.resolve(); }
      send(queue: string, data: any) { return Promise.resolve('job-id'); }
      work(queue: string, handler: Function) {
          return Promise.resolve('worker-id');
      }
    }
  };
});

describe('BatchJobService', () => {
  let service: BatchJobService;

  beforeEach(() => {
    process.env.DATABASE_URL = 'postgres://localhost:5432/test';
    jest.clearAllMocks();
    service = new BatchJobService();
  });

  it('should start boss and register workers', async () => {
    const startSpy = jest.spyOn(PgBoss.prototype, 'start');
    const workSpy = jest.spyOn(PgBoss.prototype, 'work');

    await service.start();

    expect(startSpy).toHaveBeenCalled();
    expect(workSpy).toHaveBeenCalledWith('normalize-cases', expect.any(Function));
  });

  it('should publish jobs', async () => {
    const sendSpy = jest.spyOn(PgBoss.prototype, 'send');
    await service.start();

    const result = await service.publish('normalize-cases', { caseId: '123', rawText: 'TEST' });

    expect(sendSpy).toHaveBeenCalledWith('normalize-cases', { caseId: '123', rawText: 'TEST' });
    expect(result).toBe('job-id');
  });

  it('should handle job execution logic (simulated)', async () => {
    const workSpy = jest.spyOn(PgBoss.prototype, 'work');
    await service.start();

    const workerFn = workSpy.mock.calls[0][1] as Function;

    const jobs = [{
      data: { caseId: '123', rawText: '  DATA  ' }
    }];

    await workerFn(jobs);
  });

  it('should throw on invalid schema', async () => {
    const workSpy = jest.spyOn(PgBoss.prototype, 'work');
    await service.start();
    const workerFn = workSpy.mock.calls[0][1] as Function;

    const jobs = [{
      data: { caseId: '123' } // missing rawText
    }];

    await expect(workerFn(jobs)).rejects.toThrow();
  });
});
