"use strict";
/**
 * Provider Reliability Module
 *
 * Provides production-grade reliability for provider/model interactions:
 * - Retry with exponential backoff (respects Retry-After)
 * - Timeout handling
 * - Budget enforcement (time, requests, tokens)
 * - Deterministic diagnostics
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderWrapper = exports.DEFAULT_PROVIDER_OPTIONS = exports.BudgetExceededError = exports.ProviderError = exports.PROVIDER_EXIT_CODE = void 0;
exports.classifyError = classifyError;
exports.calculateBackoff = calculateBackoff;
exports.parseRetryAfter = parseRetryAfter;
exports.createProviderWrapper = createProviderWrapper;
const constants_js_1 = require("./constants.js");
// Exit code for provider errors after retries exhausted
exports.PROVIDER_EXIT_CODE = 3;
/**
 * Provider error for failures after retries exhausted
 */
class ProviderError extends Error {
    category;
    diagnostics;
    exitCode;
    constructor(message, category, diagnostics, exitCode = exports.PROVIDER_EXIT_CODE) {
        super(message);
        this.category = category;
        this.diagnostics = diagnostics;
        this.exitCode = exitCode;
        this.name = 'ProviderError';
    }
    format() {
        const sortedDetails = Object.entries(this.diagnostics)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
            .join('\n  ');
        return `Provider Error (${this.category}): ${this.message}\nDiagnostics:\n  ${sortedDetails}`;
    }
}
exports.ProviderError = ProviderError;
/**
 * Budget exceeded error
 */
class BudgetExceededError extends Error {
    budgetType;
    limit;
    used;
    exitCode;
    constructor(message, budgetType, limit, used, exitCode = constants_js_1.EXIT_CODES.POLICY_ERROR) {
        super(message);
        this.budgetType = budgetType;
        this.limit = limit;
        this.used = used;
        this.exitCode = exitCode;
        this.name = 'BudgetExceededError';
    }
    format() {
        return `Budget Exceeded (${this.budgetType}): ${this.message}\n  limit: ${this.limit}\n  used: ${this.used}`;
    }
}
exports.BudgetExceededError = BudgetExceededError;
/**
 * Classify an error into a category
 */
function classifyError(error, statusCode) {
    const details = [];
    let category = 'permanent';
    let message = 'Unknown error';
    let retryAfterMs;
    if (error instanceof Error) {
        message = error.message;
        details.push(`error_type: ${error.name}`);
        // Network errors are transient
        if (error.message.includes('ECONNRESET') ||
            error.message.includes('ECONNREFUSED') ||
            error.message.includes('ETIMEDOUT') ||
            error.message.includes('ENOTFOUND') ||
            error.message.includes('socket hang up') ||
            error.message.includes('network')) {
            category = 'transient';
            details.push('reason: network_error');
        }
        // Timeout errors are transient
        if (error.message.includes('timeout') || error.name === 'TimeoutError') {
            category = 'transient';
            details.push('reason: timeout');
        }
        // User cancellation
        if (error.message.includes('cancelled') || error.message.includes('aborted')) {
            category = 'user_cancelled';
            details.push('reason: user_cancelled');
        }
    }
    // HTTP status code classification
    if (statusCode !== undefined) {
        details.push(`status_code: ${statusCode}`);
        if (statusCode === 429) {
            category = 'transient';
            details.push('reason: rate_limited');
        }
        else if (statusCode >= 500) {
            category = 'transient';
            details.push('reason: server_error');
        }
        else if (statusCode >= 400 && statusCode < 500) {
            category = 'permanent';
            details.push('reason: client_error');
        }
    }
    return {
        category,
        message,
        statusCode,
        retryAfterMs,
        details: details.sort(),
    };
}
/**
 * Calculate backoff delay with optional deterministic jitter
 */
function calculateBackoff(attempt, initialBackoffMs, maxBackoffMs, ci, seed) {
    // Exponential backoff: initial * 2^attempt
    const exponentialDelay = initialBackoffMs * Math.pow(2, attempt);
    const cappedDelay = Math.min(exponentialDelay, maxBackoffMs);
    // In CI mode, use deterministic jitter based on seed
    if (ci && seed !== undefined) {
        // Simple deterministic pseudo-random based on seed and attempt
        const deterministicFactor = ((seed * (attempt + 1) * 1103515245 + 12345) % 2147483648) / 2147483648;
        const jitter = cappedDelay * 0.5 * deterministicFactor;
        return Math.floor(cappedDelay + jitter);
    }
    // Non-CI: use random jitter
    const jitter = cappedDelay * 0.5 * Math.random();
    return Math.floor(cappedDelay + jitter);
}
/**
 * Parse Retry-After header value
 */
function parseRetryAfter(retryAfter) {
    if (retryAfter === undefined)
        return undefined;
    if (typeof retryAfter === 'number') {
        return retryAfter * 1000; // Convert seconds to milliseconds
    }
    // Try parsing as number (seconds)
    const seconds = parseInt(retryAfter, 10);
    if (!isNaN(seconds)) {
        return seconds * 1000;
    }
    // Try parsing as HTTP date
    const date = new Date(retryAfter);
    if (!isNaN(date.getTime())) {
        return Math.max(0, date.getTime() - Date.now());
    }
    return undefined;
}
/**
 * Default provider options
 */
exports.DEFAULT_PROVIDER_OPTIONS = {
    maxRetries: 3,
    initialBackoffMs: 500,
    maxBackoffMs: 8000,
    timeoutMs: 120000,
    budgetMs: null,
    maxRequests: null,
    tokenBudget: null,
    ci: false,
    allowNetwork: true,
};
/**
 * Provider wrapper class for reliable provider interactions
 */
class ProviderWrapper {
    options;
    startTime;
    requestsMade = 0;
    retriesTotal = 0;
    tokensUsed = 0;
    requestHistory = [];
    providerName;
    seed;
    constructor(providerName, options = {}) {
        this.providerName = providerName;
        this.options = { ...exports.DEFAULT_PROVIDER_OPTIONS, ...options };
        this.startTime = Date.now();
        // Generate deterministic seed from session ID or use current time
        this.seed = options.sessionId
            ? this.hashString(options.sessionId)
            : Date.now();
    }
    /**
     * Simple string hash for deterministic seed
     */
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }
    /**
     * Get elapsed time since start
     */
    getElapsedMs() {
        return Date.now() - this.startTime;
    }
    /**
     * Get remaining budget in milliseconds
     */
    getRemainingBudgetMs() {
        if (this.options.budgetMs === null)
            return null;
        return Math.max(0, this.options.budgetMs - this.getElapsedMs());
    }
    /**
     * Check if budget allows another request
     */
    checkBudget() {
        // Check time budget
        if (this.options.budgetMs !== null) {
            const remaining = this.getRemainingBudgetMs();
            if (remaining !== null && remaining <= 0) {
                throw new BudgetExceededError('Time budget exceeded', 'time', this.options.budgetMs, this.getElapsedMs());
            }
        }
        // Check request budget
        if (this.options.maxRequests !== null && this.requestsMade >= this.options.maxRequests) {
            throw new BudgetExceededError('Request budget exceeded', 'requests', this.options.maxRequests, this.requestsMade);
        }
        // Check token budget
        if (this.options.tokenBudget !== null && this.tokensUsed >= this.options.tokenBudget) {
            throw new BudgetExceededError('Token budget exceeded', 'tokens', this.options.tokenBudget, this.tokensUsed);
        }
    }
    /**
     * Check if network access is allowed
     */
    checkNetworkAccess() {
        if (!this.options.allowNetwork) {
            throw new ProviderError('Network access not allowed', 'network_denied', this.getDiagnostics('network_denied'), constants_js_1.EXIT_CODES.POLICY_ERROR);
        }
    }
    /**
     * Build diagnostics object
     */
    getDiagnostics(errorCategory = null) {
        return {
            provider_name: this.providerName,
            requests_made: this.requestsMade,
            retries_total: this.retriesTotal,
            timeout_ms: this.options.timeoutMs,
            budget_ms: this.options.budgetMs,
            remaining_ms: this.getRemainingBudgetMs(),
            tokens_used: this.tokensUsed || null,
            error_category: errorCategory,
            duration_ms: this.getElapsedMs(),
            request_history: [...this.requestHistory].sort((a, b) => a.attempt - b.attempt),
        };
    }
    /**
     * Execute a provider request with retry and backoff
     */
    async execute(requestFn, options = {}) {
        // Check network access first
        try {
            this.checkNetworkAccess();
        }
        catch (error) {
            if (error instanceof ProviderError) {
                return {
                    success: false,
                    error: {
                        category: error.category,
                        message: error.message,
                        details: [],
                    },
                    diagnostics: error.diagnostics,
                };
            }
            throw error;
        }
        let lastError;
        let attempt = 0;
        while (attempt <= this.options.maxRetries) {
            // Check budget before each attempt
            try {
                this.checkBudget();
            }
            catch (error) {
                if (error instanceof BudgetExceededError) {
                    return {
                        success: false,
                        error: {
                            category: 'budget_exceeded',
                            message: error.message,
                            details: [`budget_type: ${error.budgetType}`, `limit: ${error.limit}`, `used: ${error.used}`].sort(),
                        },
                        diagnostics: this.getDiagnostics('budget_exceeded'),
                    };
                }
                throw error;
            }
            const requestStart = Date.now();
            const historyEntry = {
                attempt,
                timestamp: new Date().toISOString(),
                duration_ms: 0,
                status: 'success',
            };
            try {
                // Create abort controller for timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.options.timeoutMs);
                this.requestsMade++;
                const result = await requestFn(controller.signal);
                clearTimeout(timeoutId);
                // Extract and track token usage if available
                if (options.extractTokens) {
                    const tokens = options.extractTokens(result);
                    this.tokensUsed += tokens;
                }
                historyEntry.duration_ms = Date.now() - requestStart;
                historyEntry.status = 'success';
                this.requestHistory.push(historyEntry);
                return {
                    success: true,
                    data: result,
                    diagnostics: this.getDiagnostics(null),
                };
            }
            catch (error) {
                historyEntry.duration_ms = Date.now() - requestStart;
                // Extract status code if available
                const statusCode = options.extractStatusCode?.(error);
                historyEntry.status_code = statusCode;
                // Classify the error
                const classified = classifyError(error, statusCode);
                lastError = classified;
                historyEntry.error_category = classified.category;
                // Check for Retry-After header
                const retryAfterHeader = options.extractRetryAfter?.(error);
                const retryAfterMs = parseRetryAfter(retryAfterHeader);
                if (retryAfterMs !== undefined) {
                    classified.retryAfterMs = retryAfterMs;
                    historyEntry.retry_after_ms = retryAfterMs;
                }
                // Determine if we should retry
                if (classified.category === 'transient' && attempt < this.options.maxRetries) {
                    historyEntry.status = classified.message.includes('timeout') ? 'timeout' : 'error';
                    this.requestHistory.push(historyEntry);
                    this.retriesTotal++;
                    // Calculate backoff delay
                    let delay = calculateBackoff(attempt, this.options.initialBackoffMs, this.options.maxBackoffMs, this.options.ci, this.seed);
                    // Respect Retry-After if larger than computed backoff
                    if (retryAfterMs !== undefined && retryAfterMs > delay) {
                        delay = retryAfterMs;
                    }
                    // Wait before retrying
                    await new Promise((resolve) => setTimeout(resolve, delay));
                    attempt++;
                    continue;
                }
                // Non-retryable error or max retries exceeded
                if (classified.category === 'user_cancelled') {
                    historyEntry.status = 'cancelled';
                }
                else {
                    historyEntry.status = 'error';
                }
                this.requestHistory.push(historyEntry);
                return {
                    success: false,
                    error: classified,
                    diagnostics: this.getDiagnostics(classified.category),
                };
            }
        }
        // Should not reach here, but handle just in case
        return {
            success: false,
            error: lastError || {
                category: 'permanent',
                message: 'Max retries exceeded',
                details: ['reason: max_retries_exceeded'],
            },
            diagnostics: this.getDiagnostics(lastError?.category || 'permanent'),
        };
    }
    /**
     * Get current diagnostics (for status reporting)
     */
    getDiagnosticsSnapshot() {
        return this.getDiagnostics(null);
    }
    /**
     * Update token usage manually
     */
    addTokenUsage(tokens) {
        this.tokensUsed += tokens;
    }
    /**
     * Check if within budget (for pre-flight checks)
     */
    isWithinBudget() {
        try {
            this.checkBudget();
            return true;
        }
        catch {
            return false;
        }
    }
}
exports.ProviderWrapper = ProviderWrapper;
/**
 * Create provider wrapper with options merged with defaults
 */
function createProviderWrapper(providerName, options = {}) {
    return new ProviderWrapper(providerName, options);
}
