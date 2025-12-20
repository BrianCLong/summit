import { Driver } from 'neo4j-driver';
import { Pool } from 'pg';
import { RedisClientType } from 'redis';
export interface GraphNode {
    id: string;
    labels: string[];
    properties: Record<string, any>;
    degree?: number;
    centrality?: {
        betweenness: number;
        closeness: number;
        eigenvector: number;
        pagerank: number;
    };
    clustering?: number;
    community?: string;
}
export interface GraphEdge {
    id: string;
    source: string;
    target: string;
    type: string;
    properties: Record<string, any>;
    weight?: number;
    direction?: 'directed' | 'undirected';
}
export interface GraphSubnet {
    id: string;
    name: string;
    nodes: GraphNode[];
    edges: GraphEdge[];
    metrics: {
        nodeCount: number;
        edgeCount: number;
        density: number;
        clustering: number;
        diameter?: number;
        modularity?: number;
    };
    communities?: Community[];
}
export interface Community {
    id: string;
    nodes: string[];
    size: number;
    density: number;
    modularity: number;
    description?: string;
}
export interface PathAnalysis {
    source: string;
    target: string;
    paths: {
        path: string[];
        length: number;
        weight?: number;
        relationships: string[];
    }[];
    shortestPath?: {
        path: string[];
        length: number;
        weight?: number;
    };
    allPaths: number;
}
export interface InfluenceAnalysis {
    nodeId: string;
    influenceScore: number;
    directInfluence: number;
    indirectInfluence: number;
    reachability: number;
    propagationPotential: number;
    keyConnections: {
        nodeId: string;
        relationshipType: string;
        strength: number;
    }[];
}
export interface AnomalyDetection {
    type: 'structural' | 'behavioral' | 'temporal';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    affectedNodes: string[];
    affectedEdges: string[];
    confidence: number;
    timestamp: Date;
    metrics: Record<string, number>;
}
export interface GraphPattern {
    id: string;
    name: string;
    description: string;
    pattern: string;
    significance: number;
    occurrences: number;
    examples: {
        nodes: string[];
        relationships: string[];
        context: Record<string, any>;
    }[];
}
export interface TemporalAnalysis {
    timeframe: {
        start: Date;
        end: Date;
    };
    snapshots: {
        timestamp: Date;
        nodeCount: number;
        edgeCount: number;
        density: number;
        components: number;
        newNodes: string[];
        removedNodes: string[];
        newEdges: string[];
        removedEdges: string[];
    }[];
    trends: {
        growth: 'increasing' | 'decreasing' | 'stable';
        volatility: number;
        periodicity?: number;
    };
}
export declare class GraphAnalyticsService {
    private neo4jDriver;
    private pgPool;
    private redisClient;
    constructor(neo4jDriver: Driver, pgPool: Pool, redisClient: RedisClientType);
    analyzeNetworkStructure(filters?: {
        nodeLabels?: string[];
        relationshipTypes?: string[];
        maxDepth?: number;
        minDegree?: number;
    }): Promise<{
        overview: {
            totalNodes: number;
            totalEdges: number;
            density: number;
            avgDegree: number;
            components: number;
            diameter?: number;
            clustering: number;
        };
        topNodes: {
            byDegree: GraphNode[];
            byCentrality: GraphNode[];
            byPageRank: GraphNode[];
        };
        communities: Community[];
    }>;
    findShortestPaths(sourceId: string, targetId: string, options?: {
        maxLength?: number;
        relationshipTypes?: string[];
        direction?: 'OUTGOING' | 'INCOMING' | 'BOTH';
        weightProperty?: string;
    }): Promise<PathAnalysis>;
    analyzeInfluence(nodeId: string, depth?: number, relationshipTypes?: string[]): Promise<InfluenceAnalysis>;
    detectAnomalies(options?: {
        types?: ('structural' | 'behavioral' | 'temporal')[];
        timeWindow?: {
            start: Date;
            end: Date;
        };
        thresholds?: {
            degreeOutlier: number;
            clusteringAnomaly: number;
            temporalSpike: number;
        };
    }): Promise<AnomalyDetection[]>;
    findPatterns(patternTemplates: {
        name: string;
        description: string;
        cypherPattern: string;
        minOccurrences?: number;
    }[]): Promise<GraphPattern[]>;
    analyzeTemporalEvolution(timeframe: {
        start: Date;
        end: Date;
    }, intervals?: number): Promise<TemporalAnalysis>;
    private calculateCentralityMetrics;
    private detectCommunities;
    private calculateGlobalClustering;
    private getTopNodesByDegree;
    private getTopNodesByCentrality;
    private getTopNodesByPageRank;
    private getNetworkSize;
    private detectStructuralAnomalies;
    private detectBehavioralAnomalies;
    private detectTemporalAnomalies;
    private cacheResult;
    private getCachedResult;
}
