import { explainDegreeCentrality, explainCommunity, AdjacencyList } from '../../server/src/graph/xai';
import { performance } from 'perf_hooks';

/**
 * Benchmark Suite for Graph-XAI Methods
 * Generates synthetic graphs and measures execution time and explanation characteristics.
 */

// Helper to generate a random Barabasi-Albert like graph (Preferential Attachment simulation)
// or just simple random graph for speed.
function generateRandomGraph(nodes: number, edgeProbability: number): AdjacencyList {
    const graph: AdjacencyList = new Map();
    const nodeList: string[] = [];

    // Initialize nodes
    for (let i = 0; i < nodes; i++) {
        const id = `node_${i}`;
        graph.set(id, []);
        nodeList.push(id);
    }

    // Add edges
    for (let i = 0; i < nodes; i++) {
        for (let j = i + 1; j < nodes; j++) {
            if (Math.random() < edgeProbability) {
                const u = nodeList[i];
                const v = nodeList[j];
                graph.get(u)?.push(v);
                graph.get(v)?.push(u);
            }
        }
    }
    return graph;
}

function runBenchmark() {
    console.log("=== Running Graph-XAI Benchmarks ===");

    const NODE_COUNTS = [100, 1000, 5000];
    const ITERATIONS = 100;

    console.log("| Nodes | Method | Avg Time (ms) | Avg Sparsity |");
    console.log("|---|---|---|---|");

    for (const count of NODE_COUNTS) {
        // Setup Graph
        const graph = generateRandomGraph(count, 0.05); // Sparse graph
        const targetNode = `node_${Math.floor(count / 2)}`;
        const neighbors = graph.get(targetNode)?.length || 0;

        // Benchmark: Centrality Explanation
        let totalTime = 0;
        let totalExplanationSize = 0;

        for (let i = 0; i < ITERATIONS; i++) {
            const start = performance.now();
            const result = explainDegreeCentrality(graph, targetNode, 5);
            const end = performance.now();
            totalTime += (end - start);
            totalExplanationSize += result.length;
        }

        const avgTime = (totalTime / ITERATIONS).toFixed(4);
        const avgSize = totalExplanationSize / ITERATIONS;
        const sparsity = (1 - (avgSize / Math.max(1, neighbors))).toFixed(2);

        console.log(`| ${count} | Degree Centrality Expl | ${avgTime} | ${sparsity} |`);

        // Benchmark: Community Explanation (Mock Labels)
        const communities = new Map<string, string>();
        for (let i = 0; i < count; i++) {
            communities.set(`node_${i}`, Math.random() > 0.5 ? 'A' : 'B');
        }

        totalTime = 0;

        for (let i = 0; i < ITERATIONS; i++) {
            const start = performance.now();
            explainCommunity(graph, communities, targetNode);
            const end = performance.now();
            totalTime += (end - start);
        }

        const avgTimeComm = (totalTime / ITERATIONS).toFixed(4);
        console.log(`| ${count} | Community Expl | ${avgTimeComm} | N/A |`);
    }
}

runBenchmark();
