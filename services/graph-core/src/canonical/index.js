"use strict";
/**
 * Canonical Model Module
 *
 * Exports all canonical types, validation schemas, and store.
 *
 * @module graph-core/canonical
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
exports.graphStore = exports.GraphStore = void 0;
// Types and enums
__exportStar(require("./types.js"), exports);
// Validation schemas
__exportStar(require("./validation.js"), exports);
// Graph store
var store_js_1 = require("./store.js");
Object.defineProperty(exports, "GraphStore", { enumerable: true, get: function () { return store_js_1.GraphStore; } });
Object.defineProperty(exports, "graphStore", { enumerable: true, get: function () { return store_js_1.graphStore; } });
