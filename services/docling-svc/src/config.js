"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = void 0;
const zod_1 = require("zod");
const EnvSchema = zod_1.z.object({
    PORT: zod_1.z.string().default('7100'),
    HOST: zod_1.z.string().default('0.0.0.0'),
    METRICS_PORT: zod_1.z.string().default('9109'),
    GRANITE_DOCLING_ENDPOINT: zod_1.z.string().url().optional(),
    GRANITE_DOCLING_API_KEY: zod_1.z.string().optional(),
    GRANITE_DOCLING_MODEL_ID: zod_1.z.string().default('granite-docling-258m'),
    GRANITE_DOCLING_MAX_TOKENS: zod_1.z.string().default('2048'),
    GRANITE_DOCLING_TIMEOUT_MS: zod_1.z.string().default('120000'),
    GRANITE_DOCLING_PRICE_PER_1K_CHARS: zod_1.z.string().default('0.04'),
    PURPOSE_POLICY: zod_1.z.string().default('docling/purpose_enforcement'),
    RETENTION_POLICY: zod_1.z.string().default('docling/retention_enforcement'),
    LICENSE_POLICY: zod_1.z.string().default('docling/license_enforcement'),
    MTLS_ENABLED: zod_1.z.string().default('false'),
    MTLS_CERT_PATH: zod_1.z.string().optional(),
    MTLS_KEY_PATH: zod_1.z.string().optional(),
    MTLS_CA_PATH: zod_1.z.string().optional(),
    CACHE_TTL_SECONDS: zod_1.z.string().default('900'),
    MAX_CACHE_ENTRIES: zod_1.z.string().default('500'),
    LOG_LEVEL: zod_1.z.string().default('info'),
    OTEL_SERVICE_NAME: zod_1.z.string().default('docling-svc'),
    OTEL_EXPORTER_OTLP_ENDPOINT: zod_1.z.string().optional(),
});
const loadConfig = () => {
    const parsed = EnvSchema.parse(process.env);
    return {
        ...parsed,
        port: parseInt(parsed.PORT, 10),
        metricsPort: parseInt(parsed.METRICS_PORT, 10),
        timeoutMs: parseInt(parsed.GRANITE_DOCLING_TIMEOUT_MS, 10),
        maxTokens: parseInt(parsed.GRANITE_DOCLING_MAX_TOKENS, 10),
        pricePer1kChars: parseFloat(parsed.GRANITE_DOCLING_PRICE_PER_1K_CHARS),
        cacheTtlSeconds: parseInt(parsed.CACHE_TTL_SECONDS, 10),
        maxCacheEntries: parseInt(parsed.MAX_CACHE_ENTRIES, 10),
    };
};
exports.loadConfig = loadConfig;
