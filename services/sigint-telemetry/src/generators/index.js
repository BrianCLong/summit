"use strict";
/**
 * Synthetic Data Generators
 *
 * Generates realistic but entirely synthetic telemetry data for testing.
 * IMPORTANT: All data is fabricated - no real entities or data involved.
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
__exportStar(require("./utils.js"), exports);
__exportStar(require("./network.js"), exports);
__exportStar(require("./identity.js"), exports);
__exportStar(require("./endpoint.js"), exports);
__exportStar(require("./cloud.js"), exports);
__exportStar(require("./campaign.js"), exports);
