"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MigrationConfigSchema = exports.CodeSubmissionSchema = exports.SandboxConfigSchema = exports.SandboxQuotaSchema = exports.SensitiveDataType = exports.DataClassification = exports.IsolationLevel = void 0;
const zod_1 = require("zod");
// Sandbox isolation levels
var IsolationLevel;
(function (IsolationLevel) {
    IsolationLevel["STANDARD"] = "standard";
    IsolationLevel["ENHANCED"] = "enhanced";
    IsolationLevel["AIRGAPPED"] = "airgapped";
    IsolationLevel["MISSION_READY"] = "mission";
})(IsolationLevel || (exports.IsolationLevel = IsolationLevel = {}));
// Data classification levels
var DataClassification;
(function (DataClassification) {
    DataClassification["UNCLASSIFIED"] = "unclassified";
    DataClassification["CUI"] = "cui";
    DataClassification["SENSITIVE"] = "sensitive";
    DataClassification["REGULATED"] = "regulated";
    DataClassification["MISSION_CRITICAL"] = "mission_critical";
})(DataClassification || (exports.DataClassification = DataClassification = {}));
// Sensitive data types for detection
var SensitiveDataType;
(function (SensitiveDataType) {
    SensitiveDataType["PII"] = "pii";
    SensitiveDataType["PHI"] = "phi";
    SensitiveDataType["PCI"] = "pci";
    SensitiveDataType["CREDENTIALS"] = "credentials";
    SensitiveDataType["CLASSIFIED"] = "classified";
    SensitiveDataType["LOCATION"] = "location";
    SensitiveDataType["BIOMETRIC"] = "biometric";
    SensitiveDataType["SECURITY"] = "security";
})(SensitiveDataType || (exports.SensitiveDataType = SensitiveDataType = {}));
// Sandbox resource quotas
exports.SandboxQuotaSchema = zod_1.z.object({
    cpuMs: zod_1.z.number().min(100).max(60000).default(5000),
    memoryMb: zod_1.z.number().min(16).max(512).default(128),
    wallClockMs: zod_1.z.number().min(1000).max(300000).default(30000),
    maxOutputBytes: zod_1.z.number().min(1024).max(10485760).default(1048576),
    maxNetworkBytes: zod_1.z.number().min(0).max(104857600).default(0),
});
// Sandbox configuration
exports.SandboxConfigSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1).max(100),
    description: zod_1.z.string().max(500).optional(),
    isolationLevel: zod_1.z.nativeEnum(IsolationLevel).default(IsolationLevel.ENHANCED),
    quotas: exports.SandboxQuotaSchema.default({}),
    allowedModules: zod_1.z.array(zod_1.z.string()).default([]),
    networkAllowlist: zod_1.z.array(zod_1.z.string()).default([]),
    environmentVars: zod_1.z.record(zod_1.z.string()).default({}),
    dataClassification: zod_1.z.nativeEnum(DataClassification).default(DataClassification.UNCLASSIFIED),
    autoDetectSensitive: zod_1.z.boolean().default(true),
    createdAt: zod_1.z.date().default(() => new Date()),
    expiresAt: zod_1.z.date().optional(),
    ownerId: zod_1.z.string(),
    tenantId: zod_1.z.string(),
});
// Code submission for sandbox execution
exports.CodeSubmissionSchema = zod_1.z.object({
    sandboxId: zod_1.z.string().uuid(),
    code: zod_1.z.string().min(1).max(1000000),
    language: zod_1.z.enum(['javascript', 'typescript', 'python']).default('typescript'),
    entryPoint: zod_1.z.string().default('main'),
    inputs: zod_1.z.record(zod_1.z.unknown()).default({}),
    metadata: zod_1.z.record(zod_1.z.string()).default({}),
});
// Migration configuration
exports.MigrationConfigSchema = zod_1.z.object({
    sandboxId: zod_1.z.string().uuid(),
    targetPlatform: zod_1.z.enum(['kubernetes', 'lambda', 'edge', 'mission_cloud']),
    targetEnvironment: zod_1.z.enum(['staging', 'production', 'mission']),
    complianceChecks: zod_1.z.array(zod_1.z.string()).default(['security', 'performance', 'data_handling']),
    approvers: zod_1.z.array(zod_1.z.string()).default([]),
    rollbackEnabled: zod_1.z.boolean().default(true),
    blueGreenDeploy: zod_1.z.boolean().default(false),
});
