"use strict";
/**
 * Decentralized Identity Package
 *
 * Provides DID (Decentralized Identifier) management, verifiable credentials,
 * and zero-knowledge proof support for the data ecosystem.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZKProofService = exports.CredentialVerifier = exports.CredentialIssuer = exports.DIDManager = void 0;
var did_manager_js_1 = require("./did-manager.js");
Object.defineProperty(exports, "DIDManager", { enumerable: true, get: function () { return did_manager_js_1.DIDManager; } });
var credential_issuer_js_1 = require("./credential-issuer.js");
Object.defineProperty(exports, "CredentialIssuer", { enumerable: true, get: function () { return credential_issuer_js_1.CredentialIssuer; } });
var credential_verifier_js_1 = require("./credential-verifier.js");
Object.defineProperty(exports, "CredentialVerifier", { enumerable: true, get: function () { return credential_verifier_js_1.CredentialVerifier; } });
var zk_proof_service_js_1 = require("./zk-proof-service.js");
Object.defineProperty(exports, "ZKProofService", { enumerable: true, get: function () { return zk_proof_service_js_1.ZKProofService; } });
