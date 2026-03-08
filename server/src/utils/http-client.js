"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeClient = void 0;
exports.createSafeClient = createSafeClient;
const axios_1 = __importDefault(require("axios"));
const logger_js_1 = require("../config/logger.js");
const quantum_identity_manager_js_1 = require("../security/quantum-identity-manager.js");
// Task #80: Egress Allow-list
const EGRESS_ALLOW_LIST = [
    'localhost',
    'postgres',
    'redis',
    'neo4j',
    'elasticsearch',
    'otel-collector',
    'jaeger',
    'api.openai.com',
    'api.anthropic.com',
    'slack.com',
    'github.com',
    'atlassian.net',
    'notion.so'
];
/**
 * Creates a safe axios client with egress filtering and Task #110 PQC identity support.
 */
function createSafeClient(baseURL) {
    const client = axios_1.default.create({
        baseURL,
        timeout: 15000,
    });
    // 1. Egress Filtering Interceptor
    client.interceptors.request.use((config) => {
        if (!config.url)
            return config;
        try {
            const url = new URL(config.url, config.baseURL);
            const host = url.hostname;
            const isAllowed = EGRESS_ALLOW_LIST.some(allowed => host === allowed || host.endsWith(`.${allowed}`));
            if (!isAllowed) {
                logger_js_1.logger.error({ host, url: config.url }, 'Egress Blocked: Destination not in allow-list');
                throw new Error(`Egress Blocked: ${host} is not an authorized destination.`);
            }
        }
        catch (err) {
            if (err.message.startsWith('Egress Blocked'))
                throw err;
            // If URL parsing fails, it's likely a relative path to a local service, which we allow
        }
        return config;
    });
    // 2. Task #110: PQC Identity Interceptor (Simulated mTLS Handshake)
    client.interceptors.request.use(async (config) => {
        // Only apply PQC headers for internal service-to-service calls
        const isInternal = config.url && (config.url.includes('server') ||
            config.url.includes('gateway') ||
            config.url.includes('ai-sandbox') ||
            config.url.includes('agentic-mesh-evaluation'));
        if (isInternal) {
            const serviceId = process.env.SERVICE_ID || 'summit-api';
            const identity = quantum_identity_manager_js_1.quantumIdentityManager.issueIdentity(serviceId);
            config.headers['X-Summit-PQC-Identity'] = JSON.stringify(identity);
            logger_js_1.logger.debug({ serviceId, url: config.url }, 'PQC Identity attached to request');
        }
        return config;
    });
    return client;
}
exports.safeClient = createSafeClient();
