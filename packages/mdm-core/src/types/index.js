"use strict";
// @ts-nocheck
/**
 * Core MDM Types and Interfaces
 * Master Data Management type definitions for Summit platform
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
__exportStar(require("./master-record.js"), exports);
__exportStar(require("./domain.js"), exports);
__exportStar(require("./matching.js"), exports);
__exportStar(require("./quality.js"), exports);
__exportStar(require("./stewardship.js"), exports);
__exportStar(require("./hierarchy.js"), exports);
__exportStar(require("./sync.js"), exports);
__exportStar(require("./compliance.js"), exports);
