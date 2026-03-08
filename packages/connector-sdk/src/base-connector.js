"use strict";
/**
 * Base Connector Implementation
 *
 * Provides common functionality for all connectors.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnrichConnector = exports.StreamConnector = exports.QueryConnector = exports.PullConnector = exports.BaseConnector = void 0;
/**
 * Abstract base class for connectors
 */
class BaseConnector {
    config = null;
    initialized = false;
    /**
     * Initialize the connector with configuration
     */
    async initialize(config) {
        this.validateConfig(config);
        this.config = config;
        await this.onInitialize(config);
        this.initialized = true;
    }
    /**
     * Override this method to perform custom initialization
     */
    async onInitialize(_config) {
        // Default: no-op
    }
    /**
     * Validate configuration against manifest schema
     */
    validateConfig(config) {
        // Check required secrets
        for (const secret of this.manifest.requiredSecrets) {
            if (!config.secrets[secret]) {
                throw new Error(`Missing required secret: ${secret}`);
            }
        }
    }
    /**
     * Ensure connector is initialized before operations
     */
    ensureInitialized() {
        if (!this.initialized || !this.config) {
            throw new Error('Connector not initialized. Call initialize() first.');
        }
    }
    /**
     * Clean up resources
     */
    async shutdown() {
        await this.onShutdown();
        this.initialized = false;
        this.config = null;
    }
    /**
     * Override this method to perform custom cleanup
     */
    async onShutdown() {
        // Default: no-op
    }
    /**
     * Helper: Create a success result
     */
    successResult(entitiesProcessed, relationshipsProcessed, durationMs, cursor) {
        return {
            success: true,
            entitiesProcessed,
            relationshipsProcessed,
            errorCount: 0,
            durationMs,
            cursor,
        };
    }
    /**
     * Helper: Create a failure result
     */
    failureResult(error, entitiesProcessed, relationshipsProcessed, durationMs) {
        return {
            success: false,
            entitiesProcessed,
            relationshipsProcessed,
            errorCount: 1,
            errors: [
                {
                    code: 'CONNECTOR_ERROR',
                    message: error.message,
                    retryable: true,
                    cause: error,
                },
            ],
            durationMs,
        };
    }
    /**
     * Helper: Normalize entity type names
     */
    normalizeEntityType(type) {
        // Convert to PascalCase
        return type
            .split(/[_-\s]+/)
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join('');
    }
    /**
     * Helper: Normalize relationship type names
     */
    normalizeRelationshipType(type) {
        // Convert to SCREAMING_SNAKE_CASE
        return type.replace(/[- ]/g, '_').toUpperCase();
    }
    /**
     * Helper: Generate external ID
     */
    generateExternalId(sourceId, recordId) {
        return `${this.manifest.id}:${sourceId}:${recordId}`;
    }
    /**
     * Helper: Check if operation should be aborted
     */
    checkAborted(signal) {
        if (signal.aborted) {
            throw new Error('Operation aborted');
        }
    }
}
exports.BaseConnector = BaseConnector;
/**
 * Abstract base for pull-capable connectors
 */
class PullConnector extends BaseConnector {
}
exports.PullConnector = PullConnector;
/**
 * Abstract base for query-capable connectors
 */
class QueryConnector extends BaseConnector {
}
exports.QueryConnector = QueryConnector;
/**
 * Abstract base for stream-capable connectors
 */
class StreamConnector extends BaseConnector {
    streaming = false;
    async stopStream() {
        this.streaming = false;
    }
    isStreaming() {
        return this.streaming;
    }
}
exports.StreamConnector = StreamConnector;
/**
 * Abstract base for enrichment connectors
 */
class EnrichConnector extends BaseConnector {
}
exports.EnrichConnector = EnrichConnector;
