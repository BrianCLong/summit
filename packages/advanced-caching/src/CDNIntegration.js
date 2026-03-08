"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CDNIntegration = void 0;
const api_1 = require("@opentelemetry/api");
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'CDNIntegration' });
const tracer = api_1.trace.getTracer('advanced-caching');
/**
 * CDN integration for edge caching
 */
class CDNIntegration {
    config;
    constructor(config) {
        this.config = config;
    }
    /**
     * Purge cache from CDN
     */
    async purge(paths) {
        const span = tracer.startSpan('CDNIntegration.purge');
        try {
            switch (this.config.provider) {
                case 'cloudfront':
                    await this.purgeCloudFront(paths);
                    break;
                case 'cloudflare':
                    await this.purgeCloudflare(paths);
                    break;
                case 'fastly':
                    await this.purgeFastly(paths);
                    break;
                default:
                    throw new Error(`Unsupported CDN provider: ${this.config.provider}`);
            }
            span.setAttributes({
                provider: this.config.provider,
                paths: paths.length,
            });
            logger.info({ provider: this.config.provider, paths }, 'CDN cache purged');
        }
        catch (error) {
            span.recordException(error);
            throw error;
        }
        finally {
            span.end();
        }
    }
    /**
     * Purge all CDN cache
     */
    async purgeAll() {
        const span = tracer.startSpan('CDNIntegration.purgeAll');
        try {
            switch (this.config.provider) {
                case 'cloudfront':
                    await this.purgeCloudFrontAll();
                    break;
                case 'cloudflare':
                    await this.purgeCloudflareAll();
                    break;
                case 'fastly':
                    await this.purgeFastlyAll();
                    break;
                default:
                    throw new Error(`Unsupported CDN provider: ${this.config.provider}`);
            }
            logger.info({ provider: this.config.provider }, 'All CDN cache purged');
        }
        catch (error) {
            span.recordException(error);
            throw error;
        }
        finally {
            span.end();
        }
    }
    /**
     * Set cache control headers for CDN
     */
    getCacheControlHeader(ttl) {
        const cacheTTL = ttl || this.config.ttl || 3600;
        return `public, max-age=${cacheTTL}, s-maxage=${cacheTTL}`;
    }
    /**
     * Get CDN cache key
     */
    getCacheKey(url, queryParams) {
        const parsedUrl = new URL(url);
        if (queryParams) {
            Object.entries(queryParams).forEach(([key, value]) => {
                parsedUrl.searchParams.set(key, value);
            });
        }
        return parsedUrl.toString();
    }
    // Provider-specific implementations
    async purgeCloudFront(paths) {
        if (!this.config.distributionId) {
            throw new Error('CloudFront distribution ID not configured');
        }
        // Implementation would use AWS SDK
        // Example: AWS.CloudFront.createInvalidation()
        logger.debug({ paths }, 'CloudFront purge requested');
        // Placeholder for actual AWS SDK call
        // const cloudfront = new AWS.CloudFront();
        // await cloudfront.createInvalidation({
        //   DistributionId: this.config.distributionId,
        //   InvalidationBatch: {
        //     Paths: { Quantity: paths.length, Items: paths },
        //     CallerReference: Date.now().toString(),
        //   },
        // }).promise();
    }
    async purgeCloudFrontAll() {
        await this.purgeCloudFront(['/*']);
    }
    async purgeCloudflare(paths) {
        if (!this.config.apiKey || !this.config.zone) {
            throw new Error('Cloudflare API key and zone not configured');
        }
        // Implementation would use Cloudflare API
        // Example: POST https://api.cloudflare.com/client/v4/zones/:zone/purge_cache
        logger.debug({ paths }, 'Cloudflare purge requested');
        // Placeholder for actual API call
        // const response = await fetch(
        //   `https://api.cloudflare.com/client/v4/zones/${this.config.zone}/purge_cache`,
        //   {
        //     method: 'POST',
        //     headers: {
        //       'Authorization': `Bearer ${this.config.apiKey}`,
        //       'Content-Type': 'application/json',
        //     },
        //     body: JSON.stringify({ files: paths }),
        //   }
        // );
    }
    async purgeCloudflareAll() {
        if (!this.config.apiKey || !this.config.zone) {
            throw new Error('Cloudflare API key and zone not configured');
        }
        logger.debug('Cloudflare purge all requested');
        // Placeholder for actual API call
        // const response = await fetch(
        //   `https://api.cloudflare.com/client/v4/zones/${this.config.zone}/purge_cache`,
        //   {
        //     method: 'POST',
        //     headers: {
        //       'Authorization': `Bearer ${this.config.apiKey}`,
        //       'Content-Type': 'application/json',
        //     },
        //     body: JSON.stringify({ purge_everything: true }),
        //   }
        // );
    }
    async purgeFastly(paths) {
        if (!this.config.apiKey) {
            throw new Error('Fastly API key not configured');
        }
        logger.debug({ paths }, 'Fastly purge requested');
        // Placeholder for actual Fastly API call
        // for (const path of paths) {
        //   await fetch(`https://api.fastly.com/purge/${path}`, {
        //     method: 'POST',
        //     headers: { 'Fastly-Key': this.config.apiKey },
        //   });
        // }
    }
    async purgeFastlyAll() {
        if (!this.config.apiKey) {
            throw new Error('Fastly API key not configured');
        }
        logger.debug('Fastly purge all requested');
        // Placeholder for actual Fastly API call
        // await fetch(`https://api.fastly.com/service/${serviceId}/purge_all`, {
        //   method: 'POST',
        //   headers: { 'Fastly-Key': this.config.apiKey },
        // });
    }
}
exports.CDNIntegration = CDNIntegration;
