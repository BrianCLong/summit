"use strict";
// Data Lifecycle Management Module
// Implements strict data lifecycle guarantees with legal hold support
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
exports.LifecycleEvidence = exports.DeletionService = exports.LegalHoldManager = exports.RetentionManager = void 0;
__exportStar(require("./types.js"), exports);
__exportStar(require("./policy.js"), exports);
var retention_manager_js_1 = require("./retention-manager.js");
Object.defineProperty(exports, "RetentionManager", { enumerable: true, get: function () { return retention_manager_js_1.RetentionManager; } });
var legal_hold_js_1 = require("./legal-hold.js");
Object.defineProperty(exports, "LegalHoldManager", { enumerable: true, get: function () { return legal_hold_js_1.LegalHoldManager; } });
var deletion_service_js_1 = require("./deletion-service.js");
Object.defineProperty(exports, "DeletionService", { enumerable: true, get: function () { return deletion_service_js_1.DeletionService; } });
var evidence_js_1 = require("./evidence.js");
Object.defineProperty(exports, "LifecycleEvidence", { enumerable: true, get: function () { return evidence_js_1.LifecycleEvidence; } });
