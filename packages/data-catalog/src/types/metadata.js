"use strict";
/**
 * Data Catalog Metadata Types
 * Enhanced types for data sources, datasets, fields, mappings, and licenses
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LicenseSchema = exports.MappingSchema = exports.FieldSchema = exports.DatasetSchema = exports.DataSourceSchema = exports.ConnectorStatus = exports.SchemaVersionStatus = exports.SchemaFormat = exports.LicenseStatus = exports.LicenseType = exports.MappingStatus = exports.FieldTransformationType = exports.SensitivityLevel = exports.DatasetType = exports.ConnectionStatus = exports.DataSourceType = void 0;
const zod_1 = require("zod");
/**
 * Data Source Types
 */
var DataSourceType;
(function (DataSourceType) {
    DataSourceType["DATABASE"] = "DATABASE";
    DataSourceType["API"] = "API";
    DataSourceType["FILE"] = "FILE";
    DataSourceType["STREAM"] = "STREAM";
    DataSourceType["SAAS"] = "SAAS";
    DataSourceType["CLOUD_STORAGE"] = "CLOUD_STORAGE";
    DataSourceType["MESSAGE_QUEUE"] = "MESSAGE_QUEUE";
    DataSourceType["OTHER"] = "OTHER";
})(DataSourceType || (exports.DataSourceType = DataSourceType = {}));
/**
 * Connection Status
 */
var ConnectionStatus;
(function (ConnectionStatus) {
    ConnectionStatus["ACTIVE"] = "ACTIVE";
    ConnectionStatus["INACTIVE"] = "INACTIVE";
    ConnectionStatus["ERROR"] = "ERROR";
    ConnectionStatus["TESTING"] = "TESTING";
    ConnectionStatus["CONFIGURED"] = "CONFIGURED";
})(ConnectionStatus || (exports.ConnectionStatus = ConnectionStatus = {}));
/**
 * Dataset Type
 */
var DatasetType;
(function (DatasetType) {
    DatasetType["TABLE"] = "TABLE";
    DatasetType["VIEW"] = "VIEW";
    DatasetType["FILE"] = "FILE";
    DatasetType["TOPIC"] = "TOPIC";
    DatasetType["COLLECTION"] = "COLLECTION";
    DatasetType["API_ENDPOINT"] = "API_ENDPOINT";
    DatasetType["OTHER"] = "OTHER";
})(DatasetType || (exports.DatasetType = DatasetType = {}));
/**
 * Sensitivity Level
 */
var SensitivityLevel;
(function (SensitivityLevel) {
    SensitivityLevel["PUBLIC"] = "PUBLIC";
    SensitivityLevel["INTERNAL"] = "INTERNAL";
    SensitivityLevel["CONFIDENTIAL"] = "CONFIDENTIAL";
    SensitivityLevel["RESTRICTED"] = "RESTRICTED";
    SensitivityLevel["HIGHLY_RESTRICTED"] = "HIGHLY_RESTRICTED";
})(SensitivityLevel || (exports.SensitivityLevel = SensitivityLevel = {}));
/**
 * Transformation Type
 */
var FieldTransformationType;
(function (FieldTransformationType) {
    FieldTransformationType["DIRECT"] = "DIRECT";
    FieldTransformationType["CAST"] = "CAST";
    FieldTransformationType["CONCAT"] = "CONCAT";
    FieldTransformationType["SPLIT"] = "SPLIT";
    FieldTransformationType["LOOKUP"] = "LOOKUP";
    FieldTransformationType["FUNCTION"] = "FUNCTION";
    FieldTransformationType["CONSTANT"] = "CONSTANT";
    FieldTransformationType["DERIVED"] = "DERIVED";
})(FieldTransformationType || (exports.FieldTransformationType = FieldTransformationType = {}));
/**
 * Mapping Status
 */
var MappingStatus;
(function (MappingStatus) {
    MappingStatus["DRAFT"] = "DRAFT";
    MappingStatus["ACTIVE"] = "ACTIVE";
    MappingStatus["DEPRECATED"] = "DEPRECATED";
    MappingStatus["ARCHIVED"] = "ARCHIVED";
})(MappingStatus || (exports.MappingStatus = MappingStatus = {}));
/**
 * License Type
 */
var LicenseType;
(function (LicenseType) {
    LicenseType["PROPRIETARY"] = "PROPRIETARY";
    LicenseType["OPEN_DATA"] = "OPEN_DATA";
    LicenseType["COMMERCIAL"] = "COMMERCIAL";
    LicenseType["ACADEMIC"] = "ACADEMIC";
    LicenseType["GOVERNMENT"] = "GOVERNMENT";
    LicenseType["CREATIVE_COMMONS"] = "CREATIVE_COMMONS";
    LicenseType["CUSTOM"] = "CUSTOM";
})(LicenseType || (exports.LicenseType = LicenseType = {}));
/**
 * License Status
 */
var LicenseStatus;
(function (LicenseStatus) {
    LicenseStatus["ACTIVE"] = "ACTIVE";
    LicenseStatus["EXPIRED"] = "EXPIRED";
    LicenseStatus["SUSPENDED"] = "SUSPENDED";
    LicenseStatus["REVOKED"] = "REVOKED";
})(LicenseStatus || (exports.LicenseStatus = LicenseStatus = {}));
/**
 * Schema Format
 */
var SchemaFormat;
(function (SchemaFormat) {
    SchemaFormat["JSON_SCHEMA"] = "JSON_SCHEMA";
    SchemaFormat["AVRO"] = "AVRO";
    SchemaFormat["PROTOBUF"] = "PROTOBUF";
    SchemaFormat["PARQUET"] = "PARQUET";
    SchemaFormat["SQL_DDL"] = "SQL_DDL";
    SchemaFormat["OPENAPI"] = "OPENAPI";
    SchemaFormat["GRAPHQL"] = "GRAPHQL";
    SchemaFormat["CUSTOM"] = "CUSTOM";
})(SchemaFormat || (exports.SchemaFormat = SchemaFormat = {}));
/**
 * Schema Version Status
 */
var SchemaVersionStatus;
(function (SchemaVersionStatus) {
    SchemaVersionStatus["DRAFT"] = "DRAFT";
    SchemaVersionStatus["ACTIVE"] = "ACTIVE";
    SchemaVersionStatus["DEPRECATED"] = "DEPRECATED";
    SchemaVersionStatus["ARCHIVED"] = "ARCHIVED";
})(SchemaVersionStatus || (exports.SchemaVersionStatus = SchemaVersionStatus = {}));
/**
 * Connector Status
 */
var ConnectorStatus;
(function (ConnectorStatus) {
    ConnectorStatus["AVAILABLE"] = "AVAILABLE";
    ConnectorStatus["DEPRECATED"] = "DEPRECATED";
    ConnectorStatus["EXPERIMENTAL"] = "EXPERIMENTAL";
    ConnectorStatus["UNAVAILABLE"] = "UNAVAILABLE";
})(ConnectorStatus || (exports.ConnectorStatus = ConnectorStatus = {}));
/**
 * Validation Schemas using Zod
 */
exports.DataSourceSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string().min(1).max(255),
    displayName: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().nullable(),
    type: zod_1.z.nativeEnum(DataSourceType),
    connectorId: zod_1.z.string(),
    connectorVersion: zod_1.z.string(),
    connectionStatus: zod_1.z.nativeEnum(ConnectionStatus),
    owner: zod_1.z.string(),
    team: zod_1.z.string().nullable(),
    tags: zod_1.z.array(zod_1.z.string()),
});
exports.DatasetSchema = zod_1.z.object({
    id: zod_1.z.string(),
    sourceId: zod_1.z.string(),
    name: zod_1.z.string().min(1).max(500),
    displayName: zod_1.z.string().min(1).max(500),
    description: zod_1.z.string().nullable(),
    fullyQualifiedName: zod_1.z.string(),
    datasetType: zod_1.z.nativeEnum(DatasetType),
    owner: zod_1.z.string(),
    stewards: zod_1.z.array(zod_1.z.string()),
    policyTags: zod_1.z.array(zod_1.z.string()),
    tags: zod_1.z.array(zod_1.z.string()),
});
exports.FieldSchema = zod_1.z.object({
    id: zod_1.z.string(),
    datasetId: zod_1.z.string(),
    name: zod_1.z.string().min(1).max(255),
    displayName: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().nullable(),
    dataType: zod_1.z.string(),
    nullable: zod_1.z.boolean(),
    isPrimaryKey: zod_1.z.boolean(),
    isForeignKey: zod_1.z.boolean(),
    sensitivityLevel: zod_1.z.nativeEnum(SensitivityLevel),
    policyTags: zod_1.z.array(zod_1.z.string()),
});
exports.MappingSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().nullable(),
    sourceId: zod_1.z.string(),
    sourceSchemaId: zod_1.z.string(),
    sourceSchemaVersion: zod_1.z.number().int().positive(),
    canonicalSchemaId: zod_1.z.string(),
    canonicalSchemaVersion: zod_1.z.number().int().positive(),
    canonicalEntityType: zod_1.z.string(),
    status: zod_1.z.nativeEnum(MappingStatus),
    version: zod_1.z.number().int().positive(),
});
exports.LicenseSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string().min(1).max(255),
    displayName: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().nullable(),
    licenseType: zod_1.z.nativeEnum(LicenseType),
    termsAndConditions: zod_1.z.string(),
    requiresAttribution: zod_1.z.boolean(),
    status: zod_1.z.nativeEnum(LicenseStatus),
    licensor: zod_1.z.string(),
});
