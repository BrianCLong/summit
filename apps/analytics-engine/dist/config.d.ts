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
        cacheEnabled: boolean;
        defaultCacheTTL: number;
        maxQueryTimeout: number;
        maxResultSize: number;
        enableQueryLogging: boolean;
    };
    dashboard: {
        maxWidgetsPerDashboard: number;
        maxDashboardsPerUser: number;
        defaultRefreshInterval: number;
        allowPublicDashboards: boolean;
    };
    export: {
        enablePdfExport: boolean;
        enableCsvExport: boolean;
        maxExportSize: number;
        exportTimeout: number;
    };
    auth: {
        jwtSecret: string;
        jwtExpiresIn: string;
    };
    monitoring: {
        metricsEnabled: boolean;
        metricsPort: number;
        logLevel: string;
    };
};
