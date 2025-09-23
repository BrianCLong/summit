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
    ml: {
        python: {
            scriptPath: string;
            pythonExecutable: string;
        };
        models: {
            defaultSentenceModel: string;
            cacheDir: string;
            maxCacheSize: number;
        };
        entityResolution: {
            defaultThreshold: number;
            maxBatchSize: number;
            trainingDataRetentionDays: number;
        };
    };
    redis: {
        host: string;
        port: number;
        password: string;
        db: number;
    };
    monitoring: {
        metricsEnabled: boolean;
        metricsPort: number;
        logLevel: string;
    };
};
//# sourceMappingURL=config.d.ts.map