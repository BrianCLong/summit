"use strict";
/**
 * Base Delivery Channel Interface
 *
 * All delivery channels must implement this interface.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseDeliveryChannel = void 0;
/**
 * Abstract base class for delivery channels
 */
class BaseDeliveryChannel {
    stats = {
        sent: 0,
        delivered: 0,
        failed: 0,
        retried: 0,
        avgDeliveryTimeMs: 0,
    };
    async getStats() {
        return { ...this.stats };
    }
    /**
     * Update delivery statistics
     */
    updateStats(result, durationMs) {
        if (result.success) {
            this.stats.sent++;
            this.stats.delivered++;
        }
        else {
            this.stats.failed++;
        }
        // Update average delivery time (exponential moving average)
        if (this.stats.avgDeliveryTimeMs === 0) {
            this.stats.avgDeliveryTimeMs = durationMs;
        }
        else {
            this.stats.avgDeliveryTimeMs =
                0.9 * this.stats.avgDeliveryTimeMs + 0.1 * durationMs;
        }
    }
    /**
     * Retry logic with exponential backoff
     */
    async retryWithBackoff(operation, maxRetries = 3, baseDelayMs = 1000) {
        let lastError;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            }
            catch (error) {
                lastError = error;
                this.stats.retried++;
                if (attempt < maxRetries) {
                    const delay = baseDelayMs * Math.pow(2, attempt);
                    await this.sleep(delay);
                }
            }
        }
        throw lastError;
    }
    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    /**
     * Mask sensitive data in messages for external channels
     */
    maskSensitiveData(data) {
        const sensitiveFields = [
            'password',
            'token',
            'secret',
            'apiKey',
            'ssn',
            'creditCard',
            'email',
            'phone',
            'ip_address',
        ];
        const masked = { ...data };
        for (const key of Object.keys(masked)) {
            const lowerKey = key.toLowerCase();
            if (sensitiveFields.some((field) => lowerKey.includes(field))) {
                masked[key] = '[REDACTED]';
            }
        }
        return masked;
    }
}
exports.BaseDeliveryChannel = BaseDeliveryChannel;
