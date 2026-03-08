"use strict";
/**
 * Schema Registry Types
 * Types for managing schemas, versioning, and evolution
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaSearchRequestSchema = exports.SchemaEvolutionRequestSchema = exports.SchemaRegistrationRequestSchema = exports.SchemaDefinitionSchema = exports.DependencyType = exports.VersionType = exports.SchemaChangeType = exports.ConstraintType = exports.CompatibilityMode = exports.SchemaStatus = exports.SchemaType = void 0;
const zod_1 = require("zod");
/**
 * Schema Type
 */
var SchemaType;
(function (SchemaType) {
    SchemaType["CONNECTOR"] = "CONNECTOR";
    SchemaType["CANONICAL"] = "CANONICAL";
    SchemaType["MAPPING"] = "MAPPING";
    SchemaType["AVRO"] = "AVRO";
    SchemaType["JSON_SCHEMA"] = "JSON_SCHEMA";
    SchemaType["PROTOBUF"] = "PROTOBUF";
    SchemaType["OPENAPI"] = "OPENAPI";
    SchemaType["GRAPHQL"] = "GRAPHQL";
    SchemaType["CUSTOM"] = "CUSTOM";
})(SchemaType || (exports.SchemaType = SchemaType = {}));
/**
 * Schema Status
 */
var SchemaStatus;
(function (SchemaStatus) {
    SchemaStatus["DRAFT"] = "DRAFT";
    SchemaStatus["ACTIVE"] = "ACTIVE";
    SchemaStatus["DEPRECATED"] = "DEPRECATED";
    SchemaStatus["ARCHIVED"] = "ARCHIVED";
})(SchemaStatus || (exports.SchemaStatus = SchemaStatus = {}));
/**
 * Compatibility Mode
 * For schema evolution rules
 */
var CompatibilityMode;
(function (CompatibilityMode) {
    CompatibilityMode["NONE"] = "NONE";
    CompatibilityMode["BACKWARD"] = "BACKWARD";
    CompatibilityMode["FORWARD"] = "FORWARD";
    CompatibilityMode["FULL"] = "FULL";
    CompatibilityMode["BACKWARD_TRANSITIVE"] = "BACKWARD_TRANSITIVE";
    CompatibilityMode["FORWARD_TRANSITIVE"] = "FORWARD_TRANSITIVE";
    CompatibilityMode["FULL_TRANSITIVE"] = "FULL_TRANSITIVE";
})(CompatibilityMode || (exports.CompatibilityMode = CompatibilityMode = {}));
/**
 * Constraint Type
 */
var ConstraintType;
(function (ConstraintType) {
    ConstraintType["REQUIRED"] = "REQUIRED";
    ConstraintType["MIN_LENGTH"] = "MIN_LENGTH";
    ConstraintType["MAX_LENGTH"] = "MAX_LENGTH";
    ConstraintType["MIN_VALUE"] = "MIN_VALUE";
    ConstraintType["MAX_VALUE"] = "MAX_VALUE";
    ConstraintType["PATTERN"] = "PATTERN";
    ConstraintType["ENUM"] = "ENUM";
    ConstraintType["CUSTOM"] = "CUSTOM";
})(ConstraintType || (exports.ConstraintType = ConstraintType = {}));
/**
 * Schema Change Type
 */
var SchemaChangeType;
(function (SchemaChangeType) {
    SchemaChangeType["FIELD_ADDED"] = "FIELD_ADDED";
    SchemaChangeType["FIELD_REMOVED"] = "FIELD_REMOVED";
    SchemaChangeType["FIELD_RENAMED"] = "FIELD_RENAMED";
    SchemaChangeType["TYPE_CHANGED"] = "TYPE_CHANGED";
    SchemaChangeType["CONSTRAINT_ADDED"] = "CONSTRAINT_ADDED";
    SchemaChangeType["CONSTRAINT_REMOVED"] = "CONSTRAINT_REMOVED";
    SchemaChangeType["DEFAULT_CHANGED"] = "DEFAULT_CHANGED";
    SchemaChangeType["NULLABLE_CHANGED"] = "NULLABLE_CHANGED";
    SchemaChangeType["OTHER"] = "OTHER";
})(SchemaChangeType || (exports.SchemaChangeType = SchemaChangeType = {}));
/**
 * Version Type
 */
var VersionType;
(function (VersionType) {
    VersionType["MAJOR"] = "MAJOR";
    VersionType["MINOR"] = "MINOR";
    VersionType["PATCH"] = "PATCH";
})(VersionType || (exports.VersionType = VersionType = {}));
/**
 * Dependency Type
 */
var DependencyType;
(function (DependencyType) {
    DependencyType["IMPORTS"] = "IMPORTS";
    DependencyType["REFERENCES"] = "REFERENCES";
    DependencyType["EXTENDS"] = "EXTENDS";
    DependencyType["IMPLEMENTS"] = "IMPLEMENTS";
})(DependencyType || (exports.DependencyType = DependencyType = {}));
/**
 * Validation Schemas using Zod
 */
exports.SchemaDefinitionSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1).max(255),
    namespace: zod_1.z.string().min(1).max(255),
    fullyQualifiedName: zod_1.z.string(),
    description: zod_1.z.string().nullable(),
    type: zod_1.z.nativeEnum(SchemaType),
    format: zod_1.z.string(),
    schema: zod_1.z.union([zod_1.z.record(zod_1.z.any()), zod_1.z.string()]),
    version: zod_1.z.string(),
    compatibilityMode: zod_1.z.nativeEnum(CompatibilityMode),
    status: zod_1.z.nativeEnum(SchemaStatus),
    owner: zod_1.z.string(),
    createdBy: zod_1.z.string(),
    tags: zod_1.z.array(zod_1.z.string()),
    domain: zod_1.z.string().nullable(),
});
exports.SchemaRegistrationRequestSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255),
    namespace: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().nullable(),
    type: zod_1.z.nativeEnum(SchemaType),
    format: zod_1.z.string(),
    schema: zod_1.z.union([zod_1.z.record(zod_1.z.any()), zod_1.z.string()]),
    compatibilityMode: zod_1.z.nativeEnum(CompatibilityMode),
    owner: zod_1.z.string(),
    tags: zod_1.z.array(zod_1.z.string()),
    domain: zod_1.z.string().nullable(),
    properties: zod_1.z.record(zod_1.z.any()),
});
exports.SchemaEvolutionRequestSchema = zod_1.z.object({
    schemaId: zod_1.z.string().uuid(),
    newSchema: zod_1.z.union([zod_1.z.record(zod_1.z.any()), zod_1.z.string()]),
    versionType: zod_1.z.nativeEnum(VersionType),
    description: zod_1.z.string().nullable(),
    skipCompatibilityCheck: zod_1.z.boolean(),
});
exports.SchemaSearchRequestSchema = zod_1.z.object({
    query: zod_1.z.string(),
    namespace: zod_1.z.string().nullable(),
    type: zod_1.z.nativeEnum(SchemaType).nullable(),
    status: zod_1.z.nativeEnum(SchemaStatus).nullable(),
    tags: zod_1.z.array(zod_1.z.string()),
    domain: zod_1.z.string().nullable(),
    offset: zod_1.z.number().min(0),
    limit: zod_1.z.number().min(1).max(1000),
});
