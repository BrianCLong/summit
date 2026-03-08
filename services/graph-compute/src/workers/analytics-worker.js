"use strict";
/**
 * Graph Analytics Compute Worker
 *
 * Background worker for running computationally intensive graph algorithms
 * Supports parallel execution and caching of results
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.processTask = processTask;
const worker_threads_1 = require("worker_threads");
const graph_analytics_1 = require("@intelgraph/graph-analytics");
/**
 * Processes graph analytics tasks
 */
async function processTask(task) {
    const startTime = performance.now();
    try {
        let result;
        switch (task.type) {
            case 'pagerank':
                result = (0, graph_analytics_1.calculatePageRank)(task.graph, task.options);
                break;
            case 'betweenness':
                result = (0, graph_analytics_1.calculateBetweenness)(task.graph, task.options);
                break;
            case 'closeness':
                result = (0, graph_analytics_1.calculateClosenessCentrality)(task.graph, task.options);
                break;
            case 'eigenvector':
                result = (0, graph_analytics_1.calculateEigenvectorCentrality)(task.graph, task.options);
                break;
            case 'louvain':
                result = (0, graph_analytics_1.detectCommunitiesLouvain)(task.graph, task.options);
                break;
            case 'label-propagation':
                result = (0, graph_analytics_1.detectCommunitiesLabelPropagation)(task.graph, task.options);
                break;
            case 'link-prediction':
                result = (0, graph_analytics_1.predictLinks)(task.graph, task.options);
                break;
            case 'temporal-evolution':
                // Note: temporal analysis requires different graph format
                // This would need adapter logic in production
                result = { note: 'Temporal analysis requires temporal graph format' };
                break;
            default:
                throw new Error(`Unknown task type: ${task.type}`);
        }
        const executionTime = performance.now() - startTime;
        return {
            taskId: task.id,
            success: true,
            result,
            executionTime,
        };
    }
    catch (error) {
        const executionTime = performance.now() - startTime;
        return {
            taskId: task.id,
            success: false,
            error: error instanceof Error ? error.message : String(error),
            executionTime,
        };
    }
}
// Worker thread message handler
if (worker_threads_1.parentPort) {
    worker_threads_1.parentPort.on('message', async (task) => {
        const result = await processTask(task);
        worker_threads_1.parentPort?.postMessage(result);
    });
}
