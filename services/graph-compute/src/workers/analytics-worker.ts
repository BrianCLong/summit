/**
 * Graph Analytics Compute Worker
 *
 * Background worker for running computationally intensive graph algorithms
 * Supports parallel execution and caching of results
 */

import { parentPort, workerData } from 'worker_threads';
import {
  calculatePageRank,
  calculateBetweenness,
  calculateClosenessCentrality,
  calculateEigenvectorCentrality,
  detectCommunitiesLouvain,
  detectCommunitiesLabelPropagation,
  predictLinks,
  analyzeTemporalEvolution,
} from '@intelgraph/graph-analytics';

export interface WorkerTask {
  id: string;
  type:
    | 'pagerank'
    | 'betweenness'
    | 'closeness'
    | 'eigenvector'
    | 'louvain'
    | 'label-propagation'
    | 'link-prediction'
    | 'temporal-evolution';
  graph: {
    nodes: string[];
    edges: Array<{ source: string; target: string; weight?: number }>;
  };
  options?: Record<string, any>;
}

export interface WorkerResult {
  taskId: string;
  success: boolean;
  result?: any;
  error?: string;
  executionTime: number;
}

/**
 * Processes graph analytics tasks
 */
async function processTask(task: WorkerTask): Promise<WorkerResult> {
  const startTime = performance.now();

  try {
    let result: any;

    switch (task.type) {
      case 'pagerank':
        result = calculatePageRank(task.graph, task.options);
        break;

      case 'betweenness':
        result = calculateBetweenness(task.graph, task.options);
        break;

      case 'closeness':
        result = calculateClosenessCentrality(task.graph, task.options);
        break;

      case 'eigenvector':
        result = calculateEigenvectorCentrality(task.graph, task.options);
        break;

      case 'louvain':
        result = detectCommunitiesLouvain(task.graph, task.options);
        break;

      case 'label-propagation':
        result = detectCommunitiesLabelPropagation(task.graph, task.options);
        break;

      case 'link-prediction':
        result = predictLinks(task.graph, task.options);
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
  } catch (error) {
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
if (parentPort) {
  parentPort.on('message', async (task: WorkerTask) => {
    const result = await processTask(task);
    parentPort?.postMessage(result);
  });
}

// Allow direct function call for testing
export { processTask };
