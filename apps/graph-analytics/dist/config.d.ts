export declare const config: {
    server: {
        port: number;
        allowedOrigins: any;
        environment: any;
    };
    database: {
        postgres: {
            host: any;
            port: number;
            user: any;
            password: any;
            database: any;
            ssl: boolean | {
                rejectUnauthorized: boolean;
            };
        };
        neo4j: {
            uri: any;
            user: any;
            password: any;
        };
    };
    redis: {
        host: any;
        port: number;
        password: any;
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
        defaultLayout: any;
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
            algorithm: any;
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
        jwtSecret: any;
        jwtExpiresIn: any;
    };
    monitoring: {
        metricsEnabled: boolean;
        metricsPort: number;
        logLevel: any;
        enablePerformanceLogging: boolean;
    };
};
