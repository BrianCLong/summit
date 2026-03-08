"use strict";
/**
 * Common types and interfaces for cloud abstraction
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecretsError = exports.MessagingError = exports.DatabaseError = exports.StorageError = exports.CloudAbstractionError = exports.CloudConfigSchema = exports.CloudProvider = void 0;
const zod_1 = require("zod");
// Cloud provider enum
var CloudProvider;
(function (CloudProvider) {
    CloudProvider["AWS"] = "aws";
    CloudProvider["AZURE"] = "azure";
    CloudProvider["GCP"] = "gcp";
})(CloudProvider || (exports.CloudProvider = CloudProvider = {}));
// Configuration schemas
exports.CloudConfigSchema = zod_1.z.object({
    provider: zod_1.z.nativeEnum(CloudProvider),
    region: zod_1.z.string(),
    credentials: zod_1.z.object({
        accessKeyId: zod_1.z.string().optional(),
        secretAccessKey: zod_1.z.string().optional(),
        accountName: zod_1.z.string().optional(),
        accountKey: zod_1.z.string().optional(),
        projectId: zod_1.z.string().optional(),
        keyFilename: zod_1.z.string().optional()
    }).optional()
});
// Error types
class CloudAbstractionError extends Error {
    provider;
    operation;
    originalError;
    constructor(message, provider, operation, originalError) {
        super(message);
        this.provider = provider;
        this.operation = operation;
        this.originalError = originalError;
        this.name = 'CloudAbstractionError';
    }
}
exports.CloudAbstractionError = CloudAbstractionError;
class StorageError extends CloudAbstractionError {
    constructor(message, provider, originalError) {
        super(message, provider, 'storage', originalError);
        this.name = 'StorageError';
    }
}
exports.StorageError = StorageError;
class DatabaseError extends CloudAbstractionError {
    constructor(message, provider, originalError) {
        super(message, provider, 'database', originalError);
        this.name = 'DatabaseError';
    }
}
exports.DatabaseError = DatabaseError;
class MessagingError extends CloudAbstractionError {
    constructor(message, provider, originalError) {
        super(message, provider, 'messaging', originalError);
        this.name = 'MessagingError';
    }
}
exports.MessagingError = MessagingError;
class SecretsError extends CloudAbstractionError {
    constructor(message, provider, originalError) {
        super(message, provider, 'secrets', originalError);
        this.name = 'SecretsError';
    }
}
exports.SecretsError = SecretsError;
