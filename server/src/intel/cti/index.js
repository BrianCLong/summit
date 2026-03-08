"use strict";
/**
 * IntelGraph CTI Module
 *
 * STIX 2.1 Bundle Export and TAXII 2.1 Server Implementation
 *
 * @module intel/cti
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTaxiiService = exports.TaxiiService = exports.createSigningService = exports.calculatePackageIntegrity = exports.parseAirGapPackage = exports.serializeAirGapPackage = exports.generateSigningKey = exports.StixSigningService = exports.getReferencedIds = exports.filterBundleByType = exports.splitBundle = exports.mergeBundles = exports.validateBundle = exports.parseBundleFromJson = exports.serializeBundleWithEnvelope = exports.serializeBundleToJson = exports.verifyBundleSignature = exports.signBundle = exports.calculateBundleChecksum = exports.createBundle = exports.StixBundleFactory = exports.getTlpMarkingRef = exports.getTlpMarking = exports.buildIntelGraphExtension = exports.createProducerIdentity = exports.createSighting = exports.createRelationship = exports.mapEntityToStix = void 0;
// Types
__exportStar(require("./types.js"), exports);
// Entity Mapping
var entity_mapper_js_1 = require("./entity-mapper.js");
Object.defineProperty(exports, "mapEntityToStix", { enumerable: true, get: function () { return entity_mapper_js_1.mapEntityToStix; } });
Object.defineProperty(exports, "createRelationship", { enumerable: true, get: function () { return entity_mapper_js_1.createRelationship; } });
Object.defineProperty(exports, "createSighting", { enumerable: true, get: function () { return entity_mapper_js_1.createSighting; } });
Object.defineProperty(exports, "createProducerIdentity", { enumerable: true, get: function () { return entity_mapper_js_1.createProducerIdentity; } });
Object.defineProperty(exports, "buildIntelGraphExtension", { enumerable: true, get: function () { return entity_mapper_js_1.buildIntelGraphExtension; } });
Object.defineProperty(exports, "getTlpMarking", { enumerable: true, get: function () { return entity_mapper_js_1.getTlpMarking; } });
Object.defineProperty(exports, "getTlpMarkingRef", { enumerable: true, get: function () { return entity_mapper_js_1.getTlpMarkingRef; } });
// Bundle Serialization
var bundle_serializer_js_1 = require("./bundle-serializer.js");
Object.defineProperty(exports, "StixBundleFactory", { enumerable: true, get: function () { return bundle_serializer_js_1.StixBundleFactory; } });
Object.defineProperty(exports, "createBundle", { enumerable: true, get: function () { return bundle_serializer_js_1.createBundle; } });
Object.defineProperty(exports, "calculateBundleChecksum", { enumerable: true, get: function () { return bundle_serializer_js_1.calculateBundleChecksum; } });
Object.defineProperty(exports, "signBundle", { enumerable: true, get: function () { return bundle_serializer_js_1.signBundle; } });
Object.defineProperty(exports, "verifyBundleSignature", { enumerable: true, get: function () { return bundle_serializer_js_1.verifyBundleSignature; } });
Object.defineProperty(exports, "serializeBundleToJson", { enumerable: true, get: function () { return bundle_serializer_js_1.serializeBundleToJson; } });
Object.defineProperty(exports, "serializeBundleWithEnvelope", { enumerable: true, get: function () { return bundle_serializer_js_1.serializeBundleWithEnvelope; } });
Object.defineProperty(exports, "parseBundleFromJson", { enumerable: true, get: function () { return bundle_serializer_js_1.parseBundleFromJson; } });
Object.defineProperty(exports, "validateBundle", { enumerable: true, get: function () { return bundle_serializer_js_1.validateBundle; } });
Object.defineProperty(exports, "mergeBundles", { enumerable: true, get: function () { return bundle_serializer_js_1.mergeBundles; } });
Object.defineProperty(exports, "splitBundle", { enumerable: true, get: function () { return bundle_serializer_js_1.splitBundle; } });
Object.defineProperty(exports, "filterBundleByType", { enumerable: true, get: function () { return bundle_serializer_js_1.filterBundleByType; } });
Object.defineProperty(exports, "getReferencedIds", { enumerable: true, get: function () { return bundle_serializer_js_1.getReferencedIds; } });
// Signing Service
var signing_js_1 = require("./signing.js");
Object.defineProperty(exports, "StixSigningService", { enumerable: true, get: function () { return signing_js_1.StixSigningService; } });
Object.defineProperty(exports, "generateSigningKey", { enumerable: true, get: function () { return signing_js_1.generateSigningKey; } });
Object.defineProperty(exports, "serializeAirGapPackage", { enumerable: true, get: function () { return signing_js_1.serializeAirGapPackage; } });
Object.defineProperty(exports, "parseAirGapPackage", { enumerable: true, get: function () { return signing_js_1.parseAirGapPackage; } });
Object.defineProperty(exports, "calculatePackageIntegrity", { enumerable: true, get: function () { return signing_js_1.calculatePackageIntegrity; } });
Object.defineProperty(exports, "createSigningService", { enumerable: true, get: function () { return signing_js_1.createSigningService; } });
// TAXII Service
var taxii_service_js_1 = require("./taxii-service.js");
Object.defineProperty(exports, "TaxiiService", { enumerable: true, get: function () { return taxii_service_js_1.TaxiiService; } });
Object.defineProperty(exports, "createTaxiiService", { enumerable: true, get: function () { return taxii_service_js_1.createTaxiiService; } });
