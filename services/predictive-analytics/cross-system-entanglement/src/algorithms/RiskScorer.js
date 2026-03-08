"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskScorer = void 0;
const pino_1 = __importDefault(require("pino"));
const RiskScore_js_1 = require("../models/RiskScore.js");
const logger = (0, pino_1.default)({ name: 'RiskScorer' });
class RiskScorer {
    config;
    constructor(config = {}) {
        this.config = {
            cascadeWeight: config.cascadeWeight ?? 0.5,
            centralityWeight: config.centralityWeight ?? 0.3,
            couplingWeight: config.couplingWeight ?? 0.2,
            maxPathDepth: config.maxPathDepth ?? 3,
            monteCarloIterations: config.monteCarloIterations ?? 10000,
        };
    }
    /**
     * Calculate risk scores for all systems
     */
    async calculateRiskScores(systemIds, couplings) {
        logger.info({ systemCount: systemIds.length, couplingCount: couplings.length }, 'Starting risk score calculation');
        const graph = this.buildGraph(systemIds, couplings);
        const riskScores = new Map();
        for (const systemId of systemIds) {
            const riskScore = await this.calculateSystemRisk(systemId, graph, couplings);
            riskScores.set(systemId, riskScore);
        }
        logger.info({ scoresCalculated: riskScores.size }, 'Risk score calculation complete');
        return riskScores;
    }
    /**
     * Calculate risk score for a specific system
     */
    async calculateSystemRisk(systemId, graph, allCouplings) {
        // 1. Compute centrality metrics
        const centrality = this.calculateCentrality(systemId, graph);
        // 2. Identify critical paths
        const criticalPaths = this.findCriticalPaths(systemId, graph);
        // 3. Calculate cascade risk
        const cascadeRisk = this.calculateCascadeRisk(systemId, criticalPaths);
        // 4. Count couplings
        const couplingCount = this.getSystemCouplings(systemId, allCouplings).length;
        // 5. Calculate overall risk
        const overallRisk = (0, RiskScore_js_1.calculateOverallRisk)(cascadeRisk, centrality.betweenness, couplingCount, {
            cascade: this.config.cascadeWeight,
            centrality: this.config.centralityWeight,
            coupling: this.config.couplingWeight,
        });
        // 6. Generate recommendations
        const builder = new RiskScore_js_1.RiskScoreBuilder()
            .withSystemId(systemId)
            .withOverallRisk(overallRisk)
            .withCascadeRisk(cascadeRisk)
            .withImpactRadius(criticalPaths.length);
        for (const path of criticalPaths) {
            builder.withCriticalPath(path);
        }
        const riskScore = builder.build();
        const recommendations = (0, RiskScore_js_1.generateRecommendations)(riskScore);
        for (const recommendation of recommendations) {
            builder.withRecommendation(recommendation);
        }
        return builder.build();
    }
    /**
     * Build directed graph from couplings
     */
    buildGraph(systemIds, couplings) {
        const nodes = new Set(systemIds);
        const edges = new Map();
        for (const systemId of systemIds) {
            edges.set(systemId, []);
        }
        for (const coupling of couplings) {
            const sourceEdges = edges.get(coupling.sourceSystem) || [];
            sourceEdges.push({
                target: coupling.targetSystem,
                coupling,
            });
            edges.set(coupling.sourceSystem, sourceEdges);
            // For bidirectional couplings, add reverse edge
            if (coupling.couplingType === 'BIDIRECTIONAL') {
                const targetEdges = edges.get(coupling.targetSystem) || [];
                targetEdges.push({
                    target: coupling.sourceSystem,
                    coupling: {
                        ...coupling,
                        sourceSystem: coupling.targetSystem,
                        targetSystem: coupling.sourceSystem,
                    },
                });
                edges.set(coupling.targetSystem, targetEdges);
            }
        }
        return { nodes, edges };
    }
    /**
     * Calculate centrality metrics for a system
     */
    calculateCentrality(systemId, graph) {
        // Simplified centrality calculations
        // Production implementation would use more sophisticated graph algorithms
        // Betweenness: How often system appears on shortest paths
        const betweenness = this.calculateBetweenness(systemId, graph);
        // PageRank: Importance based on network position
        const pageRank = this.calculatePageRank(systemId, graph);
        return {
            betweenness,
            eigenvector: pageRank, // Simplified: using PageRank as proxy
            pageRank,
        };
    }
    /**
     * Simplified betweenness centrality calculation
     */
    calculateBetweenness(systemId, graph) {
        let pathCount = 0;
        let systemOnPathCount = 0;
        const systems = Array.from(graph.nodes);
        for (let i = 0; i < systems.length; i++) {
            for (let j = i + 1; j < systems.length; j++) {
                const source = systems[i];
                const target = systems[j];
                if (source === systemId || target === systemId) {
                    continue;
                }
                const paths = this.findAllPaths(source, target, graph, 3);
                for (const path of paths) {
                    pathCount++;
                    if (path.includes(systemId)) {
                        systemOnPathCount++;
                    }
                }
            }
        }
        return pathCount > 0 ? systemOnPathCount / pathCount : 0;
    }
    /**
     * Simplified PageRank calculation
     */
    calculatePageRank(systemId, graph) {
        const dampingFactor = 0.85;
        const iterations = 10;
        const n = graph.nodes.size;
        const pageRanks = new Map();
        for (const node of graph.nodes) {
            pageRanks.set(node, 1 / n);
        }
        for (let iter = 0; iter < iterations; iter++) {
            const newRanks = new Map();
            for (const node of graph.nodes) {
                let rank = (1 - dampingFactor) / n;
                // Add contribution from incoming edges
                for (const [source, edges] of graph.edges) {
                    for (const edge of edges) {
                        if (edge.target === node) {
                            const sourceOutDegree = graph.edges.get(source)?.length || 1;
                            const sourceRank = pageRanks.get(source) || 0;
                            rank += (dampingFactor * sourceRank * edge.coupling.strength) / sourceOutDegree;
                        }
                    }
                }
                newRanks.set(node, rank);
            }
            for (const [node, rank] of newRanks) {
                pageRanks.set(node, rank);
            }
        }
        return pageRanks.get(systemId) || 0;
    }
    /**
     * Find critical failure propagation paths from a system
     */
    findCriticalPaths(systemId, graph) {
        const paths = [];
        const visited = new Set();
        this.dfsPath(systemId, [systemId], 1.0, 0, graph, visited, paths);
        // Sort by propagation probability
        paths.sort((a, b) => b.propagationProbability - a.propagationProbability);
        return paths.slice(0, 20); // Return top 20 paths
    }
    /**
     * Depth-first search for paths with risk propagation
     */
    dfsPath(currentNode, currentPath, currentProb, currentLatency, graph, visited, paths) {
        if (currentPath.length > this.config.maxPathDepth) {
            return;
        }
        if (currentPath.length >= 2) {
            paths.push((0, RiskScore_js_1.createCriticalPath)([...currentPath], currentProb, currentLatency));
        }
        const edges = graph.edges.get(currentNode) || [];
        for (const edge of edges) {
            if (!visited.has(edge.target)) {
                visited.add(edge.target);
                const edgeProb = edge.coupling.strength * edge.coupling.metadata.failureCorrelation;
                const edgeLag = edge.coupling.metadata.latencyCorrelation * 1000; // Estimate in ms
                this.dfsPath(edge.target, [...currentPath, edge.target], currentProb * edgeProb, currentLatency + edgeLag, graph, visited, paths);
                visited.delete(edge.target);
            }
        }
    }
    /**
     * Find all paths between two systems
     */
    findAllPaths(source, target, graph, maxDepth) {
        const paths = [];
        const visited = new Set();
        const dfs = (current, path) => {
            if (path.length > maxDepth) {
                return;
            }
            if (current === target) {
                paths.push([...path]);
                return;
            }
            const edges = graph.edges.get(current) || [];
            for (const edge of edges) {
                if (!visited.has(edge.target)) {
                    visited.add(edge.target);
                    dfs(edge.target, [...path, edge.target]);
                    visited.delete(edge.target);
                }
            }
        };
        visited.add(source);
        dfs(source, [source]);
        return paths;
    }
    /**
     * Calculate cascade risk using critical paths
     */
    calculateCascadeRisk(systemId, paths) {
        if (paths.length === 0) {
            return 0;
        }
        // Cascade risk is weighted average of path probabilities
        let totalRisk = 0;
        let totalWeight = 0;
        for (const path of paths) {
            const weight = path.path.length; // Longer paths are more significant
            totalRisk += path.propagationProbability * weight;
            totalWeight += weight;
        }
        return totalWeight > 0 ? totalRisk / totalWeight : 0;
    }
    /**
     * Get all couplings for a system
     */
    getSystemCouplings(systemId, couplings) {
        return couplings.filter((c) => c.sourceSystem === systemId || c.targetSystem === systemId);
    }
    /**
     * Monte Carlo simulation of failure propagation
     */
    async monteCarloSimulation(graph, iterations = 10000) {
        logger.info({ iterations }, 'Starting Monte Carlo simulation');
        const involvementCounts = new Map();
        for (const node of graph.nodes) {
            involvementCounts.set(node, 0);
        }
        for (let i = 0; i < iterations; i++) {
            const failureOrigin = this.selectRandomNode(graph);
            const affectedSystems = this.simulateFailure(failureOrigin, graph);
            for (const system of affectedSystems) {
                involvementCounts.set(system, (involvementCounts.get(system) || 0) + 1);
            }
        }
        // Normalize by iteration count
        const normalizedInvolvement = new Map();
        for (const [system, count] of involvementCounts) {
            normalizedInvolvement.set(system, count / iterations);
        }
        logger.info('Monte Carlo simulation complete');
        return normalizedInvolvement;
    }
    /**
     * Select random node from graph
     */
    selectRandomNode(graph) {
        const nodes = Array.from(graph.nodes);
        return nodes[Math.floor(Math.random() * nodes.length)];
    }
    /**
     * Simulate failure propagation from a node
     */
    simulateFailure(origin, graph) {
        const affected = new Set([origin]);
        const queue = [origin];
        while (queue.length > 0) {
            const current = queue.shift();
            const edges = graph.edges.get(current) || [];
            for (const edge of edges) {
                if (!affected.has(edge.target)) {
                    // Probabilistic propagation based on coupling strength
                    const propagates = Math.random() < edge.coupling.strength;
                    if (propagates) {
                        affected.add(edge.target);
                        queue.push(edge.target);
                    }
                }
            }
        }
        return affected;
    }
}
exports.RiskScorer = RiskScorer;
