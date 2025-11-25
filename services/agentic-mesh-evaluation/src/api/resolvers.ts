/**
 * GraphQL Resolvers for Agentic Mesh Evaluation
 */

import type {
  MeshCoordinator,
  EvaluationEngine,
  MetricsCollector,
  MeshRegistry,
  CommunicationFabric,
} from '../index.js';

export interface ResolverContext {
  coordinator: typeof MeshCoordinator.prototype;
  evaluationEngine: typeof EvaluationEngine.prototype;
  metrics: typeof MetricsCollector.prototype;
  registry: typeof MeshRegistry.prototype;
  fabric: typeof CommunicationFabric.prototype;
}

export function createResolvers(services: {
  coordinator: MeshCoordinator;
  evaluationEngine: EvaluationEngine;
  metrics: MetricsCollector;
  registry: MeshRegistry;
  fabric: CommunicationFabric;
}) {
  const { coordinator, evaluationEngine, metrics, registry, fabric } =
    services;

  return {
    Query: {
      // Meshes
      mesh: async (_: any, { id }: { id: string }) => {
        return coordinator.getMesh(id);
      },

      meshes: async (
        _: any,
        {
          tenantId,
          limit = 100,
          offset = 0,
        }: { tenantId?: string; limit?: number; offset?: number }
      ) => {
        if (tenantId) {
          return registry.getMeshesByTenant(tenantId);
        }
        return coordinator.getAllMeshes().slice(offset, offset + limit);
      },

      // Evaluations
      evaluation: async (_: any, { id }: { id: string }) => {
        return evaluationEngine.getEvaluation(id);
      },

      evaluations: async (
        _: any,
        {
          meshId,
          scenario,
          limit = 100,
          offset = 0,
        }: {
          meshId?: string;
          scenario?: string;
          limit?: number;
          offset?: number;
        }
      ) => {
        let evals = evaluationEngine.getEvaluations(meshId);
        if (scenario) {
          evals = evals.filter((e) => e.scenario === scenario);
        }
        return evals.slice(offset, offset + limit);
      },

      // Tasks
      task: async (_: any, { id }: { id: string }) => {
        return coordinator.getTask(id);
      },

      tasks: async (
        _: any,
        {
          meshId,
          status,
          limit = 100,
          offset = 0,
        }: {
          meshId?: string;
          status?: string;
          limit?: number;
          offset?: number;
        }
      ) => {
        let tasks = coordinator.getAllTasks(meshId);
        if (status) {
          tasks = tasks.filter((t) => t.status === status);
        }
        return tasks.slice(offset, offset + limit);
      },

      // Metrics
      meshMetrics: async (_: any, { meshId }: { meshId: string }) => {
        return metrics.getMetrics(meshId);
      },

      nodeMetrics: async (
        _: any,
        { meshId, nodeId }: { meshId: string; nodeId: string }
      ) => {
        return null; // Implement node-specific metrics
      },

      timeSeriesMetrics: async (
        _: any,
        {
          meshId,
          startTime,
          endTime,
        }: { meshId: string; startTime: Date; endTime: Date }
      ) => {
        return metrics.getTimeSeriesMetrics(
          meshId,
          startTime.getTime(),
          endTime.getTime()
        );
      },
    },

    Mutation: {
      // Mesh Operations
      createMesh: async (_: any, { input }: { input: any }) => {
        return coordinator.createMesh(input);
      },

      updateMesh: async (
        _: any,
        { id, input }: { id: string; input: any }
      ) => {
        const mesh = coordinator.getMesh(id);
        if (!mesh) throw new Error('Mesh not found');

        if (input.name) mesh.name = input.name;
        if (input.description) mesh.description = input.description;
        if (input.tags) mesh.tags = input.tags;

        mesh.updatedAt = new Date();
        return mesh;
      },

      deleteMesh: async (_: any, { id }: { id: string }) => {
        await coordinator.deleteMesh(id);
        return true;
      },

      startMesh: async (_: any, { id }: { id: string }) => {
        await coordinator.startMesh(id);
        return coordinator.getMesh(id);
      },

      stopMesh: async (_: any, { id }: { id: string }) => {
        await coordinator.stopMesh(id);
        return coordinator.getMesh(id);
      },

      // Node Operations
      addNode: async (
        _: any,
        { meshId, input }: { meshId: string; input: any }
      ) => {
        return coordinator.addNode(meshId, input);
      },

      removeNode: async (
        _: any,
        { meshId, nodeId }: { meshId: string; nodeId: string }
      ) => {
        await coordinator.removeNode(meshId, nodeId);
        return true;
      },

      // Evaluation Operations
      startEvaluation: async (_: any, { input }: { input: any }) => {
        return evaluationEngine.startEvaluation(input);
      },

      cancelEvaluation: async (_: any, { id }: { id: string }) => {
        const evaluation = evaluationEngine.getEvaluation(id);
        if (!evaluation) throw new Error('Evaluation not found');

        evaluation.status = 'cancelled';
        evaluation.completedAt = new Date();
        return evaluation;
      },

      // Task Operations
      submitTask: async (_: any, { input }: { input: any }) => {
        return coordinator.submitTask(input);
      },

      cancelTask: async (_: any, { id }: { id: string }) => {
        const task = coordinator.getTask(id);
        if (!task) throw new Error('Task not found');

        task.status = 'cancelled';
        task.completedAt = new Date();
        return task;
      },
    },

    Subscription: {
      meshUpdated: {
        subscribe: async function* (_: any, { meshId }: { meshId: string }) {
          while (true) {
            const mesh = coordinator.getMesh(meshId);
            if (mesh) {
              yield { meshUpdated: mesh };
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        },
      },

      evaluationUpdated: {
        subscribe: async function* (
          _: any,
          { evaluationId }: { evaluationId: string }
        ) {
          while (true) {
            const evaluation =
              evaluationEngine.getEvaluation(evaluationId);
            if (evaluation) {
              yield { evaluationUpdated: evaluation };

              if (['completed', 'failed', 'cancelled'].includes(evaluation.status)) {
                break;
              }
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        },
      },

      metricsUpdated: {
        subscribe: async function* (_: any, { meshId }: { meshId: string }) {
          while (true) {
            const meshMetrics = await metrics.getMetrics(meshId);
            if (meshMetrics) {
              yield { metricsUpdated: meshMetrics };
            }
            await new Promise((resolve) => setTimeout(resolve, 5000));
          }
        },
      },

      taskUpdated: {
        subscribe: async function* (_: any, { taskId }: { taskId: string }) {
          while (true) {
            const task = coordinator.getTask(taskId);
            if (task) {
              yield { taskUpdated: task };

              if (['completed', 'failed', 'cancelled', 'timeout'].includes(task.status)) {
                break;
              }
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        },
      },
    },
  };
}
