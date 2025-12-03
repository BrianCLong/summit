export declare const config: {
    server: {
        port: number;
        allowedOrigins: string[];
        environment: string;
    };
    database: {
        postgres: {
            host: string;
            port: number;
            user: string;
            password: string;
            database: string;
            ssl: boolean | {
                rejectUnauthorized: boolean;
            };
        };
        neo4j: {
            uri: string;
            user: string;
            password: string;
        };
    };
    redis: {
        host: string;
        port: number;
        password: string;
        db: number;
    };
    analytics: {
        maxQueryTimeout: number;
        maxNodesPerAnalysis: number;
        maxEdgesPerAnalysis: number;
        cacheEnabled: boolean;
        defaultCacheTTL: number;
        enableAdvancedAlgorithms: boolean;
    };
    visualization: {
        maxNodesPerVisualization: number;
        maxEdgesPerVisualization: number;
        defaultLayout: string;
        enableLayoutOptimization: boolean;
        imageExportEnabled: boolean;
        svgExportEnabled: boolean;
    };
    algorithms: {
        centrality: {
            maxIterations: number;
            tolerance: number;
            dampingFactor: number;
        };
        communityDetection: {
            algorithm: string;
            resolution: number;
            maxIterations: number;
        };
        pathfinding: {
            maxDepth: number;
            maxPaths: number;
            enableWeighted: boolean;
        };
    };
    anomalyDetection: {
        enableStructural: boolean;
        enableBehavioral: boolean;
        enableTemporal: boolean;
        thresholds: {
            degreeOutlier: number;
            clusteringAnomaly: number;
            temporalSpike: number;
        };
    };
    auth: {
        jwtSecret: string;
        jwtExpiresIn: string;
    };
    monitoring: {
        metricsEnabled: boolean;
        metricsPort: number;
        logLevel: string;
        enablePerformanceLogging: boolean;
    };
};
