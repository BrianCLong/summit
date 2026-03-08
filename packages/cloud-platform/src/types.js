"use strict";
/**
 * Cloud Data Platform - Core Types
 * Multi-cloud architecture types and interfaces
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiCloudDeploymentSchema = exports.CloudConfigSchema = exports.CloudRegion = exports.CloudProvider = void 0;
const zod_1 = require("zod");
// Cloud Provider Types
var CloudProvider;
(function (CloudProvider) {
    CloudProvider["AWS"] = "aws";
    CloudProvider["AZURE"] = "azure";
    CloudProvider["GCP"] = "gcp";
    CloudProvider["HYBRID"] = "hybrid";
})(CloudProvider || (exports.CloudProvider = CloudProvider = {}));
var CloudRegion;
(function (CloudRegion) {
    // AWS Regions
    CloudRegion["AWS_US_EAST_1"] = "us-east-1";
    CloudRegion["AWS_US_WEST_2"] = "us-west-2";
    CloudRegion["AWS_EU_WEST_1"] = "eu-west-1";
    CloudRegion["AWS_AP_SOUTHEAST_1"] = "ap-southeast-1";
    // Azure Regions
    CloudRegion["AZURE_EAST_US"] = "eastus";
    CloudRegion["AZURE_WEST_US"] = "westus";
    CloudRegion["AZURE_WEST_EUROPE"] = "westeurope";
    CloudRegion["AZURE_SOUTHEAST_ASIA"] = "southeastasia";
    // GCP Regions
    CloudRegion["GCP_US_CENTRAL1"] = "us-central1";
    CloudRegion["GCP_US_WEST1"] = "us-west1";
    CloudRegion["GCP_EUROPE_WEST1"] = "europe-west1";
    CloudRegion["GCP_ASIA_SOUTHEAST1"] = "asia-southeast1";
})(CloudRegion || (exports.CloudRegion = CloudRegion = {}));
// Configuration Schemas
exports.CloudConfigSchema = zod_1.z.object({
    provider: zod_1.z.nativeEnum(CloudProvider),
    region: zod_1.z.string(),
    credentials: zod_1.z.object({
        accessKeyId: zod_1.z.string().optional(),
        secretAccessKey: zod_1.z.string().optional(),
        clientId: zod_1.z.string().optional(),
        clientSecret: zod_1.z.string().optional(),
        tenantId: zod_1.z.string().optional(),
        projectId: zod_1.z.string().optional(),
        privateKey: zod_1.z.string().optional()
    }).optional(),
    endpoint: zod_1.z.string().optional(),
    timeout: zod_1.z.number().default(30000),
    retries: zod_1.z.number().default(3)
});
// Multi-Cloud Deployment Config
exports.MultiCloudDeploymentSchema = zod_1.z.object({
    primary: exports.CloudConfigSchema,
    secondary: zod_1.z.array(exports.CloudConfigSchema).optional(),
    replicationStrategy: zod_1.z.enum(['sync', 'async', 'geo-replicated']).default('async'),
    failoverEnabled: zod_1.z.boolean().default(true),
    crossCloudNetworking: zod_1.z.boolean().default(false)
});
