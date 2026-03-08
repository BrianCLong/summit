"use strict";
/**
 * API Client for Admin CLI
 * Communicates with IntelGraph Admin APIs
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApiClient = createApiClient;
exports.createMockApiClient = createMockApiClient;
const uuid_1 = require("uuid");
const logger_js_1 = require("./logger.js");
/**
 * Create API client instance
 */
function createApiClient(config) {
    const { endpoint, token, timeout = 30000, retries = 3, retryDelay = 1000 } = config;
    async function request(method, path, body) {
        const url = `${endpoint.replace(/\/$/, '')}${path}`;
        const requestId = (0, uuid_1.v4)();
        const headers = {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Request-ID': requestId,
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        // Add audit nonce and timestamp for tracked operations
        const nonce = (0, uuid_1.v4)();
        const ts = Math.floor(Date.now() / 1000);
        headers['X-Audit-Nonce'] = nonce;
        headers['X-Audit-Ts'] = String(ts);
        const fetchOptions = {
            method,
            headers,
            signal: AbortSignal.timeout(timeout),
        };
        if (body && method !== 'GET') {
            fetchOptions.body = JSON.stringify(body);
        }
        logger_js_1.logger.debug(`API Request: ${method} ${url}`, { requestId });
        let lastError = null;
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const response = await fetch(url, fetchOptions);
                const responseData = (await response.json().catch(() => null));
                if (!response.ok) {
                    const error = {
                        code: responseData?.code ?? `HTTP_${response.status}`,
                        message: responseData?.error ?? responseData?.message ?? response.statusText,
                        details: responseData?.details,
                    };
                    logger_js_1.logger.debug(`API Error: ${response.status}`, { requestId, error });
                    return {
                        success: false,
                        error,
                        meta: {
                            requestId,
                            timestamp: new Date().toISOString(),
                        },
                    };
                }
                logger_js_1.logger.debug(`API Response: ${response.status}`, { requestId });
                return {
                    success: true,
                    data: (responseData?.data ?? responseData),
                    meta: {
                        requestId,
                        timestamp: new Date().toISOString(),
                    },
                };
            }
            catch (err) {
                lastError = err instanceof Error ? err : new Error(String(err));
                // Don't retry if request was aborted (timeout)
                if (lastError.name === 'AbortError' || lastError.name === 'TimeoutError') {
                    break;
                }
                logger_js_1.logger.debug(`API request failed (attempt ${attempt + 1}/${retries + 1})`, {
                    error: lastError.message,
                    requestId,
                });
                if (attempt < retries) {
                    await sleep(retryDelay * Math.pow(2, attempt));
                }
            }
        }
        // All retries exhausted
        return {
            success: false,
            error: {
                code: 'NETWORK_ERROR',
                message: lastError?.message ?? 'Network request failed',
            },
            meta: {
                requestId,
                timestamp: new Date().toISOString(),
            },
        };
    }
    return {
        get(path) {
            return request('GET', path);
        },
        post(path, body) {
            return request('POST', path, body);
        },
        put(path, body) {
            return request('PUT', path, body);
        },
        delete(path) {
            return request('DELETE', path);
        },
    };
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Create a mock API client for testing/dry-run
 */
function createMockApiClient() {
    return {
        async get(_path) {
            return {
                success: true,
                data: {},
                meta: {
                    requestId: 'mock-' + (0, uuid_1.v4)(),
                    timestamp: new Date().toISOString(),
                },
            };
        },
        async post(_path, _body) {
            return {
                success: true,
                data: {},
                meta: {
                    requestId: 'mock-' + (0, uuid_1.v4)(),
                    timestamp: new Date().toISOString(),
                },
            };
        },
        async put(_path, _body) {
            return {
                success: true,
                data: {},
                meta: {
                    requestId: 'mock-' + (0, uuid_1.v4)(),
                    timestamp: new Date().toISOString(),
                },
            };
        },
        async delete(_path) {
            return {
                success: true,
                data: {},
                meta: {
                    requestId: 'mock-' + (0, uuid_1.v4)(),
                    timestamp: new Date().toISOString(),
                },
            };
        },
    };
}
