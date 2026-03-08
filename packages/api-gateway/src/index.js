"use strict";
/**
 * API Gateway - Core Module
 *
 * Enterprise-grade API Gateway for intelligence operations with:
 * - Intelligent request routing
 * - Load balancing strategies
 * - Circuit breaker patterns
 * - Protocol support (HTTP/HTTPS, WebSocket, gRPC)
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
__exportStar(require("./routing/router.js"), exports);
__exportStar(require("./routing/load-balancer.js"), exports);
__exportStar(require("./routing/circuit-breaker.js"), exports);
__exportStar(require("./middleware/protocol-handler.js"), exports);
__exportStar(require("./middleware/retry-policy.js"), exports);
__exportStar(require("./middleware/timeout-policy.js"), exports);
__exportStar(require("./plugins/versioning.js"), exports);
__exportStar(require("./utils/logger.js"), exports);
__exportStar(require("./gateway.js"), exports);
