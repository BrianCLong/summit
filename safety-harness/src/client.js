"use strict";
/**
 * API Client for Safety Harness
 *
 * Provides interface to IntelGraph APIs for testing.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.APIClient = void 0;
const axios_1 = __importDefault(require("axios"));
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'safety-harness-client' });
class APIClient {
    client;
    config;
    constructor(config) {
        this.config = config;
        this.client = axios_1.default.create({
            baseURL: config.baseURL,
            timeout: config.timeout,
            headers: {
                'Content-Type': 'application/json',
                ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
            },
        });
        // Add response interceptor for error handling
        this.client.interceptors.response.use(response => response, async (error) => this.handleError(error));
    }
    /**
     * Call Copilot API
     */
    async copilot(request) {
        logger.debug({ prompt: request.prompt.substring(0, 100) }, 'Calling Copilot API');
        try {
            const response = await this.retryRequest(async () => {
                return this.client.post('/api/copilot/query', {
                    prompt: request.prompt,
                    tenantId: request.context.tenantId,
                    userId: request.context.userId,
                    role: request.context.role,
                    permissions: request.context.permissions,
                    investigationId: request.investigationId,
                    options: request.options,
                });
            });
            return this.parseCopilotResponse(response.data);
        }
        catch (error) {
            logger.error({ error: error.message }, 'Copilot API call failed');
            // Return blocked response for errors
            return {
                response: error.message || 'Request blocked',
                confidence: 0,
                citations: [],
                guardrailsTriggered: error.response?.data?.guardrailsTriggered || [],
                policyViolations: error.response?.data?.policyViolations || [],
                riskScore: 1.0,
                metadata: error.response?.data || {},
                blocked: true,
            };
        }
    }
    /**
     * Call Analytics API
     */
    async analytics(request) {
        logger.debug({ query: request.query.substring(0, 100) }, 'Calling Analytics API');
        try {
            const response = await this.retryRequest(async () => {
                return this.client.post('/api/analytics/query', {
                    query: request.query,
                    tenantId: request.context.tenantId,
                    userId: request.context.userId,
                    role: request.context.role,
                    permissions: request.context.permissions,
                    dataClassification: request.dataClassification,
                });
            });
            return this.parseAnalyticsResponse(response.data);
        }
        catch (error) {
            logger.error({ error: error.message }, 'Analytics API call failed');
            // Return blocked response for errors
            return {
                data: {},
                blocked: true,
                reason: error.message || 'Query blocked',
                guardrailsTriggered: error.response?.data?.guardrailsTriggered || [],
            };
        }
    }
    /**
     * Parse Copilot response
     */
    parseCopilotResponse(data) {
        // Check if response indicates blocking
        const blocked = data.blocked === true ||
            data.status === 'blocked' ||
            data.decision === 'deny' ||
            data.error?.includes('blocked') ||
            false;
        return {
            response: data.response || data.message || '',
            confidence: data.confidence || 0,
            citations: data.citations || [],
            guardrailsTriggered: data.guardrailsTriggered || data.guardrails || [],
            policyViolations: data.policyViolations || data.violations || [],
            riskScore: data.riskScore || data.risk_score || 0,
            metadata: data.metadata || data,
            blocked,
        };
    }
    /**
     * Parse Analytics response
     */
    parseAnalyticsResponse(data) {
        const blocked = data.blocked === true ||
            data.status === 'blocked' ||
            data.error?.includes('blocked') ||
            false;
        return {
            data: data.data || data.results || {},
            blocked,
            reason: data.reason || data.message,
            guardrailsTriggered: data.guardrailsTriggered || [],
        };
    }
    /**
     * Retry request with exponential backoff
     */
    async retryRequest(fn, attempt = 1) {
        try {
            return await fn();
        }
        catch (error) {
            if (attempt >= this.config.retries) {
                throw error;
            }
            // Only retry on network errors or 5xx errors
            const shouldRetry = error.code === 'ECONNREFUSED' ||
                error.code === 'ETIMEDOUT' ||
                (error.response && error.response.status >= 500);
            if (!shouldRetry) {
                throw error;
            }
            const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
            logger.debug({ attempt, delay }, 'Retrying request');
            await new Promise(resolve => setTimeout(resolve, delay));
            return this.retryRequest(fn, attempt + 1);
        }
    }
    /**
     * Handle API errors
     */
    async handleError(error) {
        if (error.response) {
            // Server responded with error status
            logger.error({
                status: error.response.status,
                data: error.response.data,
            }, 'API error response');
        }
        else if (error.request) {
            // Request made but no response
            logger.error({ request: error.request }, 'No API response');
        }
        else {
            // Error setting up request
            logger.error({ message: error.message }, 'API request setup error');
        }
        throw error;
    }
    /**
     * Health check
     */
    async healthCheck() {
        try {
            const response = await this.client.get('/health');
            return response.status === 200;
        }
        catch (error) {
            return false;
        }
    }
}
exports.APIClient = APIClient;
