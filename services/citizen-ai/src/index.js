"use strict";
/**
 * Citizen AI Service
 *
 * Multi-lingual AI services for Estonian public services,
 * enabling seamless access for citizens, immigrants, and international partners.
 *
 * Features:
 * - Real-time translation (40+ languages)
 * - Natural Language Understanding (NLU)
 * - Conversational AI for public services
 * - Multi-lingual intent classification
 * - Entity extraction (Estonian ID, phone, email, etc.)
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
exports.startServer = exports.createApp = exports.router = void 0;
// Core services
__exportStar(require("./conversational-ai"), exports);
__exportStar(require("./nlu-service"), exports);
// API
var api_1 = require("./api");
Object.defineProperty(exports, "router", { enumerable: true, get: function () { return api_1.router; } });
Object.defineProperty(exports, "createApp", { enumerable: true, get: function () { return api_1.createApp; } });
Object.defineProperty(exports, "startServer", { enumerable: true, get: function () { return api_1.startServer; } });
// Infrastructure
__exportStar(require("./cache"), exports);
__exportStar(require("./metrics"), exports);
