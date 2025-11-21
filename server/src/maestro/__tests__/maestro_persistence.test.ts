import { tasksRepo } from '../runs/tasks-repo.js';
import { eventsRepo } from '../runs/events-repo.js';
import { runsRepo } from '../runs/runs-repo.js';

// Mock the database config
const mockQuery = jest.fn();
jest.mock('../../config/database.js', () => ({
  getPostgresPool: () => ({
    query: mockQuery,
  }),
}));

describe('Maestro Persistence Layer', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  describe('TasksRepo', () => {
    it('should create a task', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 'task-123', status: 'pending' }] });

      const task = await tasksRepo.create({
        run_id: 'run-1',
        name: 'test-task',
        type: 'scaffold',
        tenant_id: 'default',
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO tasks'),
        expect.arrayContaining(['run-1', 'test-task', 'scaffold', 'default'])
      );
      expect(task.id).toBe('task-123');
    });

    it('should update a task', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 'task-123', status: 'completed' }] });

      const task = await tasksRepo.update('task-123', { status: 'completed' }, 'default');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE tasks'),
        expect.arrayContaining(['completed', 'task-123', 'default'])
      );
      expect(task?.status).toBe('completed');
    });
  });

  describe('EventsRepo', () => {
    it('should create an event', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 'evt-1', type: 'TASK_COMPLETED' }] });

      const event = await eventsRepo.create({
        run_id: 'run-1',
        task_id: 'task-1',
        type: 'TASK_COMPLETED',
        payload: { foo: 'bar' },
        tenant_id: 'default',
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO events'),
        expect.arrayContaining(['run-1', 'task-1', 'TASK_COMPLETED'])
      );
      expect(event.id).toBe('evt-1');
    });
  });

  describe('RunsRepo', () => {
    it('should create a run', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 'run-1', status: 'queued' }] });

      const run = await runsRepo.create({
        pipeline_id: 'pipe-1',
        pipeline_name: 'test-pipe',
        executor_id: 'user-1',
        tenant_id: 'default',
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO runs'),
        expect.arrayContaining(['pipe-1', 'test-pipe', 'user-1'])
      );
      expect(run.id).toBe('run-1');
    });
  });
});
