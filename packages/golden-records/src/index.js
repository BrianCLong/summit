"use strict";
/**
 * Summit Golden Records Package
 * Golden record management with entity resolution and lineage tracking
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
__exportStar(require("./manager/golden-record-manager.js"), exports);
__exportStar(require("./resolver/entity-resolver.js"), exports);
__exportStar(require("./lineage/lineage-tracker.js"), exports);
__exportStar(require("./compliance/audit-ledger.js"), exports);
__exportStar(require("./compliance/record-definition-registry.js"), exports);
__exportStar(require("./compliance/legal-hold-service.js"), exports);
__exportStar(require("./compliance/retention-engine.js"), exports);
__exportStar(require("./compliance/versioning-service.js"), exports);
__exportStar(require("./compliance/record-search-engine.js"), exports);
__exportStar(require("./compliance/export-pack-builder.js"), exports);
__exportStar(require("./compliance/record-compliance-primitive.js"), exports);
__exportStar(require("./compliance/role-templates.js"), exports);
