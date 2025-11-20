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
        jwtSecret: any;
        jwtExpiresIn: any;
    };
    monitoring: {
        metricsEnabled: boolean;
        metricsPort: number;
        logLevel: any;
    };
};
