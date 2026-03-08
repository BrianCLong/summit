"use strict";
/**
 * Media Pipeline Service Configuration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const zod_1 = require("zod");
const ConfigSchema = zod_1.z.object({
    // Server
    port: zod_1.z.coerce.number().default(4020),
    host: zod_1.z.string().default('0.0.0.0'),
    nodeEnv: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    // Logging
    logLevel: zod_1.z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
    // Database
    databaseUrl: zod_1.z.string().default('postgres://postgres:postgres@localhost:5432/media_pipeline'),
    // Redis
    redisUrl: zod_1.z.string().default('redis://localhost:6379'),
    // Service URLs
    graphCoreUrl: zod_1.z.string().default('http://localhost:3001'),
    provLedgerUrl: zod_1.z.string().default('http://localhost:4010'),
    spacetimeUrl: zod_1.z.string().default('http://localhost:4030'),
    queueManagerUrl: zod_1.z.string().default('http://localhost:3010'),
    // Storage
    storageProvider: zod_1.z.enum(['local', 's3', 'gcs', 'azure', 'minio']).default('local'),
    storageBucket: zod_1.z.string().default('media-assets'),
    storageRegion: zod_1.z.string().optional(),
    storageEndpoint: zod_1.z.string().optional(),
    localStoragePath: zod_1.z.string().default('/tmp/media-pipeline'),
    // STT Providers
    sttDefaultProvider: zod_1.z.string().default('mock'),
    sttOpenAIApiKey: zod_1.z.string().optional(),
    sttAWSRegion: zod_1.z.string().optional(),
    sttGoogleCredentials: zod_1.z.string().optional(),
    sttAzureKey: zod_1.z.string().optional(),
    sttAzureRegion: zod_1.z.string().optional(),
    // Diarization
    diarizationDefaultProvider: zod_1.z.string().default('mock'),
    diarizationPyAnnoteModel: zod_1.z.string().optional(),
    // Processing
    maxFileSizeBytes: zod_1.z.coerce.number().default(500 * 1024 * 1024), // 500MB
    maxDurationMs: zod_1.z.coerce.number().default(4 * 60 * 60 * 1000), // 4 hours
    maxConcurrentJobs: zod_1.z.coerce.number().default(10),
    jobTimeoutMs: zod_1.z.coerce.number().default(30 * 60 * 1000), // 30 minutes
    maxRetries: zod_1.z.coerce.number().default(3),
    retryDelayMs: zod_1.z.coerce.number().default(5000),
    // Policy
    policyDryRun: zod_1.z.coerce.boolean().default(false),
    defaultRetentionDays: zod_1.z.coerce.number().default(365),
    enableAutoRedaction: zod_1.z.coerce.boolean().default(true),
    // CORS
    corsOrigin: zod_1.z.string().default('http://localhost:3000'),
    // Auth
    authorityId: zod_1.z.string().default('media-pipeline-service'),
});
function loadConfig() {
    const rawConfig = {
        port: process.env.PORT,
        host: process.env.HOST,
        nodeEnv: process.env.NODE_ENV,
        logLevel: process.env.LOG_LEVEL,
        databaseUrl: process.env.DATABASE_URL,
        redisUrl: process.env.REDIS_URL,
        graphCoreUrl: process.env.GRAPH_CORE_URL,
        provLedgerUrl: process.env.PROV_LEDGER_URL,
        spacetimeUrl: process.env.SPACETIME_URL,
        queueManagerUrl: process.env.QUEUE_MANAGER_URL,
        storageProvider: process.env.STORAGE_PROVIDER,
        storageBucket: process.env.STORAGE_BUCKET,
        storageRegion: process.env.STORAGE_REGION,
        storageEndpoint: process.env.STORAGE_ENDPOINT,
        localStoragePath: process.env.LOCAL_STORAGE_PATH,
        sttDefaultProvider: process.env.STT_DEFAULT_PROVIDER,
        sttOpenAIApiKey: process.env.OPENAI_API_KEY,
        sttAWSRegion: process.env.AWS_REGION,
        sttGoogleCredentials: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        sttAzureKey: process.env.AZURE_SPEECH_KEY,
        sttAzureRegion: process.env.AZURE_SPEECH_REGION,
        diarizationDefaultProvider: process.env.DIARIZATION_DEFAULT_PROVIDER,
        diarizationPyAnnoteModel: process.env.PYANNOTE_MODEL,
        maxFileSizeBytes: process.env.MAX_FILE_SIZE_BYTES,
        maxDurationMs: process.env.MAX_DURATION_MS,
        maxConcurrentJobs: process.env.MAX_CONCURRENT_JOBS,
        jobTimeoutMs: process.env.JOB_TIMEOUT_MS,
        maxRetries: process.env.MAX_RETRIES,
        retryDelayMs: process.env.RETRY_DELAY_MS,
        policyDryRun: process.env.POLICY_DRY_RUN,
        defaultRetentionDays: process.env.DEFAULT_RETENTION_DAYS,
        enableAutoRedaction: process.env.ENABLE_AUTO_REDACTION,
        corsOrigin: process.env.CORS_ORIGIN,
        authorityId: process.env.AUTHORITY_ID,
    };
    const result = ConfigSchema.safeParse(rawConfig);
    if (!result.success) {
        console.error('Configuration validation failed:', result.error.flatten());
        throw new Error(`Invalid configuration: ${JSON.stringify(result.error.flatten())}`);
    }
    return result.data;
}
exports.config = loadConfig();
exports.default = exports.config;
