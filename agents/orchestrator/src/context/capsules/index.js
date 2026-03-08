"use strict";
/**
 * Invariant-Carrying Context Capsules (IC³) Module
 *
 * Implements ADR-010: Embedding machine-verifiable invariants directly
 * into model context, making rule violations structurally impossible.
 *
 * @module context/capsules
 * @see docs/adr/ADR-010_invariant_carrying_context_capsules.md
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
exports.DEFAULT_TRUST_TIERS = exports.createAgent = exports.outputSchemaInvariant = exports.dataRetentionInvariant = exports.noExternalCallsInvariant = exports.requireClearanceInvariant = exports.forbidTopicsInvariant = void 0;
__exportStar(require("./types.js"), exports);
__exportStar(require("./ContextCapsule.js"), exports);
__exportStar(require("./InvariantValidator.js"), exports);
__exportStar(require("./CapsulePolicy.js"), exports);
var ContextCapsule_js_1 = require("./ContextCapsule.js");
Object.defineProperty(exports, "forbidTopicsInvariant", { enumerable: true, get: function () { return ContextCapsule_js_1.forbidTopicsInvariant; } });
Object.defineProperty(exports, "requireClearanceInvariant", { enumerable: true, get: function () { return ContextCapsule_js_1.requireClearanceInvariant; } });
Object.defineProperty(exports, "noExternalCallsInvariant", { enumerable: true, get: function () { return ContextCapsule_js_1.noExternalCallsInvariant; } });
Object.defineProperty(exports, "dataRetentionInvariant", { enumerable: true, get: function () { return ContextCapsule_js_1.dataRetentionInvariant; } });
Object.defineProperty(exports, "outputSchemaInvariant", { enumerable: true, get: function () { return ContextCapsule_js_1.outputSchemaInvariant; } });
var CapsulePolicy_js_1 = require("./CapsulePolicy.js");
Object.defineProperty(exports, "createAgent", { enumerable: true, get: function () { return CapsulePolicy_js_1.createAgent; } });
Object.defineProperty(exports, "DEFAULT_TRUST_TIERS", { enumerable: true, get: function () { return CapsulePolicy_js_1.DEFAULT_TRUST_TIERS; } });
