"use strict";
/**
 * Proof-Carrying Publishing
 *
 * End-to-end proof-carrying publishing system for IntelGraph.
 *
 * Features:
 * - Verifiable manifests with hash trees, model cards, and citations
 * - Audience-scoped evidence wallets
 * - Cryptographic signatures and offline verification
 * - Revocation registry with propagation
 * - Citation validation and publishing gates
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
exports.integrateWithExport = exports.createPublisherFromEnv = exports.ProofCarryingPublisher = exports.verifyWalletFile = exports.quickVerify = exports.BundleVerifier = exports.StandardLicenses = exports.PublishingPipeline = exports.CitationValidator = exports.PersistentRevocationRegistry = exports.DistributedRevocationChecker = exports.RevocationRegistry = exports.AudienceScopes = exports.DisclosurePackager = exports.mergeModelCards = exports.calculateQualityMetrics = exports.createModelCardFromExport = exports.ModelCardGenerator = exports.createHashTreeBuilder = exports.HashTreeBuilder = void 0;
// Types
__exportStar(require("./proof-carrying-types.js"), exports);
// Core components
var hash_tree_builder_js_1 = require("./hash-tree-builder.js");
Object.defineProperty(exports, "HashTreeBuilder", { enumerable: true, get: function () { return hash_tree_builder_js_1.HashTreeBuilder; } });
Object.defineProperty(exports, "createHashTreeBuilder", { enumerable: true, get: function () { return hash_tree_builder_js_1.createHashTreeBuilder; } });
var model_card_generator_js_1 = require("./model-card-generator.js");
Object.defineProperty(exports, "ModelCardGenerator", { enumerable: true, get: function () { return model_card_generator_js_1.ModelCardGenerator; } });
Object.defineProperty(exports, "createModelCardFromExport", { enumerable: true, get: function () { return model_card_generator_js_1.createModelCardFromExport; } });
Object.defineProperty(exports, "calculateQualityMetrics", { enumerable: true, get: function () { return model_card_generator_js_1.calculateQualityMetrics; } });
Object.defineProperty(exports, "mergeModelCards", { enumerable: true, get: function () { return model_card_generator_js_1.mergeModelCards; } });
var disclosure_packager_js_1 = require("./disclosure-packager.js");
Object.defineProperty(exports, "DisclosurePackager", { enumerable: true, get: function () { return disclosure_packager_js_1.DisclosurePackager; } });
Object.defineProperty(exports, "AudienceScopes", { enumerable: true, get: function () { return disclosure_packager_js_1.AudienceScopes; } });
var revocation_registry_js_1 = require("./revocation-registry.js");
Object.defineProperty(exports, "RevocationRegistry", { enumerable: true, get: function () { return revocation_registry_js_1.RevocationRegistry; } });
Object.defineProperty(exports, "DistributedRevocationChecker", { enumerable: true, get: function () { return revocation_registry_js_1.DistributedRevocationChecker; } });
Object.defineProperty(exports, "PersistentRevocationRegistry", { enumerable: true, get: function () { return revocation_registry_js_1.PersistentRevocationRegistry; } });
var citation_validator_js_1 = require("./citation-validator.js");
Object.defineProperty(exports, "CitationValidator", { enumerable: true, get: function () { return citation_validator_js_1.CitationValidator; } });
Object.defineProperty(exports, "PublishingPipeline", { enumerable: true, get: function () { return citation_validator_js_1.PublishingPipeline; } });
Object.defineProperty(exports, "StandardLicenses", { enumerable: true, get: function () { return citation_validator_js_1.StandardLicenses; } });
var bundle_verifier_js_1 = require("./bundle-verifier.js");
Object.defineProperty(exports, "BundleVerifier", { enumerable: true, get: function () { return bundle_verifier_js_1.BundleVerifier; } });
Object.defineProperty(exports, "quickVerify", { enumerable: true, get: function () { return bundle_verifier_js_1.quickVerify; } });
Object.defineProperty(exports, "verifyWalletFile", { enumerable: true, get: function () { return bundle_verifier_js_1.verifyWalletFile; } });
var proof_carrying_publisher_js_1 = require("./proof-carrying-publisher.js");
Object.defineProperty(exports, "ProofCarryingPublisher", { enumerable: true, get: function () { return proof_carrying_publisher_js_1.ProofCarryingPublisher; } });
Object.defineProperty(exports, "createPublisherFromEnv", { enumerable: true, get: function () { return proof_carrying_publisher_js_1.createPublisherFromEnv; } });
Object.defineProperty(exports, "integrateWithExport", { enumerable: true, get: function () { return proof_carrying_publisher_js_1.integrateWithExport; } });
