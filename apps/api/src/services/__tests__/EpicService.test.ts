/**
 * Comprehensive unit tests for EpicService
 *
 * Tests cover:
 * - Epic listing and retrieval
 * - Task state management
 * - Progress calculation
 * - Update operations
 * - Error handling
 * - Edge cases
 * - State persistence
 * - Clock injection for testing
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { EpicService } from '../EpicService.js';
import type { EpicDefinition, EpicStatus, EpicUpdatePayload } from '../../contracts/epics.js';

describe('EpicService', () => {
  let service: EpicService;
  let mockClock: () => Date;
  let currentTime: Date;

  const createMockDefinitions = (): EpicDefinition[] => [
    {
      id: 'epic-1',
      title: 'Epic 1',
      description: 'First epic',
      category: 'feature',
      owner: 'team-1',
      tasks: [
        { id: 'task-1-1', description: 'Task 1.1' },
        { id: 'task-1-2', description: 'Task 1.2' },
        { id: 'task-1-3', description: 'Task 1.3' },
      ],
    },
    {
      id: 'epic-2',
      title: 'Epic 2',
      description: 'Second epic',
      category: 'bugfix',
      owner: 'team-2',
      tasks: [
        { id: 'task-2-1', description: 'Task 2.1' },
        { id: 'task-2-2', description: 'Task 2.2' },
      ],
    },
  ];

  beforeEach(() => {
    currentTime = new Date('2025-01-01T00:00:00Z');
    mockClock = () => currentTime;
    service = new EpicService(createMockDefinitions(), mockClock);
  });

  describe('Initialization and State Seeding', () => {
    it('should initialize with all tasks in not_started state', () => {
      const epics = service.list();

      epics.forEach((epic) => {
        epic.tasks.forEach((task) => {
          expect(task.status).toBe('not_started');
        });
      });
    });

    it('should set updatedAt timestamp for all tasks on initialization', () => {
      const epics = service.list();

      epics.forEach((epic) => {
        epic.tasks.forEach((task) => {
          expect(task.updatedAt).toBe('2025-01-01T00:00:00.000Z');
        });
      });
    });

    it('should initialize with correct task descriptions from definitions', () => {
      const epic1 = service.get('epic-1');

      expect(epic1).toBeDefined();
      expect(epic1!.tasks[0].description).toBe('Task 1.1');
      expect(epic1!.tasks[1].description).toBe('Task 1.2');
      expect(epic1!.tasks[2].description).toBe('Task 1.3');
    });

    it('should calculate zero progress initially', () => {
      const epics = service.list();

      epics.forEach((epic) => {
        expect(epic.progress).toBe(0);
        expect(epic.completedCount).toBe(0);
        expect(epic.blockedCount).toBe(0);
      });
    });

    it('should handle empty definition list', () => {
      const emptyService = new EpicService([], mockClock);
      const epics = emptyService.list();

      expect(epics).toEqual([]);
    });

    it('should handle epic with no tasks', () => {
      const definitions: EpicDefinition[] = [
        {
          id: 'epic-empty',
          title: 'Empty Epic',
          description: 'Epic with no tasks',
          category: 'feature',
          owner: 'team-1',
          tasks: [],
        },
      ];

      const emptyTaskService = new EpicService(definitions, mockClock);
      const epic = emptyTaskService.get('epic-empty');

      expect(epic).toBeDefined();
      expect(epic!.tasks).toHaveLength(0);
      expect(epic!.progress).toBe(0);
      expect(epic!.completedCount).toBe(0);
    });
  });

  describe('Epic Listing', () => {
    it('should list all epics', () => {
      const epics = service.list();

      expect(epics).toHaveLength(2);
      expect(epics[0].id).toBe('epic-1');
      expect(epics[1].id).toBe('epic-2');
    });

    it('should include all definition fields in snapshots', () => {
      const epics = service.list();

      expect(epics[0]).toMatchObject({
        id: 'epic-1',
        title: 'Epic 1',
        description: 'First epic',
        category: 'feature',
        owner: 'team-1',
      });
    });

    it('should return fresh snapshots on each call', () => {
      const epics1 = service.list();
      const epics2 = service.list();

      expect(epics1).not.toBe(epics2);
      expect(epics1).toEqual(epics2);
    });

    it('should reflect updated state in subsequent listings', () => {
      service.updateTask('epic-1', 'task-1-1', { status: 'completed' });

      const epics = service.list();
      const task = epics[0].tasks.find((t) => t.id === 'task-1-1');

      expect(task?.status).toBe('completed');
    });
  });

  describe('Epic Retrieval', () => {
    it('should retrieve epic by ID', () => {
      const epic = service.get('epic-1');

      expect(epic).toBeDefined();
      expect(epic!.id).toBe('epic-1');
      expect(epic!.title).toBe('Epic 1');
    });

    it('should return null for non-existent epic', () => {
      const epic = service.get('non-existent');

      expect(epic).toBeNull();
    });

    it('should return epic with all tasks', () => {
      const epic = service.get('epic-1');

      expect(epic!.tasks).toHaveLength(3);
    });

    it('should return epic with current progress', () => {
      service.updateTask('epic-1', 'task-1-1', { status: 'completed' });
      service.updateTask('epic-1', 'task-1-2', { status: 'completed' });

      const epic = service.get('epic-1');

      expect(epic!.completedCount).toBe(2);
      expect(epic!.progress).toBe(67); // 2/3 = 66.67% rounded to 67
    });
  });

  describe('Task Updates', () => {
    it('should update task status to in_progress', () => {
      const epic = service.updateTask('epic-1', 'task-1-1', { status: 'in_progress' });

      const task = epic.tasks.find((t) => t.id === 'task-1-1');
      expect(task?.status).toBe('in_progress');
    });

    it('should update task status to completed', () => {
      const epic = service.updateTask('epic-1', 'task-1-1', { status: 'completed' });

      const task = epic.tasks.find((t) => t.id === 'task-1-1');
      expect(task?.status).toBe('completed');
    });

    it('should update task status to blocked', () => {
      const epic = service.updateTask('epic-1', 'task-1-1', { status: 'blocked' });

      const task = epic.tasks.find((t) => t.id === 'task-1-1');
      expect(task?.status).toBe('blocked');
    });

    it('should update task with owner', () => {
      const epic = service.updateTask('epic-1', 'task-1-1', {
        status: 'in_progress',
        owner: 'alice@example.com',
      });

      const task = epic.tasks.find((t) => t.id === 'task-1-1');
      expect(task?.owner).toBe('alice@example.com');
    });

    it('should update task with note', () => {
      const epic = service.updateTask('epic-1', 'task-1-1', {
        status: 'blocked',
        note: 'Waiting for API changes',
      });

      const task = epic.tasks.find((t) => t.id === 'task-1-1');
      expect(task?.note).toBe('Waiting for API changes');
    });

    it('should update task with both owner and note', () => {
      const epic = service.updateTask('epic-1', 'task-1-1', {
        status: 'in_progress',
        owner: 'bob@example.com',
        note: 'Working on implementation',
      });

      const task = epic.tasks.find((t) => t.id === 'task-1-1');
      expect(task?.owner).toBe('bob@example.com');
      expect(task?.note).toBe('Working on implementation');
    });

    it('should update timestamp on task update', () => {
      currentTime = new Date('2025-01-02T00:00:00Z');

      const epic = service.updateTask('epic-1', 'task-1-1', { status: 'in_progress' });

      const task = epic.tasks.find((t) => t.id === 'task-1-1');
      expect(task?.updatedAt).toBe('2025-01-02T00:00:00.000Z');
    });

    it('should throw error for non-existent epic', () => {
      expect(() =>
        service.updateTask('non-existent', 'task-1-1', { status: 'completed' }),
      ).toThrow('Epic non-existent not found');
    });

    it('should throw error for non-existent task', () => {
      expect(() =>
        service.updateTask('epic-1', 'non-existent', { status: 'completed' }),
      ).toThrow('Task non-existent not found for epic epic-1');
    });

    it('should preserve task description on update', () => {
      const epic = service.updateTask('epic-1', 'task-1-1', { status: 'completed' });

      const task = epic.tasks.find((t) => t.id === 'task-1-1');
      expect(task?.description).toBe('Task 1.1');
    });

    it('should allow updating same task multiple times', () => {
      service.updateTask('epic-1', 'task-1-1', { status: 'in_progress' });
      service.updateTask('epic-1', 'task-1-1', { status: 'blocked' });
      const epic = service.updateTask('epic-1', 'task-1-1', { status: 'completed' });

      const task = epic.tasks.find((t) => t.id === 'task-1-1');
      expect(task?.status).toBe('completed');
    });

    it('should allow updating back to not_started', () => {
      service.updateTask('epic-1', 'task-1-1', { status: 'completed' });
      const epic = service.updateTask('epic-1', 'task-1-1', { status: 'not_started' });

      const task = epic.tasks.find((t) => t.id === 'task-1-1');
      expect(task?.status).toBe('not_started');
    });
  });

  describe('Progress Calculation', () => {
    it('should calculate 0% progress when no tasks completed', () => {
      const epic = service.get('epic-1');

      expect(epic!.progress).toBe(0);
      expect(epic!.completedCount).toBe(0);
    });

    it('should calculate 33% progress when 1 of 3 tasks completed', () => {
      service.updateTask('epic-1', 'task-1-1', { status: 'completed' });
      const epic = service.get('epic-1');

      expect(epic!.completedCount).toBe(1);
      expect(epic!.progress).toBe(33); // 1/3 = 33.33% rounded to 33
    });

    it('should calculate 67% progress when 2 of 3 tasks completed', () => {
      service.updateTask('epic-1', 'task-1-1', { status: 'completed' });
      service.updateTask('epic-1', 'task-1-2', { status: 'completed' });
      const epic = service.get('epic-1');

      expect(epic!.completedCount).toBe(2);
      expect(epic!.progress).toBe(67); // 2/3 = 66.67% rounded to 67
    });

    it('should calculate 100% progress when all tasks completed', () => {
      service.updateTask('epic-1', 'task-1-1', { status: 'completed' });
      service.updateTask('epic-1', 'task-1-2', { status: 'completed' });
      service.updateTask('epic-1', 'task-1-3', { status: 'completed' });
      const epic = service.get('epic-1');

      expect(epic!.completedCount).toBe(3);
      expect(epic!.progress).toBe(100);
    });

    it('should calculate 50% progress when 1 of 2 tasks completed', () => {
      service.updateTask('epic-2', 'task-2-1', { status: 'completed' });
      const epic = service.get('epic-2');

      expect(epic!.completedCount).toBe(1);
      expect(epic!.progress).toBe(50);
    });

    it('should not count in_progress tasks toward completion', () => {
      service.updateTask('epic-1', 'task-1-1', { status: 'in_progress' });
      service.updateTask('epic-1', 'task-1-2', { status: 'completed' });
      const epic = service.get('epic-1');

      expect(epic!.completedCount).toBe(1);
      expect(epic!.progress).toBe(33);
    });

    it('should not count blocked tasks toward completion', () => {
      service.updateTask('epic-1', 'task-1-1', { status: 'blocked' });
      const epic = service.get('epic-1');

      expect(epic!.completedCount).toBe(0);
      expect(epic!.blockedCount).toBe(1);
      expect(epic!.progress).toBe(0);
    });

    it('should track multiple blocked tasks', () => {
      service.updateTask('epic-1', 'task-1-1', { status: 'blocked' });
      service.updateTask('epic-1', 'task-1-2', { status: 'blocked' });
      const epic = service.get('epic-1');

      expect(epic!.blockedCount).toBe(2);
    });

    it('should update progress when task is uncompleted', () => {
      service.updateTask('epic-1', 'task-1-1', { status: 'completed' });
      service.updateTask('epic-1', 'task-1-2', { status: 'completed' });
      service.updateTask('epic-1', 'task-1-1', { status: 'in_progress' });

      const epic = service.get('epic-1');

      expect(epic!.completedCount).toBe(1);
      expect(epic!.progress).toBe(33);
    });
  });

  describe('State Isolation', () => {
    it('should maintain separate state for different epics', () => {
      service.updateTask('epic-1', 'task-1-1', { status: 'completed' });
      service.updateTask('epic-2', 'task-2-1', { status: 'in_progress' });

      const epic1 = service.get('epic-1');
      const epic2 = service.get('epic-2');

      expect(epic1!.tasks[0].status).toBe('completed');
      expect(epic2!.tasks[0].status).toBe('in_progress');
    });

    it('should not affect other tasks when updating one task', () => {
      service.updateTask('epic-1', 'task-1-2', { status: 'completed' });

      const epic = service.get('epic-1');

      expect(epic!.tasks[0].status).toBe('not_started');
      expect(epic!.tasks[1].status).toBe('completed');
      expect(epic!.tasks[2].status).toBe('not_started');
    });

    it('should handle concurrent updates to different tasks', () => {
      service.updateTask('epic-1', 'task-1-1', {
        status: 'in_progress',
        owner: 'alice@example.com',
      });
      service.updateTask('epic-1', 'task-1-2', {
        status: 'completed',
        owner: 'bob@example.com',
      });

      const epic = service.get('epic-1');

      expect(epic!.tasks[0].owner).toBe('alice@example.com');
      expect(epic!.tasks[1].owner).toBe('bob@example.com');
    });
  });

  describe('Clock Injection', () => {
    it('should use injected clock for timestamps', () => {
      const fixedTime = new Date('2025-06-15T12:30:00Z');
      const fixedClock = () => fixedTime;
      const timeService = new EpicService(createMockDefinitions(), fixedClock);

      const epics = timeService.list();

      epics.forEach((epic) => {
        epic.tasks.forEach((task) => {
          expect(task.updatedAt).toBe('2025-06-15T12:30:00.000Z');
        });
      });
    });

    it('should advance timestamps when clock advances', () => {
      let time = new Date('2025-01-01T00:00:00Z');
      const advancingClock = () => time;
      const timeService = new EpicService(createMockDefinitions(), advancingClock);

      time = new Date('2025-01-01T01:00:00Z');
      timeService.updateTask('epic-1', 'task-1-1', { status: 'in_progress' });

      time = new Date('2025-01-01T02:00:00Z');
      timeService.updateTask('epic-1', 'task-1-2', { status: 'completed' });

      const epic = timeService.get('epic-1');

      expect(epic!.tasks[0].updatedAt).toBe('2025-01-01T01:00:00.000Z');
      expect(epic!.tasks[1].updatedAt).toBe('2025-01-01T02:00:00.000Z');
    });

    it('should use default clock when none provided', () => {
      const beforeTime = new Date();
      const defaultService = new EpicService(createMockDefinitions());
      const afterTime = new Date();

      const epics = defaultService.list();
      const taskTime = new Date(epics[0].tasks[0].updatedAt);

      expect(taskTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(taskTime.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });

  describe('Edge Cases', () => {
    it('should handle epic with single task', () => {
      const definitions: EpicDefinition[] = [
        {
          id: 'epic-single',
          title: 'Single Task Epic',
          description: 'Epic with one task',
          category: 'feature',
          owner: 'team-1',
          tasks: [{ id: 'task-1', description: 'Only task' }],
        },
      ];

      const singleService = new EpicService(definitions, mockClock);
      singleService.updateTask('epic-single', 'task-1', { status: 'completed' });

      const epic = singleService.get('epic-single');

      expect(epic!.progress).toBe(100);
      expect(epic!.completedCount).toBe(1);
    });

    it('should handle very long epic with many tasks', () => {
      const manyTasks = Array.from({ length: 100 }, (_, i) => ({
        id: `task-${i}`,
        description: `Task ${i}`,
      }));

      const definitions: EpicDefinition[] = [
        {
          id: 'epic-large',
          title: 'Large Epic',
          description: 'Epic with 100 tasks',
          category: 'feature',
          owner: 'team-1',
          tasks: manyTasks,
        },
      ];

      const largeService = new EpicService(definitions, mockClock);

      // Complete 50 tasks
      for (let i = 0; i < 50; i++) {
        largeService.updateTask('epic-large', `task-${i}`, { status: 'completed' });
      }

      const epic = largeService.get('epic-large');

      expect(epic!.tasks).toHaveLength(100);
      expect(epic!.completedCount).toBe(50);
      expect(epic!.progress).toBe(50);
    });

    it('should handle task IDs with special characters', () => {
      const definitions: EpicDefinition[] = [
        {
          id: 'epic-special',
          title: 'Special Epic',
          description: 'Epic with special task IDs',
          category: 'feature',
          owner: 'team-1',
          tasks: [
            { id: 'task:with:colons', description: 'Task 1' },
            { id: 'task-with-dashes', description: 'Task 2' },
            { id: 'task_with_underscores', description: 'Task 3' },
          ],
        },
      ];

      const specialService = new EpicService(definitions, mockClock);

      const epic1 = specialService.updateTask('epic-special', 'task:with:colons', {
        status: 'completed',
      });
      const epic2 = specialService.updateTask('epic-special', 'task-with-dashes', {
        status: 'in_progress',
      });
      const epic3 = specialService.updateTask('epic-special', 'task_with_underscores', {
        status: 'blocked',
      });

      expect(epic1.tasks[0].status).toBe('completed');
      expect(epic2.tasks[1].status).toBe('in_progress');
      expect(epic3.tasks[2].status).toBe('blocked');
    });

    it('should handle empty note and owner fields', () => {
      const epic = service.updateTask('epic-1', 'task-1-1', {
        status: 'completed',
        note: '',
        owner: '',
      });

      const task = epic.tasks.find((t) => t.id === 'task-1-1');
      expect(task?.note).toBe('');
      expect(task?.owner).toBe('');
    });

    it('should handle very long note text', () => {
      const longNote = 'A'.repeat(10000);
      const epic = service.updateTask('epic-1', 'task-1-1', {
        status: 'blocked',
        note: longNote,
      });

      const task = epic.tasks.find((t) => t.id === 'task-1-1');
      expect(task?.note).toBe(longNote);
      expect(task?.note?.length).toBe(10000);
    });

    it('should handle unicode in notes and owners', () => {
      const epic = service.updateTask('epic-1', 'task-1-1', {
        status: 'in_progress',
        owner: 'Alice 日本語 🎉',
        note: 'Working on 中文 implementation ✅',
      });

      const task = epic.tasks.find((t) => t.id === 'task-1-1');
      expect(task?.owner).toBe('Alice 日本語 🎉');
      expect(task?.note).toBe('Working on 中文 implementation ✅');
    });
  });

  describe('Return Value Integrity', () => {
    it('should return complete snapshot after update', () => {
      const epic = service.updateTask('epic-1', 'task-1-1', { status: 'completed' });

      expect(epic).toHaveProperty('id');
      expect(epic).toHaveProperty('title');
      expect(epic).toHaveProperty('description');
      expect(epic).toHaveProperty('category');
      expect(epic).toHaveProperty('owner');
      expect(epic).toHaveProperty('tasks');
      expect(epic).toHaveProperty('completedCount');
      expect(epic).toHaveProperty('blockedCount');
      expect(epic).toHaveProperty('progress');
    });

    it('should return snapshot matching get() result after update', () => {
      const updateResult = service.updateTask('epic-1', 'task-1-1', { status: 'completed' });
      const getResult = service.get('epic-1');

      expect(updateResult).toEqual(getResult);
    });
  });
});
