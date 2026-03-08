"use strict";
/**
 * Data Source and Dataset Types
 * Core types for data catalog registry
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LicenseSchema = exports.MappingSchema = exports.FieldSchema = exports.DatasetSchema = exports.DataSourceSchema = exports.LineageEntityType = exports.LicenseType = exports.ValidationType = exports.MappingStatus = exports.MappingTransformationType = exports.DatasetStatus = exports.ConnectionStatus = exports.DataSourceType = void 0;
const zod_1 = require("zod");
const catalog_js_1 = require("./catalog.js");
/**
 * Data Source Type
 * Represents the type of connector/source
 */
var DataSourceType;
(function (DataSourceType) {
    DataSourceType["DATABASE"] = "DATABASE";
    DataSourceType["API"] = "API";
    DataSourceType["FILE"] = "FILE";
    DataSourceType["STREAM"] = "STREAM";
    DataSourceType["S3"] = "S3";
    DataSourceType["SFTP"] = "SFTP";
    DataSourceType["WEBHOOK"] = "WEBHOOK";
    DataSourceType["MANUAL"] = "MANUAL";
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
    ConnectionStatus["PENDING"] = "PENDING";
})(ConnectionStatus || (exports.ConnectionStatus = ConnectionStatus = {}));
/**
 * Dataset Status
 */
var DatasetStatus;
(function (DatasetStatus) {
    DatasetStatus["ACTIVE"] = "ACTIVE";
    DatasetStatus["DEPRECATED"] = "DEPRECATED";
    DatasetStatus["ARCHIVED"] = "ARCHIVED";
    DatasetStatus["DRAFT"] = "DRAFT";
})(DatasetStatus || (exports.DatasetStatus = DatasetStatus = {}));
/**
 * Transformation Type
 */
var MappingTransformationType;
(function (MappingTransformationType) {
    MappingTransformationType["DIRECT"] = "DIRECT";
    MappingTransformationType["CAST"] = "CAST";
    MappingTransformationType["CONCATENATE"] = "CONCATENATE";
    MappingTransformationType["SPLIT"] = "SPLIT";
    MappingTransformationType["LOOKUP"] = "LOOKUP";
    MappingTransformationType["CALCULATION"] = "CALCULATION";
    MappingTransformationType["CUSTOM"] = "CUSTOM";
})(MappingTransformationType || (exports.MappingTransformationType = MappingTransformationType = {}));
/**
 * Mapping Status
 */
var MappingStatus;
(function (MappingStatus) {
    MappingStatus["ACTIVE"] = "ACTIVE";
    MappingStatus["DRAFT"] = "DRAFT";
    MappingStatus["DEPRECATED"] = "DEPRECATED";
    MappingStatus["ARCHIVED"] = "ARCHIVED";
})(MappingStatus || (exports.MappingStatus = MappingStatus = {}));
/**
 * Validation Type
 */
var ValidationType;
(function (ValidationType) {
    ValidationType["NOT_NULL"] = "NOT_NULL";
    ValidationType["RANGE"] = "RANGE";
    ValidationType["REGEX"] = "REGEX";
    ValidationType["ENUM"] = "ENUM";
    ValidationType["CUSTOM"] = "CUSTOM";
})(ValidationType || (exports.ValidationType = ValidationType = {}));
/**
 * License Type
 */
var LicenseType;
(function (LicenseType) {
    LicenseType["PUBLIC_DOMAIN"] = "PUBLIC_DOMAIN";
    LicenseType["OPEN_DATA"] = "OPEN_DATA";
    LicenseType["CREATIVE_COMMONS"] = "CREATIVE_COMMONS";
    LicenseType["PROPRIETARY"] = "PROPRIETARY";
    LicenseType["RESTRICTED"] = "RESTRICTED";
    LicenseType["CLASSIFIED"] = "CLASSIFIED";
    LicenseType["CUSTOM"] = "CUSTOM";
})(LicenseType || (exports.LicenseType = LicenseType = {}));
/**
 * Lineage Entity Type
 */
var LineageEntityType;
(function (LineageEntityType) {
    LineageEntityType["DATA_SOURCE"] = "DATA_SOURCE";
    LineageEntityType["DATASET"] = "DATASET";
    LineageEntityType["FIELD"] = "FIELD";
    LineageEntityType["MAPPING"] = "MAPPING";
    LineageEntityType["CANONICAL_ENTITY"] = "CANONICAL_ENTITY";
    LineageEntityType["CASE"] = "CASE";
    LineageEntityType["REPORT"] = "REPORT";
})(LineageEntityType || (exports.LineageEntityType = LineageEntityType = {}));
/**
 * Validation Schemas using Zod
 */
exports.DataSourceSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1).max(255),
    displayName: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().nullable(),
    type: zod_1.z.nativeEnum(DataSourceType),
    connectionConfig: zod_1.z.record(zod_1.z.any()),
    connectionStatus: zod_1.z.nativeEnum(ConnectionStatus),
    owner: zod_1.z.string(),
    stewards: zod_1.z.array(zod_1.z.string()),
    tags: zod_1.z.array(zod_1.z.string()),
    domain: zod_1.z.string().nullable(),
});
exports.DatasetSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    sourceId: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1).max(255),
    displayName: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().nullable(),
    fullyQualifiedName: zod_1.z.string(),
    status: zod_1.z.nativeEnum(DatasetStatus),
    classification: zod_1.z.nativeEnum(catalog_js_1.DataClassification),
    owner: zod_1.z.string(),
    stewards: zod_1.z.array(zod_1.z.string()),
    tags: zod_1.z.array(zod_1.z.string()),
    domain: zod_1.z.string().nullable(),
});
exports.FieldSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    datasetId: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1).max(255),
    displayName: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().nullable(),
    dataType: zod_1.z.string(),
    nativeDataType: zod_1.z.string(),
    nullable: zod_1.z.boolean(),
    isPrimaryKey: zod_1.z.boolean(),
    isForeignKey: zod_1.z.boolean(),
    classification: zod_1.z.nativeEnum(catalog_js_1.DataClassification),
    tags: zod_1.z.array(zod_1.z.string()),
    policyTags: zod_1.z.array(zod_1.z.string()),
});
exports.MappingSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().nullable(),
    sourceDatasetId: zod_1.z.string().uuid(),
    sourceFieldId: zod_1.z.string().uuid(),
    canonicalSchemaId: zod_1.z.string().uuid(),
    canonicalFieldId: zod_1.z.string().uuid(),
    transformationType: zod_1.z.nativeEnum(MappingTransformationType),
    transformationLogic: zod_1.z.string().nullable(),
    status: zod_1.z.nativeEnum(MappingStatus),
    version: zod_1.z.string(),
    createdBy: zod_1.z.string(),
});
exports.LicenseSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1).max(255),
    displayName: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().nullable(),
    licenseType: zod_1.z.nativeEnum(LicenseType),
    licenseUrl: zod_1.z.string().url().nullable(),
    allowedUseCases: zod_1.z.array(zod_1.z.string()),
    restrictions: zod_1.z.array(zod_1.z.string()),
    requiresAttribution: zod_1.z.boolean(),
    allowsCommercialUse: zod_1.z.boolean(),
    allowsDerivativeWorks: zod_1.z.boolean(),
    allowsRedistribution: zod_1.z.boolean(),
});
