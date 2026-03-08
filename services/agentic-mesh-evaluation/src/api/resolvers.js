"use strict";
/**
 * GraphQL Resolvers for Agentic Mesh Evaluation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createResolvers = createResolvers;
function createResolvers(services) {
    const { coordinator, evaluationEngine, metrics, registry, fabric } = services;
    return {
        Query: {
            // Meshes
            mesh: async (_, { id }) => {
                return coordinator.getMesh(id);
            },
            meshes: async (_, { tenantId, limit = 100, offset = 0, }) => {
                if (tenantId) {
                    return registry.getMeshesByTenant(tenantId);
                }
                return coordinator.getAllMeshes().slice(offset, offset + limit);
            },
            // Evaluations
            evaluation: async (_, { id }) => {
                return evaluationEngine.getEvaluation(id);
            },
            evaluations: async (_, { meshId, scenario, limit = 100, offset = 0, }) => {
                let evals = evaluationEngine.getEvaluations(meshId);
                if (scenario) {
                    evals = evals.filter((e) => e.scenario === scenario);
                }
                return evals.slice(offset, offset + limit);
            },
            // Tasks
            task: async (_, { id }) => {
                return coordinator.getTask(id);
            },
            tasks: async (_, { meshId, status, limit = 100, offset = 0, }) => {
                let tasks = coordinator.getAllTasks(meshId);
                if (status) {
                    tasks = tasks.filter((t) => t.status === status);
                }
                return tasks.slice(offset, offset + limit);
            },
            // Metrics
            meshMetrics: async (_, { meshId }) => {
                return metrics.getMetrics(meshId);
            },
            nodeMetrics: async (_, { meshId, nodeId }) => {
                return null; // Implement node-specific metrics
            },
            timeSeriesMetrics: async (_, { meshId, startTime, endTime, }) => {
                return metrics.getTimeSeriesMetrics(meshId, startTime.getTime(), endTime.getTime());
            },
        },
        Mutation: {
            // Mesh Operations
            createMesh: async (_, { input }) => {
                return coordinator.createMesh(input);
            },
            updateMesh: async (_, { id, input }) => {
                const mesh = coordinator.getMesh(id);
                if (!mesh)
                    throw new Error('Mesh not found');
                if (input.name)
                    mesh.name = input.name;
                if (input.description)
                    mesh.description = input.description;
                if (input.tags)
                    mesh.tags = input.tags;
                mesh.updatedAt = new Date();
                return mesh;
            },
            deleteMesh: async (_, { id }) => {
                await coordinator.deleteMesh(id);
                return true;
            },
            startMesh: async (_, { id }) => {
                await coordinator.startMesh(id);
                return coordinator.getMesh(id);
            },
            stopMesh: async (_, { id }) => {
                await coordinator.stopMesh(id);
                return coordinator.getMesh(id);
            },
            // Node Operations
            addNode: async (_, { meshId, input }) => {
                return coordinator.addNode(meshId, input);
            },
            removeNode: async (_, { meshId, nodeId }) => {
                await coordinator.removeNode(meshId, nodeId);
                return true;
            },
            // Evaluation Operations
            startEvaluation: async (_, { input }) => {
                return evaluationEngine.startEvaluation(input);
            },
            cancelEvaluation: async (_, { id }) => {
                const evaluation = evaluationEngine.getEvaluation(id);
                if (!evaluation)
                    throw new Error('Evaluation not found');
                evaluation.status = 'cancelled';
                evaluation.completedAt = new Date();
                return evaluation;
            },
            // Task Operations
            submitTask: async (_, { input }) => {
                return coordinator.submitTask(input);
            },
            cancelTask: async (_, { id }) => {
                const task = coordinator.getTask(id);
                if (!task)
                    throw new Error('Task not found');
                task.status = 'cancelled';
                task.completedAt = new Date();
                return task;
            },
        },
        Subscription: {
            meshUpdated: {
                subscribe: async function* (_, { meshId }) {
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
                subscribe: async function* (_, { evaluationId }) {
                    while (true) {
                        const evaluation = evaluationEngine.getEvaluation(evaluationId);
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
                subscribe: async function* (_, { meshId }) {
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
                subscribe: async function* (_, { taskId }) {
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
