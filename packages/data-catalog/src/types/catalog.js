"use strict";
/**
 * Core Data Catalog Types
 * Comprehensive type definitions for the data catalog platform
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchRequestSchema = exports.AssetMetadataSchema = exports.FilterOperator = exports.RelationshipType = exports.Permission = exports.DataClassification = exports.CertificationLevel = exports.AssetStatus = exports.AssetType = void 0;
const zod_1 = require("zod");
/**
 * Asset Types
 */
var AssetType;
(function (AssetType) {
    AssetType["DATABASE"] = "DATABASE";
    AssetType["TABLE"] = "TABLE";
    AssetType["VIEW"] = "VIEW";
    AssetType["COLUMN"] = "COLUMN";
    AssetType["DASHBOARD"] = "DASHBOARD";
    AssetType["REPORT"] = "REPORT";
    AssetType["API"] = "API";
    AssetType["FILE"] = "FILE";
    AssetType["STREAM"] = "STREAM";
    AssetType["MODEL"] = "MODEL";
    AssetType["NOTEBOOK"] = "NOTEBOOK";
    AssetType["QUERY"] = "QUERY";
    AssetType["PROCEDURE"] = "PROCEDURE";
    AssetType["FUNCTION"] = "FUNCTION";
})(AssetType || (exports.AssetType = AssetType = {}));
/**
 * Asset Status
 */
var AssetStatus;
(function (AssetStatus) {
    AssetStatus["ACTIVE"] = "ACTIVE";
    AssetStatus["DEPRECATED"] = "DEPRECATED";
    AssetStatus["ARCHIVED"] = "ARCHIVED";
    AssetStatus["DRAFT"] = "DRAFT";
    AssetStatus["PENDING_APPROVAL"] = "PENDING_APPROVAL";
})(AssetStatus || (exports.AssetStatus = AssetStatus = {}));
/**
 * Certification Level
 */
var CertificationLevel;
(function (CertificationLevel) {
    CertificationLevel["NONE"] = "NONE";
    CertificationLevel["BRONZE"] = "BRONZE";
    CertificationLevel["SILVER"] = "SILVER";
    CertificationLevel["GOLD"] = "GOLD";
    CertificationLevel["PLATINUM"] = "PLATINUM";
})(CertificationLevel || (exports.CertificationLevel = CertificationLevel = {}));
/**
 * Data Classification
 */
var DataClassification;
(function (DataClassification) {
    DataClassification["PUBLIC"] = "PUBLIC";
    DataClassification["INTERNAL"] = "INTERNAL";
    DataClassification["CONFIDENTIAL"] = "CONFIDENTIAL";
    DataClassification["RESTRICTED"] = "RESTRICTED";
    DataClassification["TOP_SECRET"] = "TOP_SECRET";
})(DataClassification || (exports.DataClassification = DataClassification = {}));
/**
 * Permissions
 */
var Permission;
(function (Permission) {
    Permission["VIEW"] = "VIEW";
    Permission["EDIT"] = "EDIT";
    Permission["DELETE"] = "DELETE";
    Permission["SHARE"] = "SHARE";
    Permission["CERTIFY"] = "CERTIFY";
    Permission["MANAGE_ACCESS"] = "MANAGE_ACCESS";
})(Permission || (exports.Permission = Permission = {}));
/**
 * Relationship Types
 */
var RelationshipType;
(function (RelationshipType) {
    RelationshipType["CONTAINS"] = "CONTAINS";
    RelationshipType["DEPENDS_ON"] = "DEPENDS_ON";
    RelationshipType["DERIVES_FROM"] = "DERIVES_FROM";
    RelationshipType["REFERENCES"] = "REFERENCES";
    RelationshipType["SIMILAR_TO"] = "SIMILAR_TO";
    RelationshipType["REPLACES"] = "REPLACES";
})(RelationshipType || (exports.RelationshipType = RelationshipType = {}));
/**
 * Filter Operators
 */
var FilterOperator;
(function (FilterOperator) {
    FilterOperator["EQUALS"] = "EQUALS";
    FilterOperator["NOT_EQUALS"] = "NOT_EQUALS";
    FilterOperator["CONTAINS"] = "CONTAINS";
    FilterOperator["STARTS_WITH"] = "STARTS_WITH";
    FilterOperator["ENDS_WITH"] = "ENDS_WITH";
    FilterOperator["IN"] = "IN";
    FilterOperator["NOT_IN"] = "NOT_IN";
    FilterOperator["GREATER_THAN"] = "GREATER_THAN";
    FilterOperator["LESS_THAN"] = "LESS_THAN";
    FilterOperator["BETWEEN"] = "BETWEEN";
})(FilterOperator || (exports.FilterOperator = FilterOperator = {}));
/**
 * Validation Schemas
 */
exports.AssetMetadataSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: zod_1.z.nativeEnum(AssetType),
    name: zod_1.z.string(),
    displayName: zod_1.z.string(),
    description: zod_1.z.string().nullable(),
    fullyQualifiedName: zod_1.z.string(),
    status: zod_1.z.nativeEnum(AssetStatus),
    classification: zod_1.z.nativeEnum(DataClassification),
    owner: zod_1.z.string(),
    stewards: zod_1.z.array(zod_1.z.string()),
    experts: zod_1.z.array(zod_1.z.string()),
    tags: zod_1.z.array(zod_1.z.string()),
    collections: zod_1.z.array(zod_1.z.string()),
    domain: zod_1.z.string().nullable(),
});
exports.SearchRequestSchema = zod_1.z.object({
    query: zod_1.z.string(),
    filters: zod_1.z.array(zod_1.z.object({
        field: zod_1.z.string(),
        operator: zod_1.z.nativeEnum(FilterOperator),
        value: zod_1.z.any(),
    })),
    facets: zod_1.z.array(zod_1.z.string()),
    sort: zod_1.z.array(zod_1.z.object({
        field: zod_1.z.string(),
        direction: zod_1.z.enum(['ASC', 'DESC']),
    })),
    offset: zod_1.z.number().min(0),
    limit: zod_1.z.number().min(1).max(1000),
});
