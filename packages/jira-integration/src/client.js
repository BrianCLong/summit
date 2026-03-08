"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JiraApiClient = exports.JiraApiError = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
const logger_js_1 = require("./logger.js");
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 500;
const sleep = async (delayMs) => new Promise((resolve) => {
    setTimeout(resolve, delayMs);
});
class JiraApiError extends Error {
    status;
    body;
    constructor(message, status, body) {
        super(message);
        this.status = status;
        this.body = body;
        this.name = 'JiraApiError';
    }
}
exports.JiraApiError = JiraApiError;
class JiraApiClient {
    config;
    auditLogger;
    fetchImpl;
    constructor(config, auditLogger, fetchImplementation) {
        this.config = config;
        this.auditLogger = auditLogger;
        this.fetchImpl =
            fetchImplementation ?? globalThis.fetch ?? node_fetch_1.default;
    }
    get authHeader() {
        const authToken = Buffer.from(`${this.config.email}:${this.config.apiToken}`).toString('base64');
        return `Basic ${authToken}`;
    }
    get retryConfig() {
        return {
            attempts: this.config.maxRetries ?? DEFAULT_MAX_RETRIES,
            delay: this.config.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS,
        };
    }
    async request(path, init = {}) {
        const url = `${this.config.baseUrl}${path}`;
        const { attempts, delay } = this.retryConfig;
        const headers = {
            Authorization: this.authHeader,
            Accept: 'application/json',
            ...init.headers,
        };
        let lastError;
        for (let attempt = 1; attempt <= attempts; attempt += 1) {
            try {
                const requestInit = {
                    headers,
                    ...(init.method && { method: init.method }),
                    ...(init.body && { body: init.body }),
                    ...(init.redirect && { redirect: init.redirect }),
                    ...(init.signal && { signal: init.signal }),
                };
                const response = await this.fetchImpl(url, requestInit);
                if (!response.ok) {
                    const bodyText = await response.text();
                    throw new JiraApiError(`Jira API responded with ${response.status}`, response.status, bodyText);
                }
                this.auditLogger.record((0, logger_js_1.createAuditEntry)('jira_api_request', 'success', {
                    entityId: url,
                    payload: { method: init.method ?? 'GET', attempt },
                }));
                if (response.status === 204) {
                    return {};
                }
                return (await response.json());
            }
            catch (error) {
                lastError = error;
                const shouldRetry = attempt < attempts && (init.retryable ?? true);
                this.auditLogger.record((0, logger_js_1.createAuditEntry)('jira_api_request', 'error', {
                    entityId: url,
                    message: error instanceof Error ? error.message : 'Unknown error',
                    payload: { method: init.method ?? 'GET', attempt },
                }));
                if (!shouldRetry) {
                    break;
                }
                await sleep(delay * attempt);
            }
        }
        if (lastError instanceof JiraApiError) {
            throw lastError;
        }
        throw new JiraApiError('Failed to execute Jira API request', undefined, lastError);
    }
}
exports.JiraApiClient = JiraApiClient;
