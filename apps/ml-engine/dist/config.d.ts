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
    ml: {
        python: {
            scriptPath: any;
            pythonExecutable: any;
        };
        models: {
            defaultSentenceModel: any;
            cacheDir: any;
            maxCacheSize: number;
        };
        entityResolution: {
            defaultThreshold: number;
            maxBatchSize: number;
            trainingDataRetentionDays: number;
        };
    };
    redis: {
        host: any;
        port: number;
        password: any;
        db: number;
    };
    monitoring: {
        metricsEnabled: boolean;
        metricsPort: number;
        logLevel: any;
    };
};
