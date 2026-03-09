import { describe, expect, test } from '@jest/globals';
import { validate } from '../../src/cli/validate';

describe('Schema Validation', () => {
  describe('task.schema.json', () => {
    test('validates a correct task', () => {
      const validTask = {
        taskId: "se.fix-regression.0001",
        benchmarkVersion: "v0.1",
        family: "software-engineering",
        title: "Fix a basic regression",
        description: "A basic test regression fix",
        difficulty: "easy",
        environmentRef: "env1",
        toolProfile: "se-safe",
        budgets: {
          maxSteps: 50,
          maxRuntimeSec: 600
        },
        inputs: {},
        successCriteria: { tests_pass: true },
        scoringProfile: "se_v0"
      };

      const result = validate(validTask, 'task.schema.json');
      expect(result.valid).toBe(true);
    });

    test('rejects an invalid task', () => {
      const invalidTask = {
        taskId: "invalid task with spaces", // Invalid pattern
        benchmarkVersion: "v0.1",
        family: "invalid-family", // Invalid enum value
        title: "Bad task"
        // Missing required fields
      };

      const result = validate(invalidTask, 'task.schema.json');
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('environment.schema.json', () => {
     test('validates a correct environment', () => {
        const validEnv = {
            envId: "env-1",
            benchmarkVersion: "v0.1",
            toolBundle: "bundle-1",
            policyBundle: "policy-1",
            sandboxImage: "ubuntu",
            networkMode: "disabled",
            clockMode: "deterministic",
            randomSeed: 42
        };

        const result = validate(validEnv, 'environment.schema.json');
        expect(result.valid).toBe(true);
     });

     test('rejects an invalid environment', () => {
        const invalidEnv = {
            envId: "env-2",
            benchmarkVersion: "v0.1"
            // missing required fields
        };

        const result = validate(invalidEnv, 'environment.schema.json');
        expect(result.valid).toBe(false);
     });
  });
});

  describe('trace.schema.json', () => {
     test('validates a correct trace', () => {
        const validTrace = {
          eventId: "evt-1",
          runId: "run-1",
          ts: "2026-03-07T01:00:00Z",
          step: 1,
          actor: {
            type: "agent",
            id: "agent-1"
          },
          kind: "observation",
          payload: { info: "test" }
        };

        const result = validate(validTrace, 'trace.schema.json');
        expect(result.valid).toBe(true);
     });

     test('rejects an invalid trace', () => {
        const invalidTrace = {
          eventId: "evt-1"
          // missing required
        };

        const result = validate(invalidTrace, 'trace.schema.json');
        expect(result.valid).toBe(false);
     });
  });

  describe('score.schema.json', () => {
     test('validates a correct score', () => {
        const validScore = {
          runId: "run-1",
          benchmarkVersion: "v0.1",
          taskId: "task-1",
          agentId: "agent-1",
          success: true,
          metrics: {
             outcome: 1.0,
             efficiency: 0.8,
             governance: 1.0
          },
          weightedScore: 0.9,
          evaluatorVersion: "v1.0"
        };

        const result = validate(validScore, 'score.schema.json');
        expect(result.valid).toBe(true);
     });

     test('rejects an invalid score', () => {
        const invalidScore = {
          runId: "run-1"
          // missing required
        };

        const result = validate(invalidScore, 'score.schema.json');
        expect(result.valid).toBe(false);
     });
  });

  describe('run.schema.json', () => {
     test('validates a correct run', () => {
        const validRun = {
          runId: "run-1",
          benchmarkVersion: "v0.1",
          taskId: "task-1",
          agentId: "agent-1",
          environmentRef: "env-1",
          status: "completed",
          startTime: "2026-03-07T01:00:00Z"
        };

        const result = validate(validRun, 'run.schema.json');
        expect(result.valid).toBe(true);
     });

     test('rejects an invalid run', () => {
        const invalidRun = {
          runId: "run-1"
        };

        const result = validate(invalidRun, 'run.schema.json');
        expect(result.valid).toBe(false);
     });
  });
